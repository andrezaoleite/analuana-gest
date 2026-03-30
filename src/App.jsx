import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ── SUPABASE ──────────────────────────────────────────────
const supabase = createClient(
  "https://xwbxbwpntgswnqmrgtqt.supabase.co",
  "sb_publishable_QljjY31AgK_fWj88feXa8w__y6OTKxP"
);

// snake_case ↔ camelCase
const toCamel = o => {
  if (!o || typeof o !== "object" || Array.isArray(o)) return o;
  return Object.fromEntries(Object.entries(o).map(([k,v])=>[
    k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()), v
  ]));
};
const toSnake = o => {
  if (!o || typeof o !== "object") return o;
  return Object.fromEntries(Object.entries(o).map(([k,v])=>[
    k.replace(/[A-Z]/g, c => "_" + c.toLowerCase()), v
  ]));
};

// ── CONSTANTES ────────────────────────────────────────────
const COLORS = ["#2d6a4f","#52b788","#d4a017","#e76f51","#457b9d","#a8dadc","#f4a261","#264653"];
const NIVEIS = ["Administrador","Gerente","Financeiro","Operacional"];
const CAPINS = ["Brachiaria brizantha","Brachiaria decumbens","Brachiaria ruziziensis","Panicum maximum (Mombaça)","Panicum maximum (Tanzania)","Panicum maximum (Massai)","Cynodon (Tifton 85)","Andropogon gayanus","Pennisetum purpureum (Napier)","Piatã","Xaraés","Marandu","Nativo/Misto"];
const STATUS_PASTO = ["Em uso","Descanso","Em reforma","Vedado","Reserva"];
const TIPO_PASTO   = ["Leiteiro","Corte","Misto","Reserva"];
const TIPO_FINANC  = ["Custeio","Investimento","PRONAF","FCO","Outros"];
const SISTEMA_AMORT= ["SAC","PRICE"];
const CATEGORIAS_DESPESA = {
  "Folha de Pagamento":["Salários","13º Salário","Férias","Rescisão"],
  "Encargos":["INSS Patronal","FGTS","RAT/SAT","SENAR"],
  "Insumos Agrícolas":["Fertilizantes","Defensivos","Sementes","Calcário"],
  "🐂 Gado de Corte":["Ração/Suplemento","Medicamentos/Vet.","Confinamento","Compra de Animais","Outros Corte"],
  "🥛 Gado Leiteiro":["Ração Vacas","Medicamentos Leiteiro","Higiene/Ordenha","Outros Leiteiro"],
  "Combustível":["Diesel","Gasolina","Lubrificantes"],
  "Manutenção":["Equipamentos","Benfeitorias","Veículos"],
  "Tributos":["ITR","Funrural","INSS Produtor","SENAR Rural","Contribuição Sindical"],
  "Energia":["Energia Elétrica"],
  "Financiamentos":["Amortização","Juros","Tarifas"],
  "Outros":["Outros"],
};
const VENDAS_GADO_HIST=[
  {mes:"Out",cabecas:4,arrobas:240,valorArroba:310,total:74400},
  {mes:"Nov",cabecas:3,arrobas:178,valorArroba:315,total:56070},
  {mes:"Dez",cabecas:6,arrobas:372,valorArroba:320,total:119040},
  {mes:"Jan",cabecas:5,arrobas:305,valorArroba:318,total:96990},
  {mes:"Fev",cabecas:4,arrobas:244,valorArroba:322,total:78568},
  {mes:"Mar",cabecas:7,arrobas:434,valorArroba:325,total:141050},
];

// ── HELPERS ───────────────────────────────────────────────
const fmt   = n => `R$ ${Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtN  = n => Number(n||0).toLocaleString("pt-BR");
const hoje  = () => new Date().toISOString().slice(0,10);
const uid   = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
function fmtData(d){ if(!d) return "—"; try{ return new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"numeric"}); }catch{ return d; } }
function addMeses(dtStr,n){ if(!dtStr) return "—"; const d=new Date(dtStr+"T12:00:00"); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,7); }
function calcINSSEmpregado(s){ const f=[[1518,0.075],[2793.88,0.09],[4190.83,0.12],[8157.41,0.14]]; let r=0,a=0; for(const [t,q] of f){ if(s<=a) break; r+=(Math.min(s,t)-a)*q; a=t; if(s<=t) break; } return r; }
const calcSalFamilia=(sal,filhos)=>sal<=1906.04?65*filhos:0;
const temAcesso=(perfil,modulo)=>{
  const mapa={
    Administrador:["dashboard","financeiro","producao","manejo","lancamentos","pastagens","financiamentos","usuarios","configuracoes","perfil"],
    Gerente:      ["dashboard","producao","manejo","lancamentos","pastagens","perfil"],
    Financeiro:   ["dashboard","financeiro","lancamentos","financiamentos","perfil"],
    Operacional:  ["producao","manejo","lancamentos","perfil"],
  };
  return (mapa[perfil]||[]).includes(modulo);
};
function calcTabelaSAC(f){
  const tm=(f.taxa||0)/100/12, pa=Math.max(1,(f.prazo||1)-(f.carencia||0)), am=(f.valor||0)/pa;
  const tab=[];let s=f.valor||0;
  for(let i=1;i<=(f.prazo||1);i++){
    const j=s*tm,ic=i<=(f.carencia||0),a=ic?0:am,p=ic?j:a+j;
    tab.push({parcela:i,tipo:ic?"Carência":"Normal",saldo:Math.max(0,s),amortizacao:a,juros:j,prestacao:p,vencimento:addMeses(f.dtContratacao,i),status:"Pendente"});
    s=Math.max(0,s-a);
  }
  return tab;
}
function calcTabelaPRICE(f){
  const tm=(f.taxa||0)/100/12, n=Math.max(1,(f.prazo||1)-(f.carencia||0));
  const pmt=tm>0?(f.valor||0)*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1):(f.valor||0)/n;
  const tab=[];let s=f.valor||0;
  for(let i=1;i<=(f.prazo||1);i++){
    const j=s*tm,ic=i<=(f.carencia||0),a=ic?0:Math.max(0,pmt-j),p=ic?j:pmt;
    tab.push({parcela:i,tipo:ic?"Carência":"Normal",saldo:Math.max(0,s),amortizacao:a,juros:j,prestacao:p,vencimento:addMeses(f.dtContratacao,i),status:"Pendente"});
    s=Math.max(0,s-a);
  }
  return tab;
}

function useResponsive(){
  const [mob,setMob]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  useEffect(()=>{
    const h=()=>setMob(window.innerWidth<768);
    window.addEventListener("resize",h);
    return ()=>window.removeEventListener("resize",h);
  },[]);
  return mob;
}

// ── COMPONENTES BASE ──────────────────────────────────────
function Modal({title,children,onClose,largura=500}){
  const mob=useResponsive();
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:mob?8:16}}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:mob?window.innerWidth-16:largura,maxHeight:"95vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #e5e7eb"}}>
          <span style={{fontSize:15,fontWeight:700,color:"#1b4332"}}>{title}</span>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9ca3af"}}>✕</button>
        </div>
        <div style={{padding:20}}>{children}</div>
      </div>
    </div>
  );
}
function Confirm({msg,onSim,onNao,danger=false}){
  return(
    <Modal title={danger?"⚠️ Confirmar exclusão":"Confirmar ação"} onClose={onNao} largura={400}>
      <p style={{fontSize:14,color:"#374151",marginBottom:20}}>{msg}</p>
      <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
        <BotaoSec onClick={onNao}>Cancelar</BotaoSec>
        <button onClick={onSim} style={{padding:"9px 20px",background:danger?"#dc2626":"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>{danger?"Sim, excluir":"Confirmar"}</button>
      </div>
    </Modal>
  );
}
const BotaoP=({children,onClick,cor="#1b4332",type="button",disabled=false})=>(
  <button type={type} onClick={onClick} disabled={disabled} style={{padding:"9px 18px",background:disabled?"#9ca3af":cor,color:"white",border:"none",borderRadius:8,cursor:disabled?"not-allowed":"pointer",fontWeight:600,fontSize:13,opacity:disabled?0.7:1}}>{children}</button>
);
const BotaoSec=({children,onClick})=>(<button onClick={onClick} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>{children}</button>);
const BotaoDel=({children,onClick})=>(<button onClick={onClick} style={{padding:"7px 14px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>{children}</button>);
const BotaoEdit=({onClick})=>(<button onClick={onClick} style={{padding:"7px 12px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✏️ Editar</button>);
function Campo({label,value,onChange,type="text",required=false,options=null,placeholder="",disabled=false}){
  const base={width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box",background:disabled?"#f9fafb":"white"};
  return(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>{label}{required&&<span style={{color:"#dc2626"}}> *</span>}</label>
      {options
        ?<select value={value} onChange={e=>onChange(e.target.value)} style={base} disabled={disabled}><option value="">Selecione...</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
        :<input type={type} value={value||""} onChange={e=>onChange(e.target.value)} style={base} placeholder={placeholder} disabled={disabled}/>
      }
    </div>
  );
}
function KpiCard({label,value,sub,color,icon,trend}){
  return(
    <div style={{background:"white",borderRadius:12,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",borderLeft:`4px solid ${color}`}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div>
          <div style={{fontSize:11,color:"#6b7280",marginBottom:3,textTransform:"uppercase",letterSpacing:.5}}>{label}</div>
          <div style={{fontSize:19,fontWeight:700,color:"#1a1a2e"}}>{value}</div>
          {sub&&<div style={{fontSize:11,marginTop:4,color:trend>0?"#2d6a4f":trend<0?"#e63946":"#9ca3af"}}>{trend>0?"▲ ":trend<0?"▼ ":""}{sub}</div>}
        </div>
        <span style={{fontSize:22}}>{icon}</span>
      </div>
    </div>
  );
}
function TabBar({tabs,active,onChange}){
  return(
    <div style={{display:"flex",gap:2,marginBottom:18,borderBottom:"2px solid #e5e7eb",flexWrap:"wrap"}}>
      {tabs.map(t=><button key={t.id} onClick={()=>onChange(t.id)} style={{padding:"8px 15px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:active===t.id?700:400,color:active===t.id?"#2d6a4f":"#6b7280",borderBottom:active===t.id?"2px solid #2d6a4f":"2px solid transparent",marginBottom:-2}}>{t.label}</button>)}
    </div>
  );
}
function SecHeader({title,sub}){return <div style={{marginBottom:20}}><h1 style={{fontSize:19,fontWeight:800,color:"#1b4332",margin:0}}>{title}</h1>{sub&&<p style={{fontSize:13,color:"#6b7280",margin:"3px 0 0"}}>{sub}</p>}</div>;}
const Card=({children,style={}})=><div style={{background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",...style}}>{children}</div>;
const CardTitle=({children})=><div style={{fontSize:13,fontWeight:700,color:"#1b4332",marginBottom:12}}>{children}</div>;
const TH=({s})=><th style={{padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9",whiteSpace:"nowrap"}}>{s}</th>;
const TD=({children,style={}})=><td style={{padding:"9px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6",...style}}>{children}</td>;

// Tela de loading
function Loading({msg="Carregando…"}){
  return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4f1",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>🌱</div>
        <div style={{color:"#2d6a4f",fontWeight:700,fontSize:16}}>{msg}</div>
      </div>
    </div>
  );
}

// ── AUTH VIEWS ────────────────────────────────────────────
function LoginView(){
  const [modo,setModo]=useState("login");
  const [email,setEmail]=useState("");
  const [senha,setSenha]=useState("");
  const [nome,setNome]=useState("");
  const [nomeFazenda,setNomeFazenda]=useState("");
  const [loading,setLoading]=useState(false);
  const [erro,setErro]=useState("");
  const [msg,setMsg]=useState("");
  const [showSenha,setShowSenha]=useState(false);

  const handleLogin=async()=>{
    setLoading(true);setErro("");
    const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password:senha});
    if(error) setErro(error.message==="Invalid login credentials"?"E-mail ou senha incorretos.":error.message);
    setLoading(false);
  };

  const handleSignUp=async()=>{
    if(!nome.trim()||!nomeFazenda.trim()||!email.trim()||!senha){setErro("Preencha todos os campos.");return;}
    if(senha.length<6){setErro("Senha deve ter mínimo 6 caracteres.");return;}
    setLoading(true);setErro("");
    const {data,error}=await supabase.auth.signUp({email:email.trim(),password:senha,options:{data:{nome}}});
    if(error){setErro(error.message);setLoading(false);return;}
    if(data.user){
      // Criar fazenda + perfil + config
      const {data:faz,error:eFaz}=await supabase.from("fazendas").insert({nome:nomeFazenda.trim(),owner_id:data.user.id}).select().single();
      if(!eFaz&&faz){
        await supabase.from("perfis").insert({user_id:data.user.id,fazenda_id:faz.id,nome:nome.trim(),perfil:"Administrador"});
        await supabase.from("config_fazenda").insert({fazenda_id:faz.id,nome_fazenda:nomeFazenda.trim()});
      }
    }
    if(data.session){
      setMsg("Conta criada! Bem-vindo.");
    } else {
      setMsg("Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.");
    }
    setLoading(false);
  };

  const handleGoogle=async()=>{
    setErro("");
    const {error}=await supabase.auth.signInWithOAuth({
      provider:"google",
      options:{redirectTo:window.location.origin}
    });
    if(error) setErro(error.message);
  };

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1b4332 0%,#2d6a4f 60%,#52b788 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:16}}>
      <div style={{background:"white",borderRadius:20,padding:"36px 32px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:6}}>🌱</div>
          <div style={{fontSize:22,fontWeight:800,color:"#1b4332"}}>FazendaGest</div>
          <div style={{fontSize:11,color:"#6b7280",marginTop:2}}>Cacau · Leite · Coco · Gado</div>
        </div>

        {/* Tabs */}
        <div style={{display:"flex",marginBottom:20,borderBottom:"2px solid #e5e7eb"}}>
          {[["login","Entrar"],["signup","Criar conta"]].map(([id,lbl])=>(
            <button key={id} onClick={()=>{setModo(id);setErro("");setMsg("");}} style={{flex:1,padding:"9px 0",border:"none",background:"none",cursor:"pointer",fontSize:14,fontWeight:modo===id?700:400,color:modo===id?"#1b4332":"#9ca3af",borderBottom:modo===id?"2px solid #1b4332":"2px solid transparent",marginBottom:-2}}>{lbl}</button>
          ))}
        </div>

        {msg&&<div style={{background:"#d8f3dc",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#1b4332",marginBottom:16,fontWeight:500}}>✅ {msg}</div>}
        {erro&&<div style={{background:"#fee2e2",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:16}}>⚠️ {erro}</div>}

        {modo==="signup"&&(
          <>
            <Campo label="Seu nome completo *" value={nome} onChange={setNome} placeholder="Ex: Maria da Silva"/>
            <Campo label="Nome da fazenda *" value={nomeFazenda} onChange={setNomeFazenda} placeholder="Ex: Fazenda Analu & Ana"/>
          </>
        )}

        <Campo label="E-mail *" value={email} onChange={setEmail} type="email" placeholder="seu@email.com"/>
        <div style={{marginBottom:16}}>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Senha *</label>
          <div style={{position:"relative"}}>
            <input type={showSenha?"text":"password"} value={senha} onChange={e=>setSenha(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&(modo==="login"?handleLogin():handleSignUp())}
              placeholder={modo==="signup"?"mínimo 6 caracteres":"sua senha"}
              style={{width:"100%",padding:"9px 40px 9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            <button onClick={()=>setShowSenha(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#9ca3af",fontSize:15}}>{showSenha?"🙈":"👁"}</button>
          </div>
        </div>

        <BotaoP onClick={modo==="login"?handleLogin:handleSignUp} disabled={loading} cor="#1b4332">
          {loading?"⏳ Aguarde…":modo==="login"?"Entrar":"Criar conta e fazenda"}
        </BotaoP>

        <div style={{position:"relative",margin:"18px 0",textAlign:"center"}}>
          <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"#e5e7eb"}}/>
          <span style={{position:"relative",background:"white",padding:"0 10px",fontSize:12,color:"#9ca3af"}}>ou</span>
        </div>

        <button onClick={handleGoogle} style={{width:"100%",padding:"10px",background:"white",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:14,fontWeight:500,color:"#374151"}}>
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continuar com Google
        </button>

        {modo==="login"&&<div style={{marginTop:16,textAlign:"center",fontSize:12,color:"#9ca3af"}}>Não tem conta? <button onClick={()=>{setModo("signup");setErro("");}} style={{background:"none",border:"none",color:"#2d6a4f",cursor:"pointer",fontWeight:600,fontSize:12}}>Crie aqui</button></div>}
      </div>
    </div>
  );
}

// Tela de configuração inicial (primeiro acesso com Google)
function CriarFazendaView({session,onCriada}){
  const [nome,setNome]=useState(session?.user?.user_metadata?.full_name||session?.user?.user_metadata?.name||"");
  const [nomeFazenda,setNomeFazenda]=useState("");
  const [loading,setLoading]=useState(false);
  const [erro,setErro]=useState("");

  const criar=async()=>{
    if(!nome.trim()||!nomeFazenda.trim()){setErro("Preencha todos os campos.");return;}
    setLoading(true);
    const {data:faz,error}=await supabase.from("fazendas").insert({nome:nomeFazenda.trim(),owner_id:session.user.id}).select().single();
    if(error){setErro(error.message);setLoading(false);return;}
    await supabase.from("perfis").insert({user_id:session.user.id,fazenda_id:faz.id,nome:nome.trim(),perfil:"Administrador"});
    await supabase.from("config_fazenda").insert({fazenda_id:faz.id,nome_fazenda:nomeFazenda.trim()});
    onCriada();
  };

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1b4332 0%,#2d6a4f 60%,#52b788 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif",padding:16}}>
      <div style={{background:"white",borderRadius:20,padding:"36px 32px",width:"100%",maxWidth:400,boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:44,marginBottom:6}}>🌱</div>
          <div style={{fontSize:20,fontWeight:800,color:"#1b4332"}}>Bem-vindo!</div>
          <div style={{fontSize:13,color:"#6b7280",marginTop:4}}>Vamos configurar sua fazenda</div>
        </div>
        {erro&&<div style={{background:"#fee2e2",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:16}}>⚠️ {erro}</div>}
        <Campo label="Seu nome completo *" value={nome} onChange={setNome} placeholder="Ex: Maria da Silva"/>
        <Campo label="Nome da fazenda *" value={nomeFazenda} onChange={setNomeFazenda} placeholder="Ex: Fazenda Analu & Ana"/>
        <div style={{marginTop:8}}><BotaoP onClick={criar} disabled={loading}>{loading?"⏳ Criando…":"🌱 Criar minha fazenda"}</BotaoP></div>
      </div>
    </div>
  );
}

// ── PERFIL DO USUÁRIO ─────────────────────────────────────
function PerfilView({session,perfilUser,fazenda,onAtualizado}){
  const [nome,setNome]=useState(perfilUser?.nome||"");
  const [senhaAtual,setSenhaAtual]=useState("");
  const [novaSenha,setNovaSenha]=useState("");
  const [confirmar,setConfirmar]=useState("");
  const [loadingNome,setLoadingNome]=useState(false);
  const [loadingSenha,setLoadingSenha]=useState(false);
  const [msgNome,setMsgNome]=useState("");
  const [msgSenha,setMsgSenha]=useState("");
  const [erroSenha,setErroSenha]=useState("");

  const salvarNome=async()=>{
    setLoadingNome(true);setMsgNome("");
    await supabase.from("perfis").update({nome:nome.trim()}).eq("id",perfilUser.id);
    setMsgNome("Nome atualizado!");setLoadingNome(false);
    onAtualizado();
  };

  const trocarSenha=async()=>{
    setErroSenha("");setMsgSenha("");
    if(novaSenha.length<6){setErroSenha("Nova senha deve ter mínimo 6 caracteres.");return;}
    if(novaSenha!==confirmar){setErroSenha("As senhas não coincidem.");return;}
    setLoadingSenha(true);
    const {error}=await supabase.auth.updateUser({password:novaSenha});
    if(error) setErroSenha(error.message);
    else {setMsgSenha("Senha alterada com sucesso!");setSenhaAtual("");setNovaSenha("");setConfirmar("");}
    setLoadingSenha(false);
  };

  const sair=async()=>{ await supabase.auth.signOut(); };

  return(
    <div>
      <SecHeader title="👤 Meu Perfil" sub="Gerencie seus dados de acesso"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:800}}>
        <div>
          <Card style={{marginBottom:16}}>
            <CardTitle>Dados pessoais</CardTitle>
            <div style={{marginBottom:12,padding:"10px 14px",background:"#f8faf9",borderRadius:8,fontSize:13}}>
              <div style={{color:"#6b7280",fontSize:11}}>E-mail</div>
              <div style={{fontWeight:600,color:"#1a1a2e"}}>{session?.user?.email}</div>
            </div>
            <div style={{marginBottom:12,padding:"10px 14px",background:"#f8faf9",borderRadius:8,fontSize:13}}>
              <div style={{color:"#6b7280",fontSize:11}}>Fazenda</div>
              <div style={{fontWeight:600,color:"#1a1a2e"}}>{fazenda?.nome}</div>
            </div>
            <div style={{marginBottom:12,padding:"10px 14px",background:"#f8faf9",borderRadius:8,fontSize:13}}>
              <div style={{color:"#6b7280",fontSize:11}}>Perfil de acesso</div>
              <div style={{fontWeight:600,color:"#1b4332"}}>{perfilUser?.perfil}</div>
            </div>
            <Campo label="Nome de exibição" value={nome} onChange={setNome}/>
            {msgNome&&<div style={{fontSize:12,color:"#2d6a4f",marginBottom:10,fontWeight:600}}>✅ {msgNome}</div>}
            <BotaoP onClick={salvarNome} disabled={loadingNome}>{loadingNome?"⏳ Salvando…":"💾 Salvar nome"}</BotaoP>
          </Card>
          <Card style={{borderTop:"3px solid #e76f51"}}>
            <CardTitle>⚠️ Sair da conta</CardTitle>
            <p style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Você será desconectado e precisará fazer login novamente.</p>
            <button onClick={sair} style={{padding:"9px 18px",background:"none",border:"1px solid #fca5a5",color:"#dc2626",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>🚪 Sair da conta</button>
          </Card>
        </div>
        <Card>
          <CardTitle>Alterar senha</CardTitle>
          <Campo label="Nova senha" value={novaSenha} onChange={setNovaSenha} type="password" placeholder="mínimo 6 caracteres"/>
          <Campo label="Confirmar nova senha" value={confirmar} onChange={setConfirmar} type="password" placeholder="repita a nova senha"/>
          {erroSenha&&<div style={{fontSize:12,color:"#dc2626",marginBottom:12,padding:"8px 12px",background:"#fee2e2",borderRadius:6}}>⚠️ {erroSenha}</div>}
          {msgSenha&&<div style={{fontSize:12,color:"#2d6a4f",marginBottom:12,padding:"8px 12px",background:"#d8f3dc",borderRadius:6}}>✅ {msgSenha}</div>}
          <BotaoP onClick={trocarSenha} disabled={loadingSenha}>{loadingSenha?"⏳ Alterando…":"🔐 Alterar senha"}</BotaoP>
          <p style={{fontSize:11,color:"#9ca3af",marginTop:12}}>Você receberá confirmação no e-mail após a alteração.</p>
        </Card>
      </div>
    </div>
  );
}
function DashboardView({funcionarios,producao,despesas,receitas,financiamentos}){
  const [aba,setAba]=useState("geral");
  const pCur=[...producao].sort((a,b)=>b.data.localeCompare(a.data))[0]||{};
  const recCacau=(pCur.cacauKg||0)*PC, recLeite=(pCur.leiteL||0)*PL, recCoco=(pCur.cocoUn||0)*PCO;
  const recGado=receitas.filter(r=>r.atividade==="Gado Corte").reduce((s,r)=>s+(r.valor||0),0);
  const recTotal=recCacau+recLeite+recCoco+recGado;
  const cstTotal=despesas.reduce((s,d)=>s+(d.valor||0),0);
  const lucTotal=recTotal-cstTotal;
  const dividaTotal=financiamentos.filter(f=>f.status==="Ativo").reduce((s,f)=>s+(f.valor||0),0);

  const hoje30=new Date(); hoje30.setDate(hoje30.getDate()+30);
  const alertas=financiamentos.filter(f=>f.status==="Ativo").map(f=>{
    const tab=f.sistema==="SAC"?calcTabelaSAC(f):calcTabelaPRICE(f);
    const prox=tab.find(p=>p.status==="Pendente");
    if(!prox) return null;
    const dt=new Date(prox.vencimento+"-15");
    return dt<=hoje30?{banco:f.banco,finalidade:f.finalidade,venc:prox.vencimento,val:prox.prestacao}:null;
  }).filter(Boolean);

  const pizza=[{name:"🍫 Cacau",value:recCacau},{name:"🥛 Leite",value:recLeite},{name:"🥥 Coco",value:recCoco},{name:"🐂 Gado",value:recGado}].filter(x=>x.value>0);
  const hist=producao.slice(-6).map(p=>({mes:p.mes,Cacau:p.cacauKg*PC,Leite:p.leiteL*PL,Coco:p.cocoUn*PCO}));
  const cstCacau=despesas.filter(d=>d.categoria==="Insumos Agrícolas").reduce((s,d)=>s+d.valor,0)+2000;
  const cstLeite=despesas.filter(d=>d.categoria==="🥛 Gado Leiteiro").reduce((s,d)=>s+d.valor,0)+2400;
  const cstGado=despesas.filter(d=>d.categoria==="🐂 Gado de Corte").reduce((s,d)=>s+d.valor,0);
  const comp=[
    {ativ:"Cacau",receita:recCacau,custo:cstCacau,lucro:recCacau-cstCacau,cor:"#d4a017",icon:"🍫"},
    {ativ:"Leite",receita:recLeite,custo:cstLeite,lucro:recLeite-cstLeite,cor:"#2d6a4f",icon:"🥛"},
    {ativ:"Coco", receita:recCoco, custo:1800,     lucro:recCoco-1800,     cor:"#52b788",icon:"🥥"},
    {ativ:"Gado Corte",receita:recGado,custo:cstGado,lucro:recGado-cstGado,cor:"#457b9d",icon:"🐂"},
  ];
  const ABAS=[{id:"geral",label:"🏠 Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"},{id:"gado",label:"🐂 Gado"}];

  const TabAtiv=({atv,histData,dataKey,tipo="bar"})=>{
    const rm=histData.map(p=>({mes:p.mes,receita:Math.round(p[dataKey]||0),custo:atv.custo,lucro:Math.round(p[dataKey]||0)-atv.custo}));
    return(
      <div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
          <KpiCard label="Receita mês" value={fmt(atv.receita)} color={atv.cor} icon={atv.icon} trend={1}/>
          <KpiCard label="Custo mês"   value={fmt(atv.custo)}   color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro mês"   value={fmt(atv.lucro)}   color={atv.lucro>=0?"#2d6a4f":"#e76f51"} icon="📈" trend={atv.lucro>=0?1:-1}/>
          <KpiCard label="Margem" value={atv.receita>0?`${((atv.lucro/atv.receita)*100).toFixed(0)}%`:"—"} color="#457b9d" icon="📊" trend={0}/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
          <Card>
            <CardTitle>Receita × Custo × Lucro — histórico</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={rm}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill={atv.cor} radius={[3,3,0,0]}/><Bar dataKey="custo" name="Custo" fill="#e76f51" radius={[3,3,0,0]}/><Bar dataKey="lucro" name="Lucro" fill="#2d6a4f" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Produção histórico</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              {tipo==="line"
                ?<LineChart data={histData}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey={dataKey} stroke={atv.cor} strokeWidth={2}/></LineChart>
                :<BarChart data={histData}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey={dataKey} fill={atv.cor} radius={[3,3,0,0]}/></BarChart>
              }
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  };

  return(
    <div>
      <SectionHeader title="Dashboard" sub="Análise financeira e produtiva por atividade"/>
      {alertas.length>0&&(
        <div style={{background:"#fef3c7",border:"1px solid #fcd34d",borderRadius:10,padding:"12px 16px",marginBottom:16}}>
          <div style={{fontSize:13,fontWeight:700,color:"#b45309",marginBottom:6}}>⚠️ Financiamentos com vencimento em até 30 dias</div>
          {alertas.map((a,i)=><div key={i} style={{fontSize:12,color:"#92400e",marginBottom:2}}>• {a.banco} — {a.finalidade}: <strong>{fmt(a.val)}</strong> vence {a.venc}</div>)}
        </div>
      )}
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {ABAS.map(a=><button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"9px 18px",border:"none",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,background:aba===a.id?"#1b4332":"white",color:aba===a.id?"white":"#6b7280",boxShadow:aba===a.id?"0 2px 8px rgba(27,67,50,0.3)":"0 1px 3px rgba(0,0,0,0.08)"}}>{a.label}</button>)}
      </div>

      {aba==="geral"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
            <KpiCard label="Receita Total"   value={fmt(recTotal)}    color="#2d6a4f" icon="💰" trend={1}/>
            <KpiCard label="Despesas"         value={fmt(cstTotal)}    color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro Consolidado"value={fmt(lucTotal)}    color={lucTotal>=0?"#d4a017":"#e76f51"} icon="📈" trend={lucTotal>=0?1:-1}/>
            <KpiCard label="Dívida Bancária"  value={fmt(dividaTotal)} color="#9333ea" icon="🏦" trend={-1}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:14}}>
            <Card>
              <CardTitle>Receita por atividade — histórico</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hist}>
                  <defs>{[["gC","#d4a017"],["gL","#2d6a4f"],["gCo","#52b788"]].map(([id,c])=><linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.3}/><stop offset="95%" stopColor={c} stopOpacity={0}/></linearGradient>)}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Cacau" stroke="#d4a017" fill="url(#gC)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Leite" stroke="#2d6a4f" fill="url(#gL)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Coco"  stroke="#52b788" fill="url(#gCo)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Card>
                <CardTitle>Distribuição de Receita</CardTitle>
                <ResponsiveContainer width="100%" height={110}>
                  <PieChart><Pie data={pizza} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">{pizza.map((_,i)=><Cell key={i} fill={["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:4}}>
                  {pizza.map((d,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#374151"}}><div style={{width:7,height:7,borderRadius:2,background:["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}}/>{d.name} ({recTotal>0?((d.value/recTotal)*100).toFixed(0):0}%)</div>)}
                </div>
              </Card>
            </div>
          </div>
          <Card>
            <CardTitle>Receita × Custo × Lucro por atividade</CardTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={comp}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="ativ" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/><Bar dataKey="custo" name="Custo" fill="#e76f51" radius={[3,3,0,0]}/><Bar dataKey="lucro" name="Lucro" fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {aba==="cacau"&&<TabAtiv atv={comp[0]} histData={producao.slice(-6).map(p=>({mes:p.mes,cacauKg:p.cacauKg*PC}))} dataKey="cacauKg" tipo="bar"/>}
      {aba==="leite"&&<TabAtiv atv={comp[1]} histData={producao.slice(-6).map(p=>({mes:p.mes,leiteL:p.leiteL*PL}))}  dataKey="leiteL"  tipo="line"/>}
      {aba==="coco" &&<TabAtiv atv={comp[2]} histData={producao.slice(-6).map(p=>({mes:p.mes,cocoUn:p.cocoUn*PCO}))} dataKey="cocoUn"  tipo="bar"/>}
      {aba==="gado" &&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
            <KpiCard label="Receita Venda" value={fmt(recGado)} color="#457b9d" icon="🐂" trend={1}/>
            <KpiCard label="Custo Corte"   value={fmt(cstGado)} color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro Corte"   value={fmt(recGado-cstGado)} color={recGado-cstGado>=0?"#2d6a4f":"#e76f51"} icon="📈" trend={recGado-cstGado>=0?1:-1}/>
            <KpiCard label="R$/Arroba"     value="R$ 325,00" color="#d4a017" icon="📊" trend={0}/>
          </div>
          <Card>
            <CardTitle>Histórico de vendas — Gado de Corte</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={VENDAS_GADO_HIST}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Bar dataKey="total" name="Receita" fill="#457b9d" radius={[3,3,0,0]}/></BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

function AbaAtiv({atv,hist,tipo="bar"}){
  return(
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Receita" value={fmt(atv.receita)} color={atv.cor} icon={atv.icon} trend={1}/>
        <KpiCard label="Custo"   value={fmt(atv.custo)}   color="#e76f51" icon="📋" trend={0}/>
        <KpiCard label="Lucro"   value={fmt(atv.lucro)}   color={atv.lucro>=0?"#2d6a4f":"#e76f51"} icon="📈" trend={atv.lucro>=0?1:-1}/>
        <KpiCard label="Margem"  value={atv.receita>0?`${((atv.lucro/atv.receita)*100).toFixed(0)}%`:"—"} color="#457b9d" icon="📊" trend={0}/>
      </div>
      <Card>
        <CardTitle>Histórico</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          {tipo==="line"
            ?<LineChart data={hist}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Line type="monotone" dataKey="v" stroke={atv.cor} strokeWidth={2} dot={{r:4,fill:atv.cor}}/></LineChart>
            :<BarChart data={hist}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Bar dataKey="v" fill={atv.cor} radius={[3,3,0,0]}/></BarChart>
          }
        </ResponsiveContainer>
      </Card>
    </div>
  );
}

function FinanceiroView({funcionarios,despesas,receitas}){
  const [tab,setTab]=useState("folha");
  const ativos=funcionarios.filter(f=>f.ativo);
  const totalSalBruto=ativos.reduce((s,f)=>s+(f.salario||0),0);
  const totalSalFam  =ativos.reduce((s,f)=>s+calcSalFamilia(f.salario,f.numFilhos||0),0);
  const totalINSSEmp =ativos.reduce((s,f)=>s+calcINSSEmpregado(f.salario),0);
  const totalEncPatr =totalSalBruto*(0.20+0.08+0.01+0.02+0.1111+0.0833);
  const totalFolha   =totalSalBruto+totalEncPatr;
  const thS={padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9"};
  const tdS={padding:"10px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6"};
  return(
    <div>
      <SectionHeader title="Módulo Financeiro" sub="Folha de pagamento, encargos, tributos, despesas e receitas"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Total Salários Brutos" value={fmt(totalSalBruto)} color="#2d6a4f" icon="👥" trend={0}/>
        <KpiCard label="Encargos Patronais"    value={fmt(totalEncPatr)}  color="#e76f51" icon="📊" trend={0}/>
        <KpiCard label="Custo Total Folha"     value={fmt(totalFolha)}    color="#d4a017" icon="💼" trend={0}/>
      </div>
      <TabBar tabs={[{id:"folha",label:"Folha"},{id:"encargos",label:"Encargos"},{id:"tributos",label:"Tributos"},{id:"despesas",label:"Despesas"},{id:"receitas",label:"Receitas"}]} active={tab} onChange={setTab}/>

      {tab==="folha"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Nome","Cargo","Atividade","Salário Bruto","INSS Emp.","Sal. Família","Líquido","Custo Empresa"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{ativos.map((f,i)=>{
              const inssEmp=calcINSSEmpregado(f.salario);
              const salFam=calcSalFamilia(f.salario,f.numFilhos||0);
              const liquido=f.salario-inssEmp+salFam;
              const encPatr=f.salario*(0.20+0.08+0.01+0.02+0.1111+0.0833);
              return(
                <tr key={f.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:600,color:"#1a1a2e"}}>{f.nome}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{f.cargo}</td>
                  <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,background:"#f0faf4",color:"#2d6a4f",fontWeight:600}}>{f.atividade}</span></td>
                  <td style={tdS}>{fmt(f.salario)}</td>
                  <td style={{...tdS,color:"#e76f51"}}>{fmt(inssEmp)}</td>
                  <td style={{...tdS,color:"#2d6a4f",fontWeight:f.numFilhos>0?700:400}}>{f.numFilhos>0?fmt(salFam)+` (${f.numFilhos}f)`:"—"}</td>
                  <td style={{...tdS,fontWeight:600}}>{fmt(liquido)}</td>
                  <td style={{...tdS,fontWeight:700,color:"#1b4332"}}>{fmt(f.salario+encPatr)}</td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={3} style={{padding:"10px 12px",color:"white",fontWeight:700}}>TOTAIS</td>
              <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totalSalBruto)}</td>
              <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totalINSSEmp)}</td>
              <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{totalSalFam>0?fmt(totalSalFam):"—"}</td>
              <td colSpan={2} style={{padding:"10px 12px",color:"white",fontWeight:800}}>{fmt(totalFolha)}</td>
            </tr></tfoot>
          </table>
          <div style={{padding:12,background:"#fffbeb",borderTop:"1px solid #fcd34d",fontSize:12,color:"#92400e"}}>
            💡 <strong>Salário Família 2025:</strong> R$ 65,00/filho para salário ≤ R$ 1.906,04 (Portaria MPS/MF nº 6/2025). INSS progressivo: 7,5% até R$1.518 · 9% até R$2.793,88 · 12% até R$4.190,83 · 14% até R$8.157,41.
          </div>
        </Card>
      )}

      {tab==="encargos"&&(
        <Card>
          <CardTitle>Composição dos Encargos Patronais</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[
              {lbl:"INSS Patronal",      perc:"20,0%",val:totalSalBruto*0.20,  desc:"Previdência Social"},
              {lbl:"FGTS",               perc:" 8,0%",val:totalSalBruto*0.08,  desc:"Fundo de Garantia"},
              {lbl:"RAT/SAT",            perc:" 1,0%",val:totalSalBruto*0.01,  desc:"Acidente de trabalho"},
              {lbl:"SENAR",              perc:" 2,0%",val:totalSalBruto*0.02,  desc:"Contribuição rural"},
              {lbl:"Provisão Férias+1/3",perc:"11,1%",val:totalSalBruto*0.1111,desc:"Provisão mensal"},
              {lbl:"Provisão 13º",       perc:" 8,3%",val:totalSalBruto*0.0833,desc:"Provisão mensal"},
            ].map((e,i)=>(
              <div key={i} style={{padding:14,background:"#f8faf9",borderRadius:8,borderLeft:`3px solid ${COLORS[i]}`}}>
                <div style={{fontSize:11,color:"#6b7280"}}>{e.lbl}</div>
                <div style={{fontSize:22,fontWeight:700,color:"#1a1a2e",margin:"3px 0"}}>{e.perc}</div>
                <div style={{fontSize:14,fontWeight:700,color:COLORS[i]}}>{fmt(e.val)}/mês</div>
                <div style={{fontSize:11,color:"#9ca3af",marginTop:3}}>{e.desc}</div>
              </div>
            ))}
          </div>
          <div style={{marginTop:14,padding:14,background:"#1b4332",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{color:"#95d5b2",fontWeight:600}}>Total Encargos/mês</span>
            <span style={{color:"white",fontSize:20,fontWeight:800}}>{fmt(totalEncPatr)}</span>
          </div>
        </Card>
      )}

      {tab==="tributos"&&(
        <Card>
          <CardTitle>Tributos da Atividade Rural</CardTitle>
          {[
            {tributo:"ITR",                        base:"Valor da terra nua",   venc:"30/11/2025",valor:1200,freq:"Anual"},
            {tributo:"Contribuição Sindical Rural", base:"Patrimônio declarado", venc:"31/01/2025",valor:850, freq:"Anual"},
            {tributo:"Funrural – RGPS",             base:"1,5% receita bruta",   venc:"Mensal",    valor:705, freq:"Mensal"},
            {tributo:"INSS Produtor Rural",         base:"2,1% receita bruta",   venc:"Mensal",    valor:987, freq:"Mensal"},
            {tributo:"SENAR",                       base:"0,2% comerc. rural",   venc:"Mensal",    valor:94,  freq:"Mensal"},
          ].map((t,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{t.tributo}</div><div style={{fontSize:12,color:"#6b7280"}}>Base: {t.base} · Venc: {t.venc}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:"#e76f51"}}>{fmt(t.valor)}</div><div style={{fontSize:11,color:"#9ca3af"}}>{t.freq}</div></div>
            </div>
          ))}
        </Card>
      )}

      {tab==="despesas"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card>
            <CardTitle>Despesas por categoria</CardTitle>
            {Object.entries(despesas.reduce((a,d)=>{a[d.categoria]=(a[d.categoria]||0)+d.valor;return a;},{})).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>{
              const total=despesas.reduce((s,d)=>s+d.valor,0);
              return(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#374151"}}>{cat}</span><span style={{fontSize:12,fontWeight:700}}>{fmt(val)}</span></div>
                  <div style={{height:6,background:"#f3f4f6",borderRadius:3}}><div style={{height:"100%",width:`${(val/total)*100}%`,background:COLORS[i%8],borderRadius:3}}/></div>
                </div>
              );
            })}
          </Card>
          <Card>
            <CardTitle>Gráfico de despesas</CardTitle>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={Object.entries(despesas.reduce((a,d)=>{a[d.categoria]=(a[d.categoria]||0)+d.valor;return a;},{})).map(([name,value])=>({name:name.replace(/[🐂🥛]/g,""),value}))} cx="50%" cy="48%" outerRadius={90} dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {despesas.map((_,i)=><Cell key={i} fill={COLORS[i%8]}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab==="receitas"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Atividade","Qtd/Detalhes","Unitário","Valor","Comprador"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
              <tr key={r.id} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{...tdS,color:"#6b7280"}}>{r.data}</td>
                <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{r.atividade}</td>
                <td style={tdS}>{r.qtd}</td>
                <td style={tdS}>{r.unitario}</td>
                <td style={{...tdS,fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</td>
                <td style={{...tdS,color:"#6b7280"}}>{r.comprador}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={4} style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>Total Receitas</td>
              <td style={{padding:"10px 12px",color:"white",fontWeight:800}}>{fmt(receitas.reduce((s,r)=>s+r.valor,0))}</td>
              <td/>
            </tr></tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}

function ProducaoView({producao}){
  const [tab,setTab]=useState("geral");
  const cur=[...producao].sort((a,b)=>b.data.localeCompare(a.data))[0]||{};
  const prv=[...producao].sort((a,b)=>b.data.localeCompare(a.data))[1]||{};
  const hist6=producao.slice(-6);
  return(
    <div>
      <SectionHeader title="Controle de Produção" sub="Cacau · Leite · Coco · Gado de Corte"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="🍫 Cacau" value={`${fmtN(cur.cacauKg)} kg`}  sub={`${(cur.cacauKg||0)-(prv.cacauKg||0)>0?"+":""}${(cur.cacauKg||0)-(prv.cacauKg||0)} kg`} color="#d4a017" icon="🍫" trend={(cur.cacauKg||0)-(prv.cacauKg||0)}/>
        <KpiCard label="🥛 Leite" value={`${fmtN(cur.leiteL)} L`}    sub={`${(cur.leiteL||0)-(prv.leiteL||0)>0?"+":""}${(cur.leiteL||0)-(prv.leiteL||0)} L`}   color="#2d6a4f" icon="🥛" trend={(cur.leiteL||0)-(prv.leiteL||0)}/>
        <KpiCard label="🥥 Coco"  value={`${fmtN(cur.cocoUn)} un`}   sub={`${(cur.cocoUn||0)-(prv.cocoUn||0)>0?"+":""}${(cur.cocoUn||0)-(prv.cocoUn||0)} un`}  color="#52b788" icon="🥥" trend={(cur.cocoUn||0)-(prv.cocoUn||0)}/>
        <KpiCard label="🐂 Gado"  value={`${VENDAS_GADO_HIST[5].cabecas} cab.`} sub={`${VENDAS_GADO_HIST[5].arrobas} arrobas · ${fmt(VENDAS_GADO_HIST[5].total)}`} color="#457b9d" icon="🐂" trend={1}/>
      </div>
      <TabBar tabs={[{id:"geral",label:"Visão Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"},{id:"gado",label:"🐂 Gado Corte"}]} active={tab} onChange={setTab}/>

      {tab==="geral"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[["cacauKg","kg","#d4a017","🍫 Cacau (kg)","bar"],["leiteL","L","#2d6a4f","🥛 Leite (L)","line"],["cocoUn","un","#52b788","🥥 Coco (un)","bar"]].map(([key,unit,cor,label,tipo])=>(
            <Card key={key}>
              <CardTitle>{label}</CardTitle>
              <ResponsiveContainer width="100%" height={150}>
                {tipo==="line"
                  ?<LineChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey={key} name={unit} stroke={cor} strokeWidth={2} dot={{r:3,fill:cor}}/></LineChart>
                  :<BarChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey={key} name={unit} fill={cor} radius={[3,3,0,0]}/></BarChart>
                }
              </ResponsiveContainer>
            </Card>
          ))}
          <Card>
            <CardTitle>🐂 Gado Corte — arrobas e cabeças</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={VENDAS_GADO_HIST}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="arrobas" name="Arrobas" fill="#457b9d" radius={[3,3,0,0]}/><Bar dataKey="cabecas" name="Cabeças" fill="#1b4332" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {tab==="cacau"&&(
        <Card>
          <CardTitle>🍫 Calendário Agrícola do Cacau</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
            {[
              {ativ:"Poda de Formação / Manutenção",periodo:"Jul – Set",status:"Planejado",    prox:"Jul/25"},
              {ativ:"Adubação NPK",                  periodo:"Out – Nov",status:"Realizado",    prox:"Out/25"},
              {ativ:"Colheita Principal",             periodo:"Out – Jan",status:"Em andamento", prox:"—"},
              {ativ:"Colheita Temporã",               periodo:"Abr – Jun",status:"Planejado",    prox:"Abr/25"},
              {ativ:"Controle Vassoura-de-Bruxa",    periodo:"Contínuo", status:"Em andamento", prox:"Mensal"},
              {ativ:"Fermentação e Secagem",          periodo:"Pós-colh.", status:"Em andamento", prox:"—"},
            ].map((a,i)=>{
              const cor=a.status==="Realizado"?"#2d6a4f":a.status==="Em andamento"?"#d4a017":"#457b9d";
              return(
                <div key={i} style={{padding:12,borderRadius:8,background:"#f8faf9",borderLeft:`3px solid ${cor}`}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>{a.ativ}</div>
                  <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>Período: {a.periodo}</div>
                  <div style={{display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center"}}>
                    <span style={{fontSize:11,padding:"2px 8px",borderRadius:10,background:cor+"22",color:cor,fontWeight:600}}>{a.status}</span>
                    <span style={{fontSize:11,color:"#9ca3af"}}>Próx: {a.prox}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {tab==="leite"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card>
            <CardTitle>🥛 Indicadores de Produção Leiteira</CardTitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
              {[{l:"Vacas em Lactação",v:"22 cab."},{l:"Média L/vaca/dia",v:`${cur.leiteL?((cur.leiteL/22)/30).toFixed(1):"—"} L`},{l:"CCS Médio",v:"<200 mil"},{l:"Gordura",v:"3,8%"},{l:"Proteína",v:"3,2%"},{l:"Classificação",v:"Tipo A"}].map((ind,i)=>(
                <div key={i} style={{padding:12,background:"#f8faf9",borderRadius:8,textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:"#1a1a2e"}}>{ind.v}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>{ind.l}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Produção de Leite — histórico</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={hist6}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/><Tooltip/><Line type="monotone" dataKey="leiteL" name="Litros" stroke="#2d6a4f" strokeWidth={2} dot={{r:4,fill:"#2d6a4f"}}/></LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {tab==="coco"&&(
        <Card>
          <CardTitle>🥥 Gestão do Coqueiral</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
            {[{l:"Área Plantada",v:"12 ha"},{l:"Plantas Produtivas",v:"480 un"},{l:"Cachos/Planta",v:"8 cachos"},{l:"Cocos/Cacho",v:"10 un"}].map((item,i)=>(
              <div key={i} style={{padding:14,background:"#f8faf9",borderRadius:8,textAlign:"center"}}>
                <div style={{fontSize:18,fontWeight:700,color:"#1a1a2e"}}>{item.v}</div>
                <div style={{fontSize:12,color:"#6b7280"}}>{item.l}</div>
              </div>
            ))}
          </div>
          {[{meses:"Jan / Jul",adubo:"NPK 06-24-12",dose:"500 g/planta"},{meses:"Abr / Out",adubo:"Ureia + KCl",dose:"300+200 g/pl."},{meses:"Jun / Dez",adubo:"Boro + Zinco foliar",dose:"50 g/planta"}].map((a,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div style={{fontSize:13,fontWeight:600}}>{a.adubo}</div>
              <div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:600,color:"#52b788"}}>{a.dose}</div><div style={{fontSize:11,color:"#9ca3af"}}>{a.meses}</div></div>
            </div>
          ))}
        </Card>
      )}
      {tab==="gado"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card>
            <CardTitle>Vendas de Gado — histórico</CardTitle>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr>{["Mês","Cabeças","Arrobas","R$/@","Total"].map((h,i)=><th key={i} style={{padding:"7px 10px",textAlign:"left",color:"#6b7280",borderBottom:"1px solid #e5e7eb",fontWeight:600}}>{h}</th>)}</tr></thead>
              <tbody>{VENDAS_GADO_HIST.map((v,i)=><tr key={i} style={{background:i%2?"#fafafa":"white"}}><td style={{padding:"8px 10px",fontWeight:600}}>{v.mes}</td><td style={{padding:"8px 10px"}}>{v.cabecas} cab.</td><td style={{padding:"8px 10px"}}>{v.arrobas} @</td><td style={{padding:"8px 10px",color:"#d4a017",fontWeight:600}}>{fmt(v.valorArroba)}</td><td style={{padding:"8px 10px",fontWeight:700,color:"#1b4332"}}>{fmt(v.total)}</td></tr>)}</tbody>
              <tfoot><tr style={{background:"#1b4332"}}><td colSpan={4} style={{padding:"8px 10px",color:"#95d5b2",fontWeight:700}}>Total 6 meses</td><td style={{padding:"8px 10px",color:"white",fontWeight:800}}>{fmt(VENDAS_GADO_HIST.reduce((s,v)=>s+v.total,0))}</td></tr></tfoot>
            </table>
          </Card>
          <Card>
            <CardTitle>GMD — Ganho de Peso Médio Diário</CardTitle>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={[{mes:"Out",gmd:0.82},{mes:"Nov",gmd:0.78},{mes:"Dez",gmd:0.91},{mes:"Jan",gmd:0.88},{mes:"Fev",gmd:0.85},{mes:"Mar",gmd:0.93}]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis domain={[0.6,1.1]} tick={{fontSize:10}} tickFormatter={v=>`${v} kg`}/>
                <Tooltip formatter={v=>`${v} kg/dia`}/>
                <Line type="monotone" dataKey="gmd" name="GMD" stroke="#1b4332" strokeWidth={2} dot={{r:4,fill:"#1b4332"}}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{marginTop:10,padding:10,background:"#f0faf4",borderRadius:8,fontSize:12}}>Meta: 0,9 kg/dia · Atual: <strong style={{color:"#1b4332"}}>0,93 kg/dia ✅</strong></div>
          </Card>
        </div>
      )}
    </div>
  );
}

function ManejoView({animaisLeiteiro,animaisCorte,vacinas,pastagens}){
  const [tab,setTab]=useState("leiteiro");
  return(
    <div>
      <SecHeader title="Manejo Pecuário" sub="Gado leiteiro, corte e agenda sanitária"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Gado Leiteiro" value={`${animaisLeiteiro.reduce((s,a)=>s+a.qtd,0)} cab.`} color="#2d6a4f" icon="🐄" trend={0}/>
        <KpiCard label="Gado de Corte" value={`${animaisCorte.length} cab.`} color="#457b9d" icon="🐂" trend={0}/>
        <KpiCard label="Vacinas Pendentes" value={`${vacinas.filter(v=>v.status==="Pendente").length}`} sub="Próx: 10/04/25" color="#e76f51" icon="💉" trend={-1}/>
        <KpiCard label="Pastagens" value={`${pastagens.length} áreas`} sub={`${pastagens.filter(p=>p.status==="Descanso").length} descanso`} color="#52b788" icon="🌿" trend={0}/>
      </div>
      <TabBar tabs={[{id:"leiteiro",label:"🐄 Gado Leiteiro"},{id:"corte",label:"🐂 Gado de Corte"},{id:"vacinas",label:"💉 Sanitário"}]} active={tab} onChange={setTab}/>
      {tab==="leiteiro"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Lote","Qtd","Status","Pasto","Próx. Vacina"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>{animaisLeiteiro.map((a,i)=>(
              <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                <TD style={{fontWeight:600}}>{a.lote}</TD><TD>{a.qtd} cab.</TD>
                <TD><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:a.status.includes("Atenção")?"#fff3cd":"#d8f3dc",color:a.status.includes("Atenção")?"#b45309":"#2d6a4f"}}>{a.status}</span></TD>
                <TD style={{color:"#6b7280"}}>{a.pasto}</TD>
                <TD style={{color:a.status.includes("Atenção")?"#e76f51":"#374151",fontWeight:a.status.includes("Atenção")?700:400}}>{a.proxVacina}</TD>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {tab==="corte"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Brinco","Categoria","Peso Prev.","Peso Atual","GMD","Arrobas","Entrada","Prev. Abate","Local","Status"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>{animaisCorte.map((a,i)=>{
              const gmd=a.pesoPrev?((a.pesoAtual-a.pesoPrev)/90).toFixed(2):"—";
              const cor=a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
              const bg=a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
              return(
                <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                  <TD style={{fontWeight:700}}>{a.brinco}</TD><TD>{a.categoria}</TD>
                  <TD>{a.pesoPrev} kg</TD><TD style={{fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</TD>
                  <TD>{gmd} kg/d</TD><TD style={{color:"#d4a017",fontWeight:600}}>{(a.pesoAtual/15).toFixed(1)} @</TD>
                  <TD style={{color:"#6b7280"}}>{a.dtEntrada}</TD><TD>{a.previsaoAbate}</TD>
                  <TD style={{color:"#6b7280"}}>{a.pasto}</TD>
                  <TD><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor}}>{a.status}</span></TD>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      )}
      {tab==="vacinas"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Rebanho","Lote","Vacina","Qtd","Custo","Status"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{
              const pend=v.status==="Pendente";
              return(
                <tr key={v.id} style={{background:i%2?"#fafafa":"white"}}>
                  <TD style={{fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</TD>
                  <TD><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f"}}>{v.rebanho}</span></TD>
                  <TD>{v.lote}</TD><TD>{v.vacina}</TD><TD>{v.qtd} cab.</TD>
                  <TD>{fmt(v.custo)}</TD>
                  <TD><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f"}}>{v.status}</span></TD>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

function PastagensView({pastagens,setPastagens,config,fazendaId,onAdd,onUpdate,onDelete}){
  const [tab,setTab]=useState("lista");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [confirm,setConfirm]=useState(null);
  const [demarcando,setDemarcando]=useState(null);
  const mapRef=useRef(null);
  const mapsLoaded=useGoogleMaps(config?.mapsApiKey);

  const abrirAdd=()=>{setEditItem(null);setForm({status:"Em uso",tipo:"Misto",capim:"Brachiaria brizantha"});setModal("form");};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal("form");};
  const fechar=()=>{setModal(null);setEditItem(null);setForm({});};

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração desta pastagem?":"Confirmar cadastro desta pastagem?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid(),area:Number(form.area||0),capacidade:Number(form.capacidade||0),atual:Number(form.atual||0),lat:Number(form.lat||0),lng:Number(form.lng||0)};
      setPastagens(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };

  const excluir=(id,nome)=>setConfirm({msg:`Excluir permanentemente "${nome}"?`,danger:true,onSim:()=>{setPastagens(prev=>prev.filter(x=>x.id!==id));setConfirm(null);}});

  const salvarDemarcacao=(lat,lng)=>{
    if(demarcando){
      setPastagens(prev=>prev.map(p=>p.id===demarcando.id?{...p,lat:Number(lat),lng:Number(lng)}:p));
    }
    setDemarcando(null);
  };

  const F=(label,campo,type="text",required=false,opts=null)=>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={required} options={opts}/>;

  const corStatus=s=>s==="Em uso"?"#2d6a4f":s==="Descanso"?"#457b9d":s==="Em reforma"?"#d4a017":s==="Vedado"?"#dc2626":"#9ca3af";
  const corTipo=t=>t==="Corte"?"#457b9d":t==="Leiteiro"?"#2d6a4f":t==="Reserva"?"#9ca3af":"#d4a017";

  // Map effect
  useEffect(()=>{
    if(tab!=="mapa"||!mapsLoaded||!mapRef.current) return;
    const map=new window.google.maps.Map(mapRef.current,{
      center:{lat:config?.lat||-14.86,lng:config?.lng||-39.26},
      zoom:config?.zoom||14,
      mapTypeId:"satellite",
    });
    pastagens.filter(p=>p.lat&&p.lng).forEach(p=>{
      const marker=new window.google.maps.Marker({
        position:{lat:Number(p.lat),lng:Number(p.lng)},
        map,
        title:p.nome,
        icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:12,fillColor:corStatus(p.status),fillOpacity:0.9,strokeColor:"white",strokeWeight:2},
      });
      const info=new window.google.maps.InfoWindow({
        content:`<div style="font-family:sans-serif;padding:4px"><strong>${p.nome}</strong><br/>${p.area} ha · ${p.tipo}<br/>${p.atual}/${p.capacidade} UA · ${p.status}<br/><em>${p.capim}</em></div>`
      });
      marker.addListener("click",()=>info.open(map,marker));
    });
  },[tab,mapsLoaded,pastagens,config]);

  const totalArea=pastagens.reduce((s,p)=>s+p.area,0);
  const totalUA=pastagens.reduce((s,p)=>s+p.atual,0);
  const emUso=pastagens.filter(p=>p.status==="Em uso").length;

  return(
    <div>
      <SectionHeader title="🌿 Pastagens" sub="Cadastro, gestão de ocupação e visualização no mapa"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Área Total" value={`${totalArea} ha`} color="#2d6a4f" icon="🗺️" trend={0}/>
        <KpiCard label="Pastagens"  value={`${pastagens.length} áreas`} color="#52b788" icon="🌿" trend={0}/>
        <KpiCard label="Em uso"     value={`${emUso} áreas`} color="#d4a017" icon="✅" trend={0}/>
        <KpiCard label="Ocupação"   value={`${totalUA} UA`}  color="#457b9d" icon="🐄" trend={0}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
        <TabBar tabs={[{id:"lista",label:"📋 Lista"},{id:"mapa",label:"🗺️ Mapa"}]} active={tab} onChange={setTab}/>
        <button onClick={abrirAdd} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600,marginBottom:18}}>+ Nova Pastagem</button>
      </div>

      {tab==="lista"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          {pastagens.map(p=>{
            const ocup=p.capacidade>0?p.atual/p.capacidade:0;
            const cs=corStatus(p.status);
            const ct=corTipo(p.tipo);
            return(
              <Card key={p.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>🌿 {p.nome}</div>
                    <div style={{display:"flex",gap:8,marginTop:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"#6b7280"}}>{p.area} ha</span>
                      <span style={{padding:"1px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:ct+"22",color:ct}}>{p.tipo}</span>
                      <span style={{padding:"1px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:cs+"22",color:cs}}>{p.status}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <BotaoEditar onClick={()=>abrirEdit(p)}/>
                    <button onClick={()=>setDemarcando(p)} style={{padding:"7px 10px",background:"none",color:"#457b9d",border:"1px solid #bfdbfe",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>📍 Mapa</button>
                    <BotaoPerigo onClick={()=>excluir(p.id,p.nome)}>🗑</BotaoPerigo>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:4}}>
                    <span>{p.atual}/{p.capacidade} UA ocupadas</span>
                    <span>{p.atual===0?"Vazio":`${Math.round(ocup*100)}%`}</span>
                  </div>
                  <div style={{height:10,background:"#f3f4f6",borderRadius:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(ocup*100,100)}%`,background:ocup>=0.9?"#dc2626":ocup>=0.5?"#2d6a4f":"#d4a017",borderRadius:5}}/>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,fontSize:11,color:"#6b7280"}}>
                  <span>🌱 {p.capim||"—"}</span>
                  <span>📅 Plantio: {p.dtPlantio||"—"}</span>
                  {p.lat?<span>📍 {Number(p.lat).toFixed(4)}, {Number(p.lng).toFixed(4)}</span>:<span style={{color:"#d4a017"}}>📍 Sem coordenadas</span>}
                  <span>⚡ {(p.capacidade/Math.max(p.area,1)).toFixed(1)} UA/ha</span>
                </div>
                {p.obs&&<div style={{marginTop:8,padding:"6px 10px",background:"#f0faf4",borderRadius:6,fontSize:11,color:"#374151"}}>{p.obs}</div>}
              </Card>
            );
          })}
        </div>
      )}

      {tab==="mapa"&&(
        <div>
          {!config?.mapsApiKey?(
            <div style={{padding:20,background:"#fffbeb",border:"1px solid #fcd34d",borderRadius:12,color:"#b45309",fontSize:13}}>
              ⚠️ Para visualizar o mapa, configure a chave da API do Google Maps em <strong>⚙️ Configurações</strong> (menu lateral, perfil Administrador).
            </div>
          ):(
            <div>
              <div ref={mapRef} style={{width:"100%",height:450,borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.15)"}}/>
              <div style={{marginTop:12,display:"flex",gap:12,flexWrap:"wrap",fontSize:12}}>
                {[["Em uso","#2d6a4f"],["Descanso","#457b9d"],["Em reforma","#d4a017"],["Vedado","#dc2626"],["Reserva","#9ca3af"]].map(([s,c])=>(
                  <div key={s} style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:12,height:12,borderRadius:"50%",background:c}}/>{s}</div>
                ))}
              </div>
              {!mapsLoaded&&<div style={{marginTop:10,fontSize:12,color:"#6b7280"}}>Carregando mapa...</div>}
            </div>
          )}
        </div>
      )}

      {modal==="form"&&(
        <Modal title={editItem?"Editar Pastagem":"Nova Pastagem"} onClose={fechar} largura={620}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Nome *","nome","text",true)}
            {F("Tipo","tipo","text",false,TIPO_PASTO)}
            {F("Área (ha) *","area","number",true)}
            {F("Capacidade (UA) *","capacidade","number",true)}
            {F("Ocupação atual (UA)","atual","number")}
            {F("Status","status","text",false,STATUS_PASTO)}
            {F("Tipo de capim","capim","text",false,CAPINS)}
            {F("Data de plantio (AAAA-MM)","dtPlantio","text")}
            {F("Latitude","lat","number")}
            {F("Longitude","lng","number")}
          </div>
          <Campo label="Observações" value={form.obs||""} onChange={v=>setForm({...form,obs:v})}/>
          {form.lat&&form.lng&&<div style={{padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12}}>📍 Coordenadas: {Number(form.lat).toFixed(4)}, {Number(form.lng).toFixed(4)}</div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {demarcando&&<ModalDemarcacao pastagem={demarcando} config={config} mapsLoaded={mapsLoaded} onClose={()=>setDemarcando(null)} onSalvar={salvarDemarcacao}/>}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

function FinanciamentosView({financiamentos,setFinanciamentos,despesas,setDespesas}){
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [confirm,setConfirm]=useState(null);
  const [selectedId,setSelectedId]=useState(null);
  const [tabAmort,setTabAmort]=useState("tabela");

  const abrirAdd=()=>{setEditItem(null);setForm({sistema:"SAC",tipo:"Custeio",status:"Ativo",dtContratacao:hoje(),pagamentos:[]});setModal("form");};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal("form");};
  const fechar=()=>{setModal(null);setEditItem(null);setForm({});};

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração?":"Confirmar cadastro do financiamento?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid(),valor:Number(form.valor||0),taxa:Number(form.taxa||0),carencia:Number(form.carencia||0),prazo:Number(form.prazo||0),pagamentos:form.pagamentos||[]};
      setFinanciamentos(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };

  const excluir=(id,nome)=>setConfirm({msg:`Excluir financiamento "${nome}"?`,danger:true,onSim:()=>{setFinanciamentos(prev=>prev.filter(x=>x.id!==id));setSelectedId(null);setConfirm(null);}});

  const F=(label,campo,type="text",required=false,opts=null)=>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={required} options={opts}/>;

  const selected=financiamentos.find(f=>f.id===selectedId);
  const tabAmortizacao=selected?(selected.sistema==="SAC"?calcTabelaSAC(selected):calcTabelaPRICE(selected)):[];
  const proxPendente=tabAmortizacao.find(p=>p.status==="Pendente");
  const pago=tabAmortizacao.filter(p=>p.status==="Pago").reduce((s,p)=>s+p.amortizacao,0);

  const totalDivida=financiamentos.filter(f=>f.status==="Ativo").reduce((s,f)=>s+f.valor,0);
  const totalParcMes=financiamentos.filter(f=>f.status==="Ativo").map(f=>{
    const tab=f.sistema==="SAC"?calcTabelaSAC(f):calcTabelaPRICE(f);
    const prox=tab.find(p=>p.status==="Pendente");
    return prox?prox.prestacao:0;
  }).reduce((s,v)=>s+v,0);

  const thS={padding:"8px 10px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9"};
  const tdS={padding:"8px 10px",fontSize:12,borderBottom:"1px solid #f3f4f6"};

  // Preview simulação
  const simValor=Number(form.valor||0);
  const simTab=simValor>0&&form.prazo>0?(form.sistema==="SAC"?calcTabelaSAC({...form,valor:simValor,taxa:Number(form.taxa||0),carencia:Number(form.carencia||0),prazo:Number(form.prazo||0)}):calcTabelaPRICE({...form,valor:simValor,taxa:Number(form.taxa||0),carencia:Number(form.carencia||0),prazo:Number(form.prazo||0)})):[];
  const simProx=simTab.find(p=>!p.tipo.includes("Car"))||simTab[0];

  return(
    <div>
      <SectionHeader title="🏦 Financiamentos" sub="Contratos, amortização SAC e PRICE, pagamentos e alertas"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Dívida Total (Ativo)"  value={fmt(totalDivida)}   color="#9333ea" icon="🏦" trend={-1}/>
        <KpiCard label="Contratos Ativos"       value={`${financiamentos.filter(f=>f.status==="Ativo").length} contratos`} color="#2d6a4f" icon="📄" trend={0}/>
        <KpiCard label="Parcela Mês Atual"      value={fmt(totalParcMes)} color="#e76f51" icon="💸" trend={-1}/>
        <KpiCard label="Total de Contratos"     value={`${financiamentos.length} contratos`} color="#457b9d" icon="📋" trend={0}/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:14}}>
        {/* Lista de contratos */}
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:13,fontWeight:700,color:"#1b4332"}}>Contratos</div>
            <button onClick={abrirAdd} style={{padding:"7px 14px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:12,fontWeight:600}}>+ Novo</button>
          </div>
          {financiamentos.map(f=>{
            const tab=f.sistema==="SAC"?calcTabelaSAC(f):calcTabelaPRICE(f);
            const prox=tab.find(p=>p.status==="Pendente");
            const ativo=selectedId===f.id;
            return(
              <div key={f.id} onClick={()=>setSelectedId(f.id)} style={{padding:12,borderRadius:10,marginBottom:8,cursor:"pointer",border:`2px solid ${ativo?"#2d6a4f":"#e5e7eb"}`,background:ativo?"#f0faf4":"white",transition:"all 0.15s"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e"}}>{f.banco}</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>{f.tipo} · {f.sistema}</div>
                    <div style={{fontSize:11,color:"#374151",marginTop:2}}>{f.finalidade}</div>
                  </div>
                  <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:f.status==="Ativo"?"#d8f3dc":"#fee2e2",color:f.status==="Ativo"?"#2d6a4f":"#dc2626"}}>{f.status}</span>
                </div>
                <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"#9333ea",fontWeight:700}}>{fmt(f.valor)}</span>
                  <span style={{color:"#6b7280"}}>{f.taxa}%a.a. · {f.prazo}m</span>
                </div>
                {prox&&<div style={{marginTop:4,fontSize:11,color:"#e76f51"}}>Próx: {prox.vencimento} · {fmt(prox.prestacao)}</div>}
                <div style={{display:"flex",gap:6,marginTop:8}}>
                  <button onClick={e=>{e.stopPropagation();abrirEdit(f);}} style={{padding:"4px 8px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:5,cursor:"pointer",fontSize:11}}>✏️</button>
                  <button onClick={e=>{e.stopPropagation();excluir(f.id,f.finalidade);}} style={{padding:"4px 8px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:5,cursor:"pointer",fontSize:11}}>🗑</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detalhe do contrato selecionado */}
        <div>
          {!selected?(
            <Card style={{display:"flex",alignItems:"center",justifyContent:"center",height:200,color:"#9ca3af",fontSize:14}}>
              Selecione um contrato para ver o plano de amortização
            </Card>
          ):(
            <div>
              <Card style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontSize:16,fontWeight:800,color:"#1b4332"}}>{selected.banco} — {selected.finalidade}</div>
                    <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{selected.tipo} · {selected.sistema} · {selected.taxa}% a.a. · Carência: {selected.carencia}m · Prazo: {selected.prazo}m</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>Garantias: {selected.garantias} · Contratado: {selected.dtContratacao}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:20,fontWeight:800,color:"#9333ea"}}>{fmt(selected.valor)}</div>
                    <div style={{fontSize:11,color:"#6b7280"}}>valor contratado</div>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:14}}>
                  {proxPendente&&<div style={{padding:10,background:"#fef3c7",borderRadius:8,textAlign:"center"}}><div style={{fontSize:11,color:"#b45309"}}>Próxima parcela</div><div style={{fontSize:14,fontWeight:700,color:"#92400e"}}>{fmt(proxPendente.prestacao)}</div><div style={{fontSize:11,color:"#b45309"}}>{proxPendente.vencimento}</div></div>}
                  <div style={{padding:10,background:"#f0faf4",borderRadius:8,textAlign:"center"}}><div style={{fontSize:11,color:"#2d6a4f"}}>Total juros</div><div style={{fontSize:14,fontWeight:700,color:"#1b4332"}}>{fmt(tabAmortizacao.reduce((s,p)=>s+p.juros,0))}</div></div>
                  <div style={{padding:10,background:"#f0faf4",borderRadius:8,textAlign:"center"}}><div style={{fontSize:11,color:"#2d6a4f"}}>Custo total</div><div style={{fontSize:14,fontWeight:700,color:"#1b4332"}}>{fmt(tabAmortizacao.reduce((s,p)=>s+p.prestacao,0))}</div></div>
                </div>
              </Card>

              <TabBar tabs={[{id:"tabela",label:"Tabela de Amortização"},{id:"grafico",label:"Gráfico"}]} active={tabAmort} onChange={setTabAmort}/>

              {tabAmort==="tabela"&&(
                <Card style={{padding:0,overflow:"hidden",maxHeight:350,overflowY:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse"}}>
                    <thead style={{position:"sticky",top:0}}>
                      <tr>{["#","Tipo","Vencimento","Saldo Dev.","Amortização","Juros","Prestação"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr>
                    </thead>
                    <tbody>{tabAmortizacao.map((p,i)=>(
                      <tr key={i} style={{background:p.tipo.includes("Car")?"#fef3c7":i%2?"#fafafa":"white"}}>
                        <td style={{...tdS,fontWeight:700}}>{p.parcela}</td>
                        <td style={tdS}><span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:p.tipo.includes("Car")?"#fcd34d22":"#d8f3dc",color:p.tipo.includes("Car")?"#b45309":"#2d6a4f",fontWeight:600}}>{p.tipo}</span></td>
                        <td style={{...tdS,color:"#6b7280"}}>{p.vencimento}</td>
                        <td style={tdS}>{fmt(p.saldo)}</td>
                        <td style={{...tdS,color:"#2d6a4f"}}>{fmt(p.amortizacao)}</td>
                        <td style={{...tdS,color:"#e76f51"}}>{fmt(p.juros)}</td>
                        <td style={{...tdS,fontWeight:700}}>{fmt(p.prestacao)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </Card>
              )}

              {tabAmort==="grafico"&&(
                <Card>
                  <CardTitle>Evolução do Saldo Devedor</CardTitle>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={tabAmortizacao.filter((_,i)=>i%Math.max(1,Math.floor(tabAmortizacao.length/20))===0)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis dataKey="parcela" tick={{fontSize:10}} tickFormatter={v=>`P${v}`}/>
                      <YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                      <Tooltip formatter={v=>fmt(v)}/>
                      <Legend wrapperStyle={{fontSize:11}}/>
                      <Area type="monotone" dataKey="saldo" name="Saldo Devedor" stroke="#9333ea" fill="#9333ea22" strokeWidth={2}/>
                      <Bar dataKey="prestacao" name="Prestação" fill="#e76f51"/>
                    </AreaChart>
                  </ResponsiveContainer>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>

      {modal==="form"&&(
        <Modal title={editItem?"Editar Financiamento":"Novo Financiamento"} onClose={fechar} largura={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Banco / Instituição *","banco","text",true)}
            {F("Tipo *","tipo","text",true,TIPO_FINANC)}
            {F("Finalidade *","finalidade","text",true)}
            {F("Valor (R$) *","valor","number",true)}
            {F("Taxa (% a.a.) *","taxa","number",true)}
            {F("Sistema de Amortização *","sistema","text",true,SISTEMA_AMORT)}
            {F("Carência (meses)","carencia","number")}
            {F("Prazo (meses) *","prazo","number",true)}
            {F("Data de Contratação","dtContratacao","date")}
            {F("Status","status","text",false,["Ativo","Encerrado","Em análise"])}
          </div>
          <Campo label="Garantias" value={form.garantias||""} onChange={v=>setForm({...form,garantias:v})}/>
          {simProx&&simValor>0&&(
            <div style={{padding:12,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:14}}>
              <div style={{fontWeight:700,marginBottom:4}}>📊 Simulação {form.sistema}</div>
              <div>1ª prestação normal: <strong>{fmt(simProx.prestacao)}</strong> · Total juros estimado: <strong>{fmt(simTab.reduce((s,p)=>s+p.juros,0))}</strong></div>
            </div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

function LancamentosView({producao,setProducao,despesas,setDespesas,receitas,setReceitas,funcionarios,setFuncionarios,animaisCorte,setAnimaisCorte,vacinas,setVacinas,onAdd,onUpdate,onDelete}){
  const [tab,setTab]=useState("producao");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});
  const fileRef=useRef();

  const TABLE_MAP={
    producao:["producao",setProducao,producao],
    despesas:["despesas",setDespesas,despesas],
    receitas:["receitas",setReceitas,receitas],
    funcionarios:["funcionarios",setFuncionarios,funcionarios],
    corte:["animais_corte",setAnimaisCorte,animaisCorte],
    sanitario:["vacinas",setVacinas,vacinas],
  };
  const abrirAdd=()=>{setEditItem(null);setForm({data:hoje()});setModal(tab);};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal(tab);};
  const fechar=()=>{setModal(null);setEditItem(null);setForm({});};

  const F=(label,campo,type="text",required=false,opts=null)=>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={required} options={opts}/>;

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração deste lançamento?":"Confirmar inclusão do novo lançamento?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid()};
      if(tab==="producao")    setProducao(prev   =>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="despesas")    setDespesas(prev   =>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="receitas")    setReceitas(prev   =>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="funcionarios")setFuncionarios(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,{...item,ativo:true}]);
      if(tab==="corte")       setAnimaisCorte(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="sanitario")   setVacinas(prev    =>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };

  const excluir=(id,nome)=>setConfirm({msg:`Excluir permanentemente "${nome}"? Esta ação não pode ser desfeita.`,danger:true,onSim:()=>{
    if(tab==="producao")    setProducao(prev    =>prev.filter(x=>x.id!==id));
    if(tab==="despesas")    setDespesas(prev    =>prev.filter(x=>x.id!==id));
    if(tab==="receitas")    setReceitas(prev    =>prev.filter(x=>x.id!==id));
    if(tab==="funcionarios")setFuncionarios(prev=>prev.filter(x=>x.id!==id));
    if(tab==="corte")       setAnimaisCorte(prev=>prev.filter(x=>x.id!==id));
    if(tab==="sanitario")   setVacinas(prev     =>prev.filter(x=>x.id!==id));
    setConfirm(null);
  }});

  const handleNFUpload=e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>setForm(f=>({...f,nf:{nome:file.name,tamanho:`${(file.size/1024).toFixed(0)} KB`,url:ev.target.result}}));
    reader.readAsDataURL(file);
  };

  const thS={padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9"};
  const tdS={padding:"9px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6"};
  const BotaoAdd=({label})=><button onClick={abrirAdd} style={{display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>+ {label}</button>;
  const subcatOpts=form.categoria?(CATEGORIAS_DESPESA[form.categoria]||[]):[];

  return(
    <div>
      <SectionHeader title="Lançamentos" sub="Cadastro, edição e exclusão de todos os registros da fazenda"/>
      <TabBar tabs={[{id:"producao",label:"🌾 Produção"},{id:"despesas",label:"💸 Despesas"},{id:"receitas",label:"💰 Receitas"},{id:"funcionarios",label:"👥 Funcionários"},{id:"corte",label:"🐂 Gado Corte"},{id:"sanitario",label:"💉 Sanitário"}]} active={tab} onChange={setTab}/>

      {tab==="producao"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Produção"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Mês/Data","Cacau (kg)","Leite (L)","Coco (un)","Responsável","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...producao].sort((a,b)=>b.data.localeCompare(a.data)).map((p,i)=>(
              <tr key={p.id} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{...tdS,fontWeight:600}}>{p.mes||p.data}</td>
                <td style={tdS}>{fmtN(p.cacauKg)} kg</td>
                <td style={tdS}>{fmtN(p.leiteL)} L</td>
                <td style={tdS}>{fmtN(p.cocoUn)} un</td>
                <td style={{...tdS,color:"#6b7280"}}>{p.responsavel}</td>
                <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(p)}/><BotaoPerigo onClick={()=>excluir(p.id,p.mes||p.data)}>🗑 Excluir</BotaoPerigo></div></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      </>)}

      {tab==="despesas"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Despesa"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Categoria","Subcategoria","Descrição","Fornecedor","Valor","NF","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...despesas].sort((a,b)=>b.data.localeCompare(a.data)).map((d,i)=>(
              <tr key={d.id} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{...tdS,color:"#6b7280"}}>{d.data}</td>
                <td style={tdS}>{d.categoria}</td>
                <td style={{...tdS,color:"#6b7280"}}>{d.subcategoria}</td>
                <td style={tdS}>{d.descricao}</td>
                <td style={{...tdS,color:"#6b7280"}}>{d.fornecedor}</td>
                <td style={{...tdS,fontWeight:700,color:"#e76f51"}}>{fmt(d.valor)}</td>
                <td style={tdS}>{d.nf?<a href={d.nf.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#2d6a4f",textDecoration:"none",fontWeight:600}}>📄 {d.nf.nome}</a>:<span style={{color:"#9ca3af",fontSize:11}}>—</span>}</td>
                <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(d)}/><BotaoPerigo onClick={()=>excluir(d.id,d.descricao)}>🗑</BotaoPerigo></div></td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={5} style={{padding:"9px 12px",color:"#95d5b2",fontWeight:700}}>Total</td>
              <td style={{padding:"9px 12px",color:"white",fontWeight:800}}>{fmt(despesas.reduce((s,d)=>s+Number(d.valor||0),0))}</td>
              <td colSpan={2}/>
            </tr></tfoot>
          </table>
        </Card>
      </>)}

      {tab==="receitas"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Receita"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Atividade","Qtd/Detalhes","Unitário","Valor","Comprador","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
              <tr key={r.id} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{...tdS,color:"#6b7280"}}>{r.data}</td>
                <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{r.atividade}</td>
                <td style={tdS}>{r.qtd}</td>
                <td style={tdS}>{r.unitario}</td>
                <td style={{...tdS,fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</td>
                <td style={{...tdS,color:"#6b7280"}}>{r.comprador}</td>
                <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(r)}/><BotaoPerigo onClick={()=>excluir(r.id,r.atividade+" "+r.data)}>🗑</BotaoPerigo></div></td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={4} style={{padding:"9px 12px",color:"#95d5b2",fontWeight:700}}>Total</td>
              <td style={{padding:"9px 12px",color:"white",fontWeight:800}}>{fmt(receitas.reduce((s,r)=>s+Number(r.valor||0),0))}</td>
              <td colSpan={2}/>
            </tr></tfoot>
          </table>
        </Card>
      </>)}

      {tab==="funcionarios"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Funcionário"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Nome","Cargo","Atividade","Salário","Filhos","Sal. Família","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{funcionarios.map((f,i)=>{
              const sf=calcSalFamilia(f.salario,f.numFilhos||0);
              return(
                <tr key={f.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:600}}>{f.nome}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{f.cargo}</td>
                  <td style={tdS}>{f.atividade}</td>
                  <td style={tdS}>{fmt(f.salario)}</td>
                  <td style={{...tdS,textAlign:"center"}}>{f.numFilhos||0}</td>
                  <td style={{...tdS,color:"#2d6a4f",fontWeight:sf>0?600:400}}>{sf>0?fmt(sf):"—"}</td>
                  <td style={tdS}><span style={{padding:"2px 9px",borderRadius:8,fontSize:11,fontWeight:600,background:f.ativo!==false?"#d8f3dc":"#fee2e2",color:f.ativo!==false?"#2d6a4f":"#dc2626"}}>{f.ativo!==false?"Ativo":"Inativo"}</span></td>
                  <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(f)}/><BotaoPerigo onClick={()=>excluir(f.id,f.nome)}>🗑</BotaoPerigo></div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      </>)}

      {tab==="corte"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Animal"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Brinco","Categoria","Peso Prev.(kg)","Peso Atual(kg)","Arroba est.","Entrada","Prev. Abate","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{animaisCorte.map((a,i)=>{
              const cor=a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
              const bg =a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
              return(
                <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:700}}>{a.brinco}</td>
                  <td style={tdS}>{a.categoria}</td>
                  <td style={tdS}>{a.pesoPrev} kg</td>
                  <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</td>
                  <td style={{...tdS,color:"#d4a017",fontWeight:600}}>{(a.pesoAtual/15).toFixed(1)} @</td>
                  <td style={{...tdS,color:"#6b7280"}}>{a.dtEntrada}</td>
                  <td style={tdS}>{a.previsaoAbate}</td>
                  <td style={tdS}><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor}}>{a.status}</span></td>
                  <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(a)}/><BotaoPerigo onClick={()=>excluir(a.id,a.brinco)}>🗑</BotaoPerigo></div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      </>)}

      {tab==="sanitario"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Evento Sanitário"/></div>
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Rebanho","Lote","Vacina/Procedimento","Qtd","Custo","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{
              const pend=v.status==="Pendente";
              return(
                <tr key={v.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</td>
                  <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f"}}>{v.rebanho}</span></td>
                  <td style={tdS}>{v.lote}</td>
                  <td style={tdS}>{v.vacina}</td>
                  <td style={tdS}>{v.qtd} cab.</td>
                  <td style={tdS}>{fmt(v.custo)}</td>
                  <td style={tdS}><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f"}}>{v.status}</span></td>
                  <td style={tdS}><div style={{display:"flex",gap:6}}><BotaoEditar onClick={()=>abrirEdit(v)}/><BotaoPerigo onClick={()=>excluir(v.id,v.vacina)}>🗑</BotaoPerigo></div></td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      </>)}

      {/* Modais de formulário */}
      {modal==="producao"&&(
        <Modal title={editItem?"Editar Produção":"Nova Produção"} onClose={fechar} largura={520}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Data *","data","date",true)}{F("Mês de referência","mes","text")}
            {F("Cacau (kg) *","cacauKg","number",true)}{F("Leite (L) *","leiteL","number",true)}
            {F("Coco (un) *","cocoUn","number",true)}{F("Responsável","responsavel","text")}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {modal==="despesas"&&(
        <Modal title={editItem?"Editar Despesa":"Nova Despesa"} onClose={fechar} largura={600}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Data *","data","date",true)}{F("Categoria *","categoria","text",true,Object.keys(CATEGORIAS_DESPESA))}
            {subcatOpts.length>0&&F("Subcategoria","subcategoria","text",false,subcatOpts)}
            {F("Valor (R$) *","valor","number",true)}{F("Descrição *","descricao","text",true)}{F("Fornecedor","fornecedor","text")}
          </div>
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Nota Fiscal (PDF ou imagem)</label>
            <input type="file" accept=".pdf,image/*" ref={fileRef} onChange={handleNFUpload} style={{fontSize:13}}/>
            {form.nf&&<div style={{marginTop:6,padding:"6px 10px",background:"#f0faf4",borderRadius:6,fontSize:12,color:"#2d6a4f"}}>📄 {form.nf.nome} — {form.nf.tamanho}</div>}
            <div style={{marginTop:4,fontSize:11,color:"#9ca3af"}}>⚠️ Arquivos ficam disponíveis apenas nesta sessão.</div>
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {modal==="receitas"&&(
        <Modal title={editItem?"Editar Receita":"Nova Receita"} onClose={fechar} largura={520}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Data *","data","date",true)}{F("Atividade *","atividade","text",true,["Cacau","Leite","Coco","Gado Corte","Outros"])}
            {F("Valor (R$) *","valor","number",true)}{F("Qtd / Detalhes","qtd","text")}
            {F("Valor Unitário","unitario","text")}{F("Comprador","comprador","text")}
          </div>
          <Campo label="Observações" value={form.obs||""} onChange={v=>setForm({...form,obs:v})}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {modal==="funcionarios"&&(
        <Modal title={editItem?"Editar Funcionário":"Novo Funcionário"} onClose={fechar} largura={560}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Nome completo *","nome","text",true)}{F("Cargo *","cargo","text",true)}
            {F("Atividade","atividade","text",false,["Geral","Cacau","Coco","Leiteiro","Gado Corte"])}
            {F("Salário Bruto (R$) *","salario","number",true)}
            {F("Nº filhos (salário família)","numFilhos","number")}
          </div>
          {Number(form.salario||0)<=1906.04&&Number(form.numFilhos||0)>0&&(
            <div style={{padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12}}>✅ Salário família: {fmt(calcSalFamilia(Number(form.salario),Number(form.numFilhos)))} ({form.numFilhos} filho(s) × R$ 65,00)</div>
          )}
          {Number(form.salario||0)>1906.04&&Number(form.numFilhos||0)>0&&(
            <div style={{padding:10,background:"#fffbeb",borderRadius:8,fontSize:12,color:"#b45309",marginBottom:12}}>⚠️ Salário acima de R$ 1.906,04 — sem direito ao salário família.</div>
          )}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {modal==="corte"&&(
        <Modal title={editItem?"Editar Animal":"Novo Animal — Gado de Corte"} onClose={fechar} largura={580}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Brinco *","brinco","text",true)}{F("Categoria","categoria","text",false,["Boi Gordo","Garrote","Novilha","Bezerro Rec."])}
            {F("Peso de entrada (kg)","pesoPrev","number")}{F("Peso atual (kg) *","pesoAtual","number",true)}
            {F("Data de entrada","dtEntrada","text")}{F("Prev. abate","previsaoAbate","text")}
            {F("Pasto / Local","pasto","text")}{F("Status","status","text",false,["Em engorda","Pronto p/ Abate","Recria"])}
            {F("Custo de aquisição (R$)","custoAquisicao","number")}
          </div>
          {form.pesoAtual&&<div style={{padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12}}>Arrobas estimadas: <strong>{(Number(form.pesoAtual)/15).toFixed(1)} @</strong> · Receita estimada: <strong>{fmt((Number(form.pesoAtual)/15)*325)}</strong></div>}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {modal==="sanitario"&&(
        <Modal title={editItem?"Editar Evento Sanitário":"Novo Evento Sanitário"} onClose={fechar} largura={540}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Data *","data","date",true)}{F("Rebanho *","rebanho","text",true,["Leiteiro","Corte","Ambos"])}
            {F("Lote / Grupo","lote","text")}{F("Vacina / Procedimento *","vacina","text",true)}
            {F("Qtd animais","qtd","number")}{F("Custo total (R$)","custo","number")}
            {F("Status","status","text",false,["Pendente","Realizado","Cancelado"])}
          </div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── USUÁRIOS ──────────────────────────────────────────────
function UsuariosView({perfis,perfilUser,fazendaId,onRecarregar}){
  const [confirm,setConfirm]=useState(null);
  const nivelCor=p=>p==="Administrador"?"#1b4332":p==="Gerente"?"#457b9d":p==="Financeiro"?"#d4a017":"#52b788";

  const alterarPerfil=async(perfil,novoPerfil)=>{
    await supabase.from("perfis").update({perfil:novoPerfil}).eq("id",perfil.id);
    onRecarregar();
  };
  const alterarStatus=async(perfil)=>{
    await supabase.from("perfis").update({ativo:!perfil.ativo}).eq("id",perfil.id);
    onRecarregar();
  };

  return(
    <div>
      <SecHeader title="Usuários da Fazenda" sub="Gerencie os colaboradores com acesso ao sistema"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:20}}>
        {NIVEIS.map(n=>(
          <div key={n} style={{padding:"10px 14px",background:"white",borderRadius:10,borderLeft:`3px solid ${nivelCor(n)}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,color:"#6b7280"}}>{n}</div>
            <div style={{fontSize:18,fontWeight:700,color:nivelCor(n)}}>{perfis.filter(u=>u.perfil===n).length}</div>
          </div>
        ))}
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500}}>
            <thead><tr>{["Nome","Perfil","Status","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>{perfis.map((u,i)=>(
              <tr key={u.id} style={{background:i%2?"#fafafa":"white"}}>
                <TD style={{fontWeight:600}}>{u.nome}</TD>
                <TD>
                  {perfilUser?.perfil==="Administrador"&&u.id!==perfilUser.id
                    ?<select value={u.perfil} onChange={e=>alterarPerfil(u,e.target.value)} style={{padding:"4px 8px",borderRadius:6,border:"1px solid #d1d5db",fontSize:12,background:nivelCor(u.perfil)+"22",color:nivelCor(u.perfil),fontWeight:600}}>
                       {NIVEIS.map(n=><option key={n} value={n}>{n}</option>)}
                     </select>
                    :<span style={{padding:"3px 10px",borderRadius:10,fontSize:12,fontWeight:700,background:nivelCor(u.perfil)+"22",color:nivelCor(u.perfil)}}>{u.perfil}</span>
                  }
                </TD>
                <TD>
                  <button onClick={()=>alterarStatus(u)} disabled={u.id===perfilUser?.id} style={{padding:"3px 10px",borderRadius:8,fontSize:11,fontWeight:600,background:u.ativo?"#d8f3dc":"#fee2e2",color:u.ativo?"#2d6a4f":"#dc2626",border:"none",cursor:u.id===perfilUser?.id?"default":"pointer"}}>
                    {u.ativo?"Ativo":"Inativo"}
                  </button>
                </TD>
                <TD>
                  {u.id===perfilUser?.id
                    ?<span style={{fontSize:12,color:"#9ca3af"}}>você</span>
                    :<span style={{fontSize:11,color:"#9ca3af"}}>—</span>
                  }
                </TD>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </Card>
      <Card style={{marginTop:14,background:"#f8faf9"}}>
        <CardTitle>ℹ️ Como adicionar colaboradores</CardTitle>
        <p style={{fontSize:13,color:"#6b7280",lineHeight:1.6}}>Para adicionar um colaborador, peça para ele criar uma conta no sistema usando o e-mail e selecionar a mesma fazenda — ou aguarde a funcionalidade de convite por e-mail (em breve).</p>
      </Card>
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── CONFIGURAÇÕES ──────────────────────────────────────────
function ConfiguracoesView({config,setConfig,fazendaId,fazenda}){
  const mob=useResponsive();
  const [form,setForm]=useState({...config});
  const [salvo,setSalvo]=useState(false);
  const [loading,setLoading]=useState(false);

  const salvar=async()=>{
    setLoading(true);
    const newConfig={
      nomeFazenda:form.nomeFazenda||fazenda?.nome||"Minha Fazenda",
      precoCacau:Number(form.precoCacau)||18,
      precoLeite:Number(form.precoLeite)||2.80,
      precoCoco:Number(form.precoCoco)||2.50,
      precoArroba:Number(form.precoArroba)||325,
    };
    setConfig(newConfig);
    await supabase.from("config_fazenda").upsert({
      fazenda_id:fazendaId,
      nome_fazenda:newConfig.nomeFazenda,
      preco_cacau:newConfig.precoCacau,
      preco_leite:newConfig.precoLeite,
      preco_coco:newConfig.precoCoco,
      preco_arroba:newConfig.precoArroba,
      atualizado_em:new Date().toISOString(),
    });
    setSalvo(true);setTimeout(()=>setSalvo(false),3000);
    setLoading(false);
  };

  const F=(label,campo,type="text",ph="")=><Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} placeholder={ph}/>;

  return(
    <div>
      <SecHeader title="⚙️ Configurações do Sistema" sub="Apenas Administradores têm acesso"/>
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:20}}>
        <div>
          <Card style={{marginBottom:16}}>
            <CardTitle>🌱 Identificação da Fazenda</CardTitle>
            {F("Nome da fazenda","nomeFazenda","text","Ex: Fazenda Analu & Ana")}
          </Card>
          <Card>
            <CardTitle>💰 Preços Base das Commodities</CardTitle>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:14,padding:"10px 12px",background:"#f0faf4",borderRadius:8,lineHeight:1.6}}>
              Atualize conforme negociação com compradores. Os cálculos de receita e lucro do Dashboard serão recalculados automaticamente.
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
              {F("🍫 Cacau (R$/kg)","precoCacau","number","18.00")}
              {F("🥛 Leite (R$/litro)","precoLeite","number","2.80")}
              {F("🥥 Coco (R$/unidade)","precoCoco","number","2.50")}
              {F("🐂 Arroba do Boi (R$/@)","precoArroba","number","325.00")}
            </div>
          </Card>
        </div>
        <Card>
          <CardTitle>ℹ️ Sobre o Sistema</CardTitle>
          {[["Versão","v4.0 — Abr/2025"],["Backend","Supabase (PostgreSQL)"],["Autenticação","Supabase Auth"],["Módulos","Dashboard, Financeiro, Produção, Manejo, Pastagens, Financiamentos, Lançamentos, Usuários"],["INSS 2025","Progressivo (Port. MPS/MF nº6/2025)"],["Sal. Família","R$ 65,00/filho para sal. ≤ R$ 1.906,04"]].map(([l,v],i)=>(
            <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div style={{fontSize:11,color:"#6b7280"}}>{l}</div>
              <div style={{fontSize:12,color:"#374151",marginTop:2}}>{v}</div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        {salvo&&<span style={{padding:"9px 16px",background:"#d8f3dc",borderRadius:8,fontSize:13,color:"#1b4332",fontWeight:600}}>✅ Configurações salvas!</span>}
        <BotaoP onClick={salvar} disabled={loading}>{loading?"⏳ Salvando…":"💾 Salvar Configurações"}</BotaoP>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────
export default function App(){
  const mob=useResponsive();
  const [menuAberto,setMenuAberto]=useState(false);
  const [loading,setLoading]=useState(true);
  const [session,setSession]=useState(null);
  const [perfilUser,setPerfilUser]=useState(null);
  const [fazenda,setFazenda]=useState(null);
  const [perfis,setPerfis]=useState([]);
  const [menu,setMenu]=useState("dashboard");

  // Dados
  const [config,setConfig]=useState({nomeFazenda:"",precoCacau:18,precoLeite:2.80,precoCoco:2.50,precoArroba:325});
  const [funcionarios,setFuncionarios]=useState([]);
  const [producao,setProducao]=useState([]);
  const [despesas,setDespesas]=useState([]);
  const [receitas,setReceitas]=useState([]);
  const [animaisLeiteiro,setAnimaisLeiteiro]=useState([]);
  const [animaisCorte,setAnimaisCorte]=useState([]);
  const [vacinas,setVacinas]=useState([]);
  const [pastagens,setPastagens]=useState([]);
  const [financiamentos,setFinanciamentos]=useState([]);

  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setSession(session);
      if(session) carregarTudo(session.user.id);
      else setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,session)=>{
      setSession(session);
      if(session&&(event==="SIGNED_IN"||event==="TOKEN_REFRESHED")) carregarTudo(session.user.id);
      if(event==="SIGNED_OUT"){ setPerfilUser(null);setFazenda(null);setPerfis([]);setLoading(false); }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  const carregarTudo=async(userId)=>{
    setLoading(true);
    const {data:perfil}=await supabase.from("perfis").select("*, fazendas(*)").eq("user_id",userId).single();
    if(!perfil){setLoading(false);return;}
    setPerfilUser(perfil);
    setFazenda(perfil.fazendas);
    const fazId=perfil.fazenda_id;
    // Carregar perfis da fazenda
    const {data:todosP}=await supabase.from("perfis").select("*").eq("fazenda_id",fazId);
    setPerfis(todosP||[]);
    // Carregar todos os dados
    const rs=await Promise.all([
      supabase.from("producao").select("*").eq("fazenda_id",fazId).order("data",{ascending:false}),
      supabase.from("despesas").select("*").eq("fazenda_id",fazId).order("data",{ascending:false}),
      supabase.from("receitas").select("*").eq("fazenda_id",fazId).order("data",{ascending:false}),
      supabase.from("funcionarios").select("*").eq("fazenda_id",fazId),
      supabase.from("pastagens").select("*").eq("fazenda_id",fazId),
      supabase.from("financiamentos").select("*").eq("fazenda_id",fazId),
      supabase.from("animais_leiteiro").select("*").eq("fazenda_id",fazId),
      supabase.from("animais_corte").select("*").eq("fazenda_id",fazId),
      supabase.from("vacinas").select("*").eq("fazenda_id",fazId).order("data"),
      supabase.from("config_fazenda").select("*").eq("fazenda_id",fazId).single(),
    ]);
    const [prod,desp,rec,func,past,fin,animL,animC,vac,cfg]=rs.map(r=>r.data);
    setProducao((prod||[]).map(toCamel));
    setDespesas((desp||[]).map(toCamel));
    setReceitas((rec||[]).map(toCamel));
    setFuncionarios((func||[]).map(toCamel));
    setPastagens((past||[]).map(toCamel));
    setFinanciamentos((fin||[]).map(toCamel));
    setAnimaisLeiteiro((animL||[]).map(toCamel));
    setAnimaisCorte((animC||[]).map(toCamel));
    setVacinas((vac||[]).map(toCamel));
    if(cfg) setConfig(c=>({...c,...toCamel(cfg)}));
    setLoading(false);
  };

  const fazendaId=fazenda?.id;

  // Helpers Supabase CRUD (otimistas)
  const sbAdd=async(table,data,setState)=>{
    const row={...toSnake(data),fazenda_id:fazendaId};
    delete row.id;
    const {data:result,error}=await supabase.from(table).insert(row).select().single();
    if(!error&&result) setState(prev=>[...prev,{...data,...toCamel(result)}]);
    else if(error) console.error("sbAdd error:",error);
  };
  const sbUpdate=async(table,data,setState)=>{
    setState(prev=>prev.map(x=>x.id===data.id?data:x));
    const {error}=await supabase.from(table).update(toSnake(data)).eq("id",data.id);
    if(error) console.error("sbUpdate error:",error);
  };
  const sbDelete=async(table,id,setState)=>{
    setState(prev=>prev.filter(x=>x.id!==id));
    const {error}=await supabase.from(table).delete().eq("id",id);
    if(error) console.error("sbDelete error:",error);
  };

  // Estados de loading/auth
  if(loading) return <Loading msg="Carregando FazendaGest…"/>;
  if(!session) return <LoginView/>;
  if(!fazenda) return <CriarFazendaView session={session} onCriada={()=>carregarTudo(session.user.id)}/>;

  const precos={cacau:config.precoCacau||18,leite:config.precoLeite||2.80,coco:config.precoCoco||2.50,arroba:config.precoArroba||325};

  const MENU_ITEMS=[
    {id:"dashboard",     label:"Dashboard",        icon:"🏠"},
    {id:"financeiro",    label:"Financeiro",        icon:"💰"},
    {id:"producao",      label:"Produção",          icon:"📊"},
    {id:"manejo",        label:"Manejo Pecuário",   icon:"🐄"},
    {id:"pastagens",     label:"Pastagens",         icon:"🌿"},
    {id:"financiamentos",label:"Financiamentos",    icon:"🏦"},
    {id:"lancamentos",   label:"Lançamentos",       icon:"✏️"},
    {id:"usuarios",      label:"Usuários",          icon:"👥"},
    {id:"configuracoes", label:"Configurações",     icon:"⚙️"},
    {id:"perfil",        label:"Meu Perfil",        icon:"👤"},
  ].filter(it=>temAcesso(perfilUser?.perfil,it.id));

  const nivelCor=p=>p==="Administrador"?"#95d5b2":p==="Gerente"?"#a8dadc":p==="Financeiro"?"#ffd166":"#b7e4c7";

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f0f4f1",fontSize:14}}>
      {mob&&menuAberto&&<div onClick={()=>setMenuAberto(false)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:90}}/>}
      <div style={{width:mob?180:215,background:"#1b4332",color:"white",display:"flex",flexDirection:"column",flexShrink:0,position:mob?"fixed":"relative",height:"100vh",zIndex:mob?100:1,left:mob&&!menuAberto?-180:0,transition:"left 0.25s ease"}}>
        <div style={{padding:"14px 16px 10px",borderBottom:"1px solid #2d6a4f",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:12,fontWeight:800,color:"#95d5b2"}}>🌱 {config.nomeFazenda||fazenda?.nome||"FazendaGest"}</div>
            <div style={{fontSize:9,color:"#74c69d",marginTop:1}}>Cacau · Leite · Coco · Gado</div>
          </div>
          {mob&&<button onClick={()=>setMenuAberto(false)} style={{background:"none",border:"none",color:"#b7e4c7",fontSize:18,cursor:"pointer",padding:4}}>✕</button>}
        </div>
        <nav style={{padding:"8px 0",flex:1,overflowY:"auto"}}>
          {MENU_ITEMS.map(it=>(
            <button key={it.id} onClick={()=>{setMenu(it.id);setMenuAberto(false);}} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 16px",border:"none",cursor:"pointer",background:menu===it.id?"#2d6a4f":"transparent",color:menu===it.id?"#d8f3dc":"#b7e4c7",fontSize:12,fontWeight:menu===it.id?700:400,textAlign:"left",borderLeft:`3px solid ${menu===it.id?"#52b788":"transparent"}`}}>
              <span>{it.icon}</span>{it.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"10px 16px",borderTop:"1px solid #2d6a4f"}}>
          <div style={{fontSize:11,color:nivelCor(perfilUser?.perfil),fontWeight:700}}>👤 {perfilUser?.nome}</div>
          <div style={{fontSize:10,color:"#74c69d",marginTop:2}}>{perfilUser?.perfil}</div>
          <button onClick={()=>supabase.auth.signOut()} style={{marginTop:8,width:"100%",padding:"7px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#b7e4c7",fontSize:11,cursor:"pointer",fontWeight:600}}>🚪 Sair</button>
          <div style={{fontSize:9,color:"#52b788",marginTop:4}}>v4.0 · Abr/2025</div>
        </div>
      </div>

      <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
        {mob&&(
          <div style={{background:"#1b4332",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0}}>
            <button onClick={()=>setMenuAberto(true)} style={{background:"none",border:"none",color:"white",fontSize:22,cursor:"pointer",padding:0,lineHeight:1}}>☰</button>
            <span style={{color:"#95d5b2",fontWeight:700,fontSize:13}}>🌱 {config.nomeFazenda||fazenda?.nome}</span>
            <span style={{color:"#74c69d",fontSize:11,marginLeft:"auto"}}>{MENU_ITEMS.find(m=>m.id===menu)?.label}</span>
          </div>
        )}
        <div style={{flex:1,overflow:"auto",padding:mob?14:22}}>
          {menu==="dashboard"      &&<DashboardView funcionarios={funcionarios} producao={producao} despesas={despesas} receitas={receitas} financiamentos={financiamentos} precos={precos}/>}
          {menu==="financeiro"     &&<FinanceiroView funcionarios={funcionarios} despesas={despesas} receitas={receitas}/>}
          {menu==="producao"       &&<ProducaoView producao={producao} precos={precos}/>}
          {menu==="manejo"         &&<ManejoView animaisLeiteiro={animaisLeiteiro} animaisCorte={animaisCorte} vacinas={vacinas} pastagens={pastagens}/>}
          {menu==="pastagens"      &&<PastagensView pastagens={pastagens} setPastagens={setPastagens} config={config} fazendaId={fazendaId} onAdd={sbAdd} onUpdate={sbUpdate} onDelete={sbDelete}/>}
          {menu==="financiamentos" &&<FinanciamentosView financiamentos={financiamentos} setFinanciamentos={setFinanciamentos} despesas={despesas} setDespesas={setDespesas} fazendaId={fazendaId} onAdd={sbAdd} onUpdate={sbUpdate} onDelete={sbDelete}/>}
          {menu==="lancamentos"    &&<LancamentosView producao={producao} setProducao={setProducao} despesas={despesas} setDespesas={setDespesas} receitas={receitas} setReceitas={setReceitas} funcionarios={funcionarios} setFuncionarios={setFuncionarios} animaisCorte={animaisCorte} setAnimaisCorte={setAnimaisCorte} vacinas={vacinas} setVacinas={setVacinas} onAdd={sbAdd} onUpdate={sbUpdate} onDelete={sbDelete}/>}
          {menu==="usuarios"       &&<UsuariosView perfis={perfis} perfilUser={perfilUser} fazendaId={fazendaId} onRecarregar={()=>carregarTudo(session.user.id)}/>}
          {menu==="configuracoes"  &&<ConfiguracoesView config={config} setConfig={setConfig} fazendaId={fazendaId} fazenda={fazenda}/>}
          {menu==="perfil"         &&<PerfilView session={session} perfilUser={perfilUser} fazenda={fazenda} onAtualizado={()=>carregarTudo(session.user.id)}/>}
        </div>
      </div>
    </div>
  );
}
