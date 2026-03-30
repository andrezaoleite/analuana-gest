import { useState, useRef, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#2d6a4f","#52b788","#d4a017","#e76f51","#457b9d","#a8dadc","#f4a261","#264653"];
const PC=18, PL=2.80, PCO=2.50;
const NIVEIS = ["Administrador","Gerente","Financeiro","Operacional"];
const CAPINS = ["Brachiaria brizantha","Brachiaria decumbens","Brachiaria ruziziensis","Panicum maximum (Mombaça)","Panicum maximum (Tanzania)","Panicum maximum (Massai)","Cynodon (Tifton 85)","Andropogon gayanus","Pennisetum purpureum (Napier)","Megathyrsus maximus (BRS Quênia)","Piatã","Xaraés","Marandu","Nativo/Misto"];
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

const fmt  = n => `R$ ${Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtN = n => Number(n||0).toLocaleString("pt-BR");
const hoje = () => new Date().toISOString().slice(0,10);
const uid  = () => Date.now() + Math.random();
function fmtData(d){ if(!d) return "—"; return new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"numeric"}); }
function addMeses(dtStr,n){ if(!dtStr) return "—"; const d=new Date(dtStr+"T12:00:00"); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,7); }

function calcINSSEmpregado(s){
  const faixas=[[1518,0.075],[2793.88,0.09],[4190.83,0.12],[8157.41,0.14]];
  let inss=0,ant=0;
  for(const [teto,aliq] of faixas){ if(s<=ant) break; inss+=(Math.min(s,teto)-ant)*aliq; ant=teto; if(s<=teto) break; }
  return inss;
}
const calcSalFamilia=(sal,filhos)=>sal<=1906.04?65*filhos:0;

const temAcesso=(perfil,modulo)=>{
  const mapa={
    Administrador:["dashboard","financeiro","producao","manejo","lancamentos","pastagens","financiamentos","usuarios","configuracoes"],
    Gerente:      ["dashboard","producao","manejo","lancamentos","pastagens"],
    Financeiro:   ["dashboard","financeiro","lancamentos","financiamentos"],
    Operacional:  ["producao","manejo","lancamentos"],
  };
  return (mapa[perfil]||[]).includes(modulo);
};

function calcTabelaSAC(f){
  const tm=(f.taxa||0)/100/12;
  const pa=Math.max(1,(f.prazo||1)-(f.carencia||0));
  const am=(f.valor||0)/pa;
  const tab=[];let s=f.valor||0;
  for(let i=1;i<=(f.prazo||1);i++){
    const j=s*tm; const ic=i<=(f.carencia||0);
    const a=ic?0:am; const p=ic?j:a+j;
    tab.push({parcela:i,tipo:ic?"Carência":"Normal",saldo:Math.max(0,s),amortizacao:a,juros:j,prestacao:p,vencimento:addMeses(f.dtContratacao,i),status:"Pendente"});
    s=Math.max(0,s-a);
  }
  return tab;
}

function calcTabelaPRICE(f){
  const tm=(f.taxa||0)/100/12;
  const n=Math.max(1,(f.prazo||1)-(f.carencia||0));
  const pmt=tm>0?(f.valor||0)*(tm*Math.pow(1+tm,n))/(Math.pow(1+tm,n)-1):(f.valor||0)/n;
  const tab=[];let s=f.valor||0;
  for(let i=1;i<=(f.prazo||1);i++){
    const j=s*tm; const ic=i<=(f.carencia||0);
    const a=ic?0:Math.max(0,pmt-j); const p=ic?j:pmt;
    tab.push({parcela:i,tipo:ic?"Carência":"Normal",saldo:Math.max(0,s),amortizacao:a,juros:j,prestacao:p,vencimento:addMeses(f.dtContratacao,i),status:"Pendente"});
    s=Math.max(0,s-a);
  }
  return tab;
}

const CONFIG_INIT={nomeFazenda:"Fazenda Analauna",mapsApiKey:"",lat:-14.86,lng:-39.26,zoom:14};

const USUARIOS_INIT=[
  {id:1,usuario:"admin",   senha:"fazenda2025",nome:"Administrador",  perfil:"Administrador",ativo:true},
  {id:2,usuario:"gerente", senha:"gerente123", nome:"José da Silva",  perfil:"Gerente",      ativo:true},
  {id:3,usuario:"contador",senha:"contabil@1", nome:"Contador",       perfil:"Financeiro",   ativo:true},
];
const FUNCIONARIOS_INIT=[
  {id:1, nome:"José da Silva",  cargo:"Gerente de Campo",  salario:3800,atividade:"Geral",     numFilhos:2,ativo:true},
  {id:2, nome:"Maria Oliveira", cargo:"Ordenhadeira",      salario:1800,atividade:"Leiteiro",  numFilhos:1,ativo:true},
  {id:3, nome:"Carlos Santos",  cargo:"Trabalhador Rural", salario:1600,atividade:"Geral",     numFilhos:0,ativo:true},
  {id:4, nome:"Ana Ferreira",   cargo:"Trabalhadora Rural",salario:1600,atividade:"Cacau",     numFilhos:3,ativo:true},
  {id:5, nome:"Pedro Costa",    cargo:"Motorista",         salario:2200,atividade:"Geral",     numFilhos:1,ativo:true},
  {id:6, nome:"Luiz Almeida",   cargo:"Tratorista",        salario:2500,atividade:"Geral",     numFilhos:0,ativo:true},
  {id:7, nome:"Francisca Lima", cargo:"Colhedora de Cacau",salario:1600,atividade:"Cacau",     numFilhos:2,ativo:true},
  {id:8, nome:"Antônio Souza",  cargo:"Colhedor de Coco",  salario:1600,atividade:"Coco",      numFilhos:0,ativo:true},
  {id:9, nome:"Raimundo Neto",  cargo:"Vaqueiro Corte",    salario:1800,atividade:"Gado Corte",numFilhos:1,ativo:true},
  {id:10,nome:"Severino Mota",  cargo:"Vaqueiro Leiteiro", salario:1800,atividade:"Leiteiro",  numFilhos:2,ativo:true},
];
const PRODUCAO_INIT=[
  {id:uid(),data:"2024-10-31",mes:"Out/24",cacauKg:1200,leiteL:8500,cocoUn:3200,responsavel:"José da Silva"},
  {id:uid(),data:"2024-11-30",mes:"Nov/24",cacauKg: 980,leiteL:8200,cocoUn:3000,responsavel:"José da Silva"},
  {id:uid(),data:"2024-12-31",mes:"Dez/24",cacauKg:1450,leiteL:7900,cocoUn:2800,responsavel:"José da Silva"},
  {id:uid(),data:"2025-01-31",mes:"Jan/25",cacauKg:1100,leiteL:8800,cocoUn:3500,responsavel:"José da Silva"},
  {id:uid(),data:"2025-02-28",mes:"Fev/25",cacauKg: 890,leiteL:8600,cocoUn:3100,responsavel:"José da Silva"},
  {id:uid(),data:"2025-03-31",mes:"Mar/25",cacauKg:1320,leiteL:9100,cocoUn:3800,responsavel:"José da Silva"},
];
const DESPESAS_INIT=[
  {id:uid(),data:"2025-03-05",categoria:"🐂 Gado de Corte",subcategoria:"Ração/Suplemento", valor:9400,descricao:"Ração confinamento Março",  fornecedor:"AgroNutrição Ltda", nf:null},
  {id:uid(),data:"2025-03-08",categoria:"🐂 Gado de Corte",subcategoria:"Medicamentos/Vet.",valor:1200,descricao:"Ivermectina + antibiótico",  fornecedor:"Vetmed",             nf:null},
  {id:uid(),data:"2025-03-10",categoria:"🥛 Gado Leiteiro",subcategoria:"Ração Vacas",      valor:3800,descricao:"Ração lactação Março",       fornecedor:"AgroNutrição Ltda", nf:null},
  {id:uid(),data:"2025-03-12",categoria:"Insumos Agrícolas",subcategoria:"Fertilizantes",   valor:4500,descricao:"NPK cacau e coco",           fornecedor:"Fertisul BA",        nf:null},
  {id:uid(),data:"2025-03-15",categoria:"Combustível",      subcategoria:"Diesel",          valor:2100,descricao:"Diesel tratores",            fornecedor:"Posto BR",           nf:null},
  {id:uid(),data:"2025-03-20",categoria:"Manutenção",       subcategoria:"Equipamentos",    valor:1800,descricao:"Revisão ordenhadeira",       fornecedor:"TecnoAgro",          nf:null},
  {id:uid(),data:"2025-03-25",categoria:"Energia",          subcategoria:"Energia Elétrica",valor: 900,descricao:"Conta COELBA Março",        fornecedor:"COELBA",             nf:null},
  {id:uid(),data:"2025-03-28",categoria:"Tributos",         subcategoria:"Funrural",        valor: 705,descricao:"Funrural Março/25",         fornecedor:"Receita Federal",    nf:null},
  {id:uid(),data:"2025-03-28",categoria:"Financiamentos",   subcategoria:"Amortização",     valor:3240,descricao:"BB Custeio Cacau - parcela 3",fornecedor:"Banco do Brasil",  nf:null},
];
const RECEITAS_INIT=[
  {id:uid(),data:"2025-03-05",atividade:"Cacau",     valor:23760,qtd:"1320 kg",  unitario:"R$18/kg",   comprador:"Cacau Bahia Ltda",  obs:""},
  {id:uid(),data:"2025-03-10",atividade:"Leite",     valor:25480,qtd:"9100 L",   unitario:"R$2,80/L",  comprador:"Laticínios Sul BA", obs:""},
  {id:uid(),data:"2025-03-15",atividade:"Coco",      valor: 9500,qtd:"3800 un",  unitario:"R$2,50/un", comprador:"Mercado Melo",      obs:""},
  {id:uid(),data:"2025-03-20",atividade:"Gado Corte",valor:141050,qtd:"7 cab/434@",unitario:"R$325/@",comprador:"Frigorífico Bahia", obs:"7 cabeças, 434 arrobas"},
];
const ANIMAIS_LEITEIRO_INIT=[
  {id:1,brinco:"BL-001",lote:"Lote A – Matrizes", qtd:28,status:"Saudável", proxVacina:"Jul/25",pasto:"Pasto Norte"},
  {id:2,brinco:"BL-002",lote:"Lote B – Recria",   qtd:12,status:"Saudável", proxVacina:"Ago/25",pasto:"Pasto Sul"},
  {id:3,brinco:"BL-003",lote:"Lote C – Bezerros", qtd: 8,status:"⚠ Atenção",proxVacina:"Abr/25",pasto:"Piquete 1"},
];
const ANIMAIS_CORTE_INIT=[
  {id:1, brinco:"BC-001",categoria:"Boi Gordo",   pesoPrev:480,pesoAtual:512,dtEntrada:"Jan/25",previsaoAbate:"Mai/25",pasto:"Confinamento A",status:"Pronto p/ Abate",custoAquisicao:4200},
  {id:2, brinco:"BC-002",categoria:"Boi Gordo",   pesoPrev:460,pesoAtual:498,dtEntrada:"Jan/25",previsaoAbate:"Mai/25",pasto:"Confinamento A",status:"Pronto p/ Abate",custoAquisicao:4000},
  {id:3, brinco:"BC-003",categoria:"Garrote",     pesoPrev:320,pesoAtual:345,dtEntrada:"Fev/25",previsaoAbate:"Ago/25",pasto:"Pasto Leste",   status:"Em engorda",     custoAquisicao:2800},
  {id:4, brinco:"BC-004",categoria:"Garrote",     pesoPrev:310,pesoAtual:338,dtEntrada:"Fev/25",previsaoAbate:"Ago/25",pasto:"Pasto Leste",   status:"Em engorda",     custoAquisicao:2700},
  {id:5, brinco:"BC-005",categoria:"Novilha",     pesoPrev:290,pesoAtual:315,dtEntrada:"Mar/25",previsaoAbate:"Set/25",pasto:"Pasto Sul",     status:"Em engorda",     custoAquisicao:2500},
  {id:6, brinco:"BC-006",categoria:"Novilha",     pesoPrev:280,pesoAtual:302,dtEntrada:"Mar/25",previsaoAbate:"Set/25",pasto:"Pasto Sul",     status:"Em engorda",     custoAquisicao:2400},
  {id:7, brinco:"BC-007",categoria:"Boi Gordo",   pesoPrev:490,pesoAtual:505,dtEntrada:"Dez/24",previsaoAbate:"Abr/25",pasto:"Confinamento B",status:"Pronto p/ Abate",custoAquisicao:4300},
  {id:8, brinco:"BC-008",categoria:"Bezerro Rec.",pesoPrev:180,pesoAtual:195,dtEntrada:"Mar/25",previsaoAbate:"Jan/26",pasto:"Piquete 2",     status:"Recria",         custoAquisicao:1200},
  {id:9, brinco:"BC-009",categoria:"Bezerro Rec.",pesoPrev:175,pesoAtual:188,dtEntrada:"Mar/25",previsaoAbate:"Jan/26",pasto:"Piquete 2",     status:"Recria",         custoAquisicao:1150},
  {id:10,brinco:"BC-010",categoria:"Garrote",     pesoPrev:330,pesoAtual:352,dtEntrada:"Fev/25",previsaoAbate:"Ago/25",pasto:"Pasto Leste",   status:"Em engorda",     custoAquisicao:2900},
];
const VACINAS_INIT=[
  {id:uid(),data:"2025-04-10",rebanho:"Corte",   lote:"Confinamento A+B", vacina:"Febre Aftosa",         qtd:9, custo:270,status:"Pendente"},
  {id:uid(),data:"2025-04-15",rebanho:"Leiteiro",lote:"Lote C – Bezerros",vacina:"Brucelose + Carbúnculo",qtd:8, custo:320,status:"Pendente"},
  {id:uid(),data:"2025-05-01",rebanho:"Leiteiro",lote:"Lote A – Matrizes",vacina:"Febre Aftosa",          qtd:28,custo:840,status:"Pendente"},
  {id:uid(),data:"2025-03-01",rebanho:"Corte",   lote:"Todos",            vacina:"Vermifugação",          qtd:10,custo:180,status:"Realizado"},
  {id:uid(),data:"2025-02-10",rebanho:"Leiteiro",lote:"Lote A – Matrizes",vacina:"IBR/BVD",               qtd:28,custo:980,status:"Realizado"},
];
const PASTAGENS_INIT=[
  {id:1,nome:"Pasto Norte",   area:45,capacidade:30,atual:28,tipo:"Leiteiro",status:"Em uso",   capim:"Brachiaria brizantha",    dtPlantio:"2018-03",lat:-14.852,lng:-39.261,obs:"Principal pasto das matrizes"},
  {id:2,nome:"Pasto Sul",     area:32,capacidade:22,atual:18,tipo:"Misto",   status:"Em uso",   capim:"Panicum maximum (Mombaça)",dtPlantio:"2019-06",lat:-14.868,lng:-39.259,obs:""},
  {id:3,nome:"Pasto Leste",   area:38,capacidade:22,atual:13,tipo:"Corte",   status:"Em uso",   capim:"Brachiaria brizantha",    dtPlantio:"2017-09",lat:-14.857,lng:-39.252,obs:"Engorda garrotes"},
  {id:4,nome:"Piquete 1",     area: 8,capacidade:10,atual: 8,tipo:"Leiteiro",status:"Em uso",   capim:"Cynodon (Tifton 85)",     dtPlantio:"2020-04",lat:-14.853,lng:-39.263,obs:"Bezerros leiteiros"},
  {id:5,nome:"Piquete 2",     area: 6,capacidade: 8,atual: 2,tipo:"Corte",   status:"Descanso", capim:"Cynodon (Tifton 85)",     dtPlantio:"2020-04",lat:-14.861,lng:-39.254,obs:"Em descanso 30 dias"},
  {id:6,nome:"Confinamento A",area: 4,capacidade:10,atual: 5,tipo:"Corte",   status:"Em uso",   capim:"Nativo/Misto",            dtPlantio:"",       lat:-14.856,lng:-39.256,obs:"Bois gordos"},
  {id:7,nome:"Confinamento B",area: 4,capacidade:10,atual: 5,tipo:"Corte",   status:"Em uso",   capim:"Nativo/Misto",            dtPlantio:"",       lat:-14.858,lng:-39.258,obs:""},
  {id:8,nome:"Reserva Mata",  area:20,capacidade: 0,atual: 0,tipo:"Reserva", status:"Vedado",   capim:"Nativo/Misto",            dtPlantio:"",       lat:-14.863,lng:-39.265,obs:"Reserva legal"},
];
const FINANCIAMENTOS_INIT=[
  {id:1,banco:"Banco do Brasil",tipo:"Custeio",    finalidade:"Custeio Safra Cacau 24/25",         valor:80000, taxa:7.5,carencia:0, prazo:12,dtContratacao:"2025-01-15",sistema:"SAC",  garantias:"Penhor safra",   status:"Ativo",pagamentos:[]},
  {id:2,banco:"BNB",            tipo:"Investimento",finalidade:"Reforma Pastagens e Benfeitorias", valor:150000,taxa:6.0,carencia:12,prazo:60,dtContratacao:"2024-06-01",sistema:"PRICE",garantias:"Hipoteca imóvel",status:"Ativo",pagamentos:[]},
  {id:3,banco:"Banco do Brasil",tipo:"PRONAF",     finalidade:"PRONAF Leite – Ordenhadeira",       valor:40000, taxa:5.5,carencia:3, prazo:24,dtContratacao:"2024-09-01",sistema:"SAC",  garantias:"Aval + penhor",  status:"Ativo",pagamentos:[]},
];
const VENDAS_GADO_HIST=[
  {mes:"Out",cabecas:4,arrobas:240,valorArroba:310,total:74400},
  {mes:"Nov",cabecas:3,arrobas:178,valorArroba:315,total:56070},
  {mes:"Dez",cabecas:6,arrobas:372,valorArroba:320,total:119040},
  {mes:"Jan",cabecas:5,arrobas:305,valorArroba:318,total:96990},
  {mes:"Fev",cabecas:4,arrobas:244,valorArroba:322,total:78568},
  {mes:"Mar",cabecas:7,arrobas:434,valorArroba:325,total:141050},
];

function useGoogleMaps(apiKey){
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{
    if(!apiKey){setLoaded(false);return;}
    if(window.google?.maps){setLoaded(true);return;}
    const ex=document.querySelector("script[data-gmaps]");
    if(ex){ex.addEventListener("load",()=>setLoaded(true));return;}
    const s=document.createElement("script");
    s.src=`https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    s.async=true; s.setAttribute("data-gmaps","1");
    s.onload=()=>setLoaded(true);
    document.head.appendChild(s);
  },[apiKey]);
  return loaded;
}

// ── COMPONENTES BASE ──────────────────────────────────────
function Modal({title,children,onClose,largura=500}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"white",borderRadius:14,width:"100%",maxWidth:largura,maxHeight:"90vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)"}}>
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
const BotaoP=({children,onClick,cor="#1b4332",type="button"})=>(<button type={type} onClick={onClick} style={{padding:"9px 18px",background:cor,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>{children}</button>);
const BotaoSec=({children,onClick})=>(<button onClick={onClick} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>{children}</button>);
const BotaoDel=({children,onClick})=>(<button onClick={onClick} style={{padding:"7px 14px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>{children}</button>);
const BotaoEdit=({onClick})=>(<button onClick={onClick} style={{padding:"7px 12px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✏️ Editar</button>);
function Campo({label,value,onChange,type="text",required=false,options=null,placeholder=""}){
  const base={width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box"};
  return(
    <div style={{marginBottom:14}}>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>{label}{required&&<span style={{color:"#dc2626"}}> *</span>}</label>
      {options
        ?<select value={value} onChange={e=>onChange(e.target.value)} style={base}><option value="">Selecione...</option>{options.map(o=><option key={o} value={o}>{o}</option>)}</select>
        :<input type={type} value={value||""} onChange={e=>onChange(e.target.value)} style={base} placeholder={placeholder}/>
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
const TH=({s})=><th style={{padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9"}}>{s}</th>;
const TD=({children,style={}})=><td style={{padding:"9px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6",...style}}>{children}</td>;

// ── DASHBOARD ─────────────────────────────────────────────
function DashboardView({funcionarios,producao,despesas,receitas,financiamentos}){
  const [aba,setAba]=useState("geral");
  const sorted=[...producao].sort((a,b)=>b.data.localeCompare(a.data));
  const pCur=sorted[0]||{};const pPrv=sorted[1]||{};
  const recCacau=(pCur.cacauKg||0)*PC,recLeite=(pCur.leiteL||0)*PL,recCoco=(pCur.cocoUn||0)*PCO;
  const recGado=receitas.filter(r=>r.atividade==="Gado Corte").reduce((s,r)=>s+(r.valor||0),0);
  const recTotal=recCacau+recLeite+recCoco+recGado;
  const cstTotal=despesas.reduce((s,d)=>s+(d.valor||0),0);
  const lucTotal=recTotal-cstTotal;
  const dividaTotal=financiamentos.filter(f=>f.status==="Ativo").reduce((s,f)=>{
    const t=f.sistema==="SAC"?calcTabelaSAC(f):calcTabelaPRICE(f);
    const p=t.find(p=>!(f.pagamentos||[]).includes(p.parcela));
    return s+(p?p.saldo:0);
  },0);
  const recPizza=[{name:"🍫 Cacau",value:recCacau},{name:"🥛 Leite",value:recLeite},{name:"🥥 Coco",value:recCoco},{name:"🐂 Gado",value:recGado}].filter(x=>x.value>0);
  const cstCacau=despesas.filter(d=>d.categoria==="Insumos Agrícolas").reduce((s,d)=>s+d.valor,0)+2000;
  const cstLeite=despesas.filter(d=>d.categoria==="🥛 Gado Leiteiro").reduce((s,d)=>s+d.valor,0)+2400;
  const cstGado=despesas.filter(d=>d.categoria==="🐂 Gado de Corte").reduce((s,d)=>s+d.valor,0);
  const comp=[
    {ativ:"Cacau",receita:recCacau,custo:cstCacau,lucro:recCacau-cstCacau,cor:"#d4a017",icon:"🍫"},
    {ativ:"Leite",receita:recLeite,custo:cstLeite,lucro:recLeite-cstLeite,cor:"#2d6a4f",icon:"🥛"},
    {ativ:"Coco", receita:recCoco, custo:1800,    lucro:recCoco-1800,     cor:"#52b788",icon:"🥥"},
    {ativ:"Gado", receita:recGado, custo:cstGado, lucro:recGado-cstGado,  cor:"#457b9d",icon:"🐂"},
  ];
  const hist=producao.slice(-6).map(p=>({mes:p.mes,Cacau:p.cacauKg*PC,Leite:p.leiteL*PL,Coco:p.cocoUn*PCO}));
  const ABAS=[{id:"geral",label:"🏠 Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"},{id:"gado",label:"🐂 Gado"}];
  return(
    <div>
      <SecHeader title="Dashboard" sub="Análise financeira e produtiva por atividade"/>
      <div style={{display:"flex",gap:6,marginBottom:20,flexWrap:"wrap"}}>
        {ABAS.map(a=><button key={a.id} onClick={()=>setAba(a.id)} style={{padding:"9px 18px",border:"none",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,background:aba===a.id?"#1b4332":"white",color:aba===a.id?"white":"#6b7280",boxShadow:aba===a.id?"0 2px 8px rgba(27,67,50,0.3)":"0 1px 3px rgba(0,0,0,0.08)"}}>{a.label}</button>)}
      </div>
      {aba==="geral"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
            <KpiCard label="Receita Total" value={fmt(recTotal)} color="#2d6a4f" icon="💰" trend={1}/>
            <KpiCard label="Despesas" value={fmt(cstTotal)} color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro" value={fmt(lucTotal)} color={lucTotal>=0?"#d4a017":"#e76f51"} icon="📈" trend={lucTotal>=0?1:-1}/>
            <KpiCard label="Dívida Bancária" value={fmt(dividaTotal)} color="#457b9d" icon="🏦" trend={dividaTotal>0?-1:0}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:14}}>
            <Card>
              <CardTitle>Receita por atividade — histórico</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hist}>
                  <defs>
                    <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4a017" stopOpacity={0.3}/><stop offset="95%" stopColor="#d4a017" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.3}/><stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gCo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#52b788" stopOpacity={0.3}/><stop offset="95%" stopColor="#52b788" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Cacau" stroke="#d4a017" fill="url(#gC)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Leite" stroke="#2d6a4f" fill="url(#gL)" strokeWidth={2}/>
                  <Area type="monotone" dataKey="Coco"  stroke="#52b788" fill="url(#gCo)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardTitle>Receita por atividade</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart><Pie data={recPizza} cx="50%" cy="48%" outerRadius={80} dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>{recPizza.map((_,i)=><Cell key={i} fill={["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/></PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <CardTitle>Receita × Custo × Lucro por atividade</CardTitle>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={comp}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="ativ" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/><Bar dataKey="custo" name="Custo" fill="#e76f51" radius={[3,3,0,0]}/><Bar dataKey="lucro" name="Lucro" fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {aba==="cacau"&&<AbaAtiv atv={comp[0]} hist={producao.slice(-6).map(p=>({mes:p.mes,v:p.cacauKg*PC}))}/>}
      {aba==="leite"&&<AbaAtiv atv={comp[1]} hist={producao.slice(-6).map(p=>({mes:p.mes,v:p.leiteL*PL}))} tipo="line"/>}
      {aba==="coco" &&<AbaAtiv atv={comp[2]} hist={producao.slice(-6).map(p=>({mes:p.mes,v:p.cocoUn*PCO}))}/>}
      {aba==="gado" &&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
            <KpiCard label="Receita Venda" value={fmt(recGado)} color="#457b9d" icon="🐂" trend={1}/>
            <KpiCard label="Custo Corte"   value={fmt(cstGado)} color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro Corte"   value={fmt(recGado-cstGado)} color="#2d6a4f" icon="📈" trend={1}/>
            <KpiCard label="R$/Arroba"     value="R$ 325,00"    color="#d4a017" icon="📊" trend={0}/>
          </div>
          <Card>
            <CardTitle>Receita Gado Corte — histórico</CardTitle>
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

// ── FINANCEIRO ────────────────────────────────────────────────────────
function FinanceiroView({funcionarios,despesas,receitas}){
  const [tab,setTab]=useState("folha");
  const ativos=funcionarios.filter(f=>f.ativo);
  const totalSalBruto=ativos.reduce((s,f)=>s+(f.salario||0),0);
  const totalEncPatr=totalSalBruto*(0.20+0.08+0.01+0.02+0.1111+0.0833);
  return(
    <div>
      <SecHeader title="Módulo Financeiro" sub="Folha de pagamento, encargos, tributos, despesas e receitas"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Total Salários" value={fmt(totalSalBruto)} color="#2d6a4f" icon="👥" trend={0}/>
        <KpiCard label="Encargos Patronais" value={fmt(totalEncPatr)} color="#e76f51" icon="📊" trend={0}/>
        <KpiCard label="Custo Total Folha" value={fmt(totalSalBruto+totalEncPatr)} color="#d4a017" icon="💼" trend={0}/>
      </div>
      <TabBar tabs={[{id:"folha",label:"Folha"},{id:"encargos",label:"Encargos"},{id:"tributos",label:"Tributos"},{id:"despesas",label:"Despesas"},{id:"receitas",label:"Receitas"}]} active={tab} onChange={setTab}/>
      {tab==="folha"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Nome","Cargo","Atividade","Salário Bruto","INSS","Sal. Família","Líquido","Custo Empresa"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>
              {ativos.map((f,i)=>{
                const inss=calcINSSEmpregado(f.salario);
                const sf=calcSalFamilia(f.salario,f.numFilhos||0);
                const enc=f.salario*(0.20+0.08+0.01+0.02+0.1111+0.0833);
                return(
                  <tr key={f.id} style={{background:i%2?"#fafafa":"white"}}>
                    <TD style={{fontWeight:600}}>{f.nome}</TD>
                    <TD style={{color:"#6b7280"}}>{f.cargo}</TD>
                    <TD><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,background:"#f0faf4",color:"#2d6a4f",fontWeight:600}}>{f.atividade}</span></TD>
                    <TD>{fmt(f.salario)}</TD>
                    <TD style={{color:"#e76f51"}}>{fmt(inss)}</TD>
                    <TD style={{color:"#2d6a4f",fontWeight:f.numFilhos>0?700:400}}>{f.numFilhos>0?fmt(sf)+` (${f.numFilhos}f)`:"—"}</TD>
                    <TD style={{fontWeight:600}}>{fmt(f.salario-inss+sf)}</TD>
                    <TD style={{fontWeight:700,color:"#1b4332"}}>{fmt(f.salario+enc)}</TD>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={3} style={{padding:"10px 12px",color:"white",fontWeight:700}}>TOTAIS</td>
              <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totalSalBruto)}</td>
              <td colSpan={3} style={{padding:"10px 12px",color:"#95d5b2"}}></td>
              <td style={{padding:"10px 12px",color:"white",fontWeight:800}}>{fmt(totalSalBruto+totalEncPatr)}</td>
            </tr></tfoot>
          </table>
          <div style={{padding:12,background:"#fffbeb",borderTop:"1px solid #fcd34d",fontSize:12,color:"#92400e"}}>
            💡 INSS progressivo 2025: 7,5% até R$1.518 · 9% até R$2.793,88 · 12% até R$4.190,83 · 14% até R$8.157,41. Salário família: R$ 65,00/filho para salário ≤ R$ 1.906,04.
          </div>
        </Card>
      )}
      {tab==="encargos"&&(
        <Card>
          <CardTitle>Encargos Patronais</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {[["INSS Patronal","20,0%",totalSalBruto*0.20],["FGTS","8,0%",totalSalBruto*0.08],["RAT/SAT","1,0%",totalSalBruto*0.01],["SENAR","2,0%",totalSalBruto*0.02],["Provisão Férias+1/3","11,1%",totalSalBruto*0.1111],["Provisão 13º","8,3%",totalSalBruto*0.0833]].map(([lbl,perc,val],i)=>(
              <div key={i} style={{padding:14,background:"#f8faf9",borderRadius:8,borderLeft:`3px solid ${COLORS[i]}`}}>
                <div style={{fontSize:11,color:"#6b7280"}}>{lbl}</div>
                <div style={{fontSize:22,fontWeight:700,color:"#1a1a2e",margin:"3px 0"}}>{perc}</div>
                <div style={{fontSize:14,fontWeight:700,color:COLORS[i]}}>{fmt(val)}/mês</div>
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
          {[["ITR","Valor da terra nua","30/11/2025",1200,"Anual"],["Contribuição Sindical","Patrimônio declarado","31/01/2025",850,"Anual"],["Funrural – RGPS","1,5% receita bruta","Mensal",705,"Mensal"],["INSS Produtor Rural","2,1% receita bruta","Mensal",987,"Mensal"],["SENAR","0,2% comerc. rural","Mensal",94,"Mensal"]].map(([t,b,v,val,f],i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f3f4f6"}}>
              <div><div style={{fontSize:14,fontWeight:600,color:"#1a1a2e"}}>{t}</div><div style={{fontSize:12,color:"#6b7280"}}>Base: {b} · Venc: {v}</div></div>
              <div style={{textAlign:"right"}}><div style={{fontSize:15,fontWeight:700,color:"#e76f51"}}>{fmt(val)}</div><div style={{fontSize:11,color:"#9ca3af"}}>{f}</div></div>
            </div>
          ))}
        </Card>
      )}
      {tab==="despesas"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <Card>
            <CardTitle>Despesas por categoria</CardTitle>
            {Object.entries(despesas.reduce((a,d)=>{ a[d.categoria]=(a[d.categoria]||0)+d.valor; return a; },{})).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>(
              <div key={i} style={{marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:"#374151"}}>{cat}</span><span style={{fontSize:12,fontWeight:700}}>{fmt(val)}</span></div>
                <div style={{height:6,background:"#f3f4f6",borderRadius:3}}><div style={{height:"100%",width:`${(val/despesas.reduce((s,d)=>s+d.valor,1))*100}%`,background:COLORS[i%8],borderRadius:3}}/></div>
              </div>
            ))}
          </Card>
          <Card>
            <CardTitle>Gráfico despesas</CardTitle>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={Object.entries(despesas.reduce((a,d)=>{ a[d.categoria]=(a[d.categoria]||0)+d.valor; return a; },{})).map(([name,value])=>({name:name.replace(/[🐂🥛]/g,""),value}))} cx="50%" cy="48%" outerRadius={90} dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
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
            <thead><tr>{["Data","Atividade","Qtd/Detalhes","Unitário","Valor","Comprador"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
            <tbody>{[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
              <tr key={r.id} style={{background:i%2?"#fafafa":"white"}}>
                <TD style={{color:"#6b7280"}}>{r.data}</TD><TD style={{fontWeight:600,color:"#1b4332"}}>{r.atividade}</TD>
                <TD>{r.qtd}</TD><TD>{r.unitario}</TD>
                <TD style={{fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</TD><TD style={{color:"#6b7280"}}>{r.comprador}</TD>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={4} style={{padding:"9px 12px",color:"#95d5b2",fontWeight:700}}>Total</td>
              <td style={{padding:"9px 12px",color:"white",fontWeight:800}}>{fmt(receitas.reduce((s,r)=>s+r.valor,0))}</td><td/>
            </tr></tfoot>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── PRODUÇÃO ──────────────────────────────────────────────
function ProducaoView({producao}){
  const [tab,setTab]=useState("geral");
  const sorted=[...producao].sort((a,b)=>b.data.localeCompare(a.data));
  const cur=sorted[0]||{};const prv=sorted[1]||{};
  const hist6=producao.slice(-6);
  return(
    <div>
      <SecHeader title="Controle de Produção" sub="Cacau · Leite · Coco · Gado de Corte"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="🍫 Cacau" value={`${fmtN(cur.cacauKg)} kg`} sub={`${(cur.cacauKg||0)-(prv.cacauKg||0)>0?"+":""}${(cur.cacauKg||0)-(prv.cacauKg||0)} kg`} color="#d4a017" icon="🍫" trend={(cur.cacauKg||0)-(prv.cacauKg||0)}/>
        <KpiCard label="🥛 Leite" value={`${fmtN(cur.leiteL)} L`}   sub={`${(cur.leiteL||0)-(prv.leiteL||0)>0?"+":""}${(cur.leiteL||0)-(prv.leiteL||0)} L`}   color="#2d6a4f" icon="🥛" trend={(cur.leiteL||0)-(prv.leiteL||0)}/>
        <KpiCard label="🥥 Coco"  value={`${fmtN(cur.cocoUn)} un`}  sub={`${(cur.cocoUn||0)-(prv.cocoUn||0)>0?"+":""}${(cur.cocoUn||0)-(prv.cocoUn||0)} un`}  color="#52b788" icon="🥥" trend={(cur.cocoUn||0)-(prv.cocoUn||0)}/>
        <KpiCard label="🐂 Gado"  value={`${VENDAS_GADO_HIST[5].cabecas} cab.`} sub={`${VENDAS_GADO_HIST[5].arrobas}@ · ${fmt(VENDAS_GADO_HIST[5].total)}`} color="#457b9d" icon="🐂" trend={1}/>
      </div>
      <TabBar tabs={[{id:"geral",label:"Visão Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"},{id:"gado",label:"🐂 Gado"}]} active={tab} onChange={setTab}/>
      {tab==="geral"&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          {[["cacauKg","kg","#d4a017","🍫 Cacau","bar"],["leiteL","L","#2d6a4f","🥛 Leite","line"],["cocoUn","un","#52b788","🥥 Coco","bar"]].map(([key,unit,cor,label,tipo])=>(
            <Card key={key}>
              <CardTitle>{label}</CardTitle>
              <ResponsiveContainer width="100%" height={150}>
                {tipo==="line"
                  ?<LineChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey={key} stroke={cor} strokeWidth={2} dot={{r:3,fill:cor}}/></LineChart>
                  :<BarChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey={key} fill={cor} radius={[3,3,0,0]}/></BarChart>
                }
              </ResponsiveContainer>
            </Card>
          ))}
          <Card>
            <CardTitle>🐂 Gado — arrobas/cabeças</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={VENDAS_GADO_HIST}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="arrobas" name="Arrobas" fill="#457b9d" radius={[3,3,0,0]}/><Bar dataKey="cabecas" name="Cabeças" fill="#1b4332" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
      {tab==="gado"&&(
        <Card>
          <CardTitle>Vendas de Gado — histórico</CardTitle>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr>{["Mês","Cabeças","Arrobas","R$/@","Total"].map((h,i)=><th key={i} style={{padding:"7px 10px",textAlign:"left",color:"#6b7280",borderBottom:"1px solid #e5e7eb",fontWeight:600}}>{h}</th>)}</tr></thead>
            <tbody>{VENDAS_GADO_HIST.map((v,i)=>(
              <tr key={i} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{padding:"8px 10px",fontWeight:600}}>{v.mes}</td>
                <td style={{padding:"8px 10px"}}>{v.cabecas} cab.</td>
                <td style={{padding:"8px 10px"}}>{v.arrobas} @</td>
                <td style={{padding:"8px 10px",color:"#d4a017",fontWeight:600}}>{fmt(v.valorArroba)}</td>
                <td style={{padding:"8px 10px",fontWeight:700,color:"#1b4332"}}>{fmt(v.total)}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}
      {(tab==="cacau"||tab==="leite"||tab==="coco")&&(
        <Card><div style={{textAlign:"center",padding:20,color:"#6b7280",fontSize:13}}>Consulte os gráficos na aba Visão Geral.</div></Card>
      )}
    </div>
  );
}
// ── MANEJO PECUÁRIO ───────────────────────────────────────
function ManejoView({animaisLeiteiro,animaisCorte,vacinas,pastagens}){
  const [tab,setTab]=useState("leiteiro");
  const thS={padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9"};
  const tdS={padding:"10px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6"};
  return(
    <div>
      <SectionHeader title="Manejo Pecuário" sub="Gado leiteiro e gado de corte — agenda sanitária e pastagens"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Gado Leiteiro"    value={`${animaisLeiteiro.reduce((s,a)=>s+a.qtd,0)} cab.`} color="#2d6a4f" icon="🐄" trend={0}/>
        <KpiCard label="Gado de Corte"    value={`${animaisCorte.length} cab.`}                        color="#457b9d" icon="🐂" trend={0}/>
        <KpiCard label="Vacinas Pendentes" value={`${vacinas.filter(v=>v.status==="Pendente").length} eventos`} sub="Próx: 10/04/25" color="#e76f51" icon="💉" trend={-1}/>
        <KpiCard label="Pastagens"         value={`${pastagens.length} áreas`} sub="Ver módulo Pastagens" color="#52b788" icon="🌿" trend={0}/>
      </div>
      <TabBar tabs={[{id:"leiteiro",label:"🐄 Gado Leiteiro"},{id:"corte",label:"🐂 Gado de Corte"},{id:"vacinas",label:"💉 Agenda Sanitária"}]} active={tab} onChange={setTab}/>

      {tab==="leiteiro"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Lote","Qtd","Status","Pasto Atual","Próx. Vacina"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{animaisLeiteiro.map((a,i)=>(
              <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                <td style={{...tdS,fontWeight:600}}>{a.lote}</td>
                <td style={tdS}>{a.qtd} cab.</td>
                <td style={tdS}><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:a.status.includes("Atenção")?"#fff3cd":"#d8f3dc",color:a.status.includes("Atenção")?"#b45309":"#2d6a4f"}}>{a.status}</span></td>
                <td style={{...tdS,color:"#6b7280"}}>{a.pasto}</td>
                <td style={{...tdS,color:a.status.includes("Atenção")?"#e76f51":"#374151",fontWeight:a.status.includes("Atenção")?700:400}}>{a.proxVacina}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {tab==="corte"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Brinco","Categoria","Peso Prev.","Peso Atual","GMD est.","Arrobas","Entrada","Prev. Abate","Local","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{animaisCorte.map((a,i)=>{
              const gmd=a.pesoPrev?((a.pesoAtual-a.pesoPrev)/90).toFixed(2):"—";
              const arrs=(a.pesoAtual/15).toFixed(1);
              const cor=a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
              const bg =a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
              return(
                <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:700,color:"#1a1a2e"}}>{a.brinco}</td>
                  <td style={tdS}>{a.categoria}</td>
                  <td style={tdS}>{a.pesoPrev} kg</td>
                  <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</td>
                  <td style={tdS}>{gmd} kg/dia</td>
                  <td style={{...tdS,color:"#d4a017",fontWeight:600}}>{arrs} @</td>
                  <td style={{...tdS,color:"#6b7280"}}>{a.dtEntrada}</td>
                  <td style={tdS}>{a.previsaoAbate}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{a.pasto}</td>
                  <td style={tdS}><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor}}>{a.status}</span></td>
                </tr>
              );
            })}</tbody>
            <tfoot><tr style={{background:"#1b4332"}}>
              <td colSpan={3} style={{padding:"10px 12px",color:"white",fontWeight:700}}>Total — {animaisCorte.length} animais</td>
              <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{animaisCorte.reduce((s,a)=>s+a.pesoAtual,0).toLocaleString("pt-BR")} kg</td>
              <td colSpan={2} style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{(animaisCorte.reduce((s,a)=>s+a.pesoAtual,0)/15).toFixed(1)} @ totais</td>
              <td colSpan={4}/>
            </tr></tfoot>
          </table>
        </Card>
      )}

      {tab==="vacinas"&&(
        <Card style={{padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr>{["Data","Rebanho","Lote/Grupo","Vacina/Procedimento","Qtd","Custo","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{
              const pend=v.status==="Pendente";
              return(
                <tr key={v.id} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{...tdS,fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</td>
                  <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f"}}>🐂 {v.rebanho}</span></td>
                  <td style={tdS}>{v.lote}</td>
                  <td style={tdS}>{v.vacina}</td>
                  <td style={tdS}>{v.qtd} cab.</td>
                  <td style={tdS}>{fmt(v.custo)}</td>
                  <td style={tdS}><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f"}}>{v.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

// ── PASTAGENS ─────────────────────────────────────────────────────────
function PastagensView({pastagens,setPastagens,config}){
  const [tab,setTab]=useState("lista");
  const [modal,setModal]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [confirm,setConfirm]=useState(null);
  const [mapaModal,setMapaModal]=useState(null);

  const abrirAdd=()=>{setEditItem(null);setForm({tipo:"Leiteiro",status:"Em uso"});setModal(true);};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal(true);};
  const fechar=()=>{setModal(false);setEditItem(null);setForm({});};

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração?":"Confirmar inclusão?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid(),area:Number(form.area)||0,capacidade:Number(form.capacidade)||0,atual:Number(form.atual)||0};
      setPastagens(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };
  const excluir=(id,nome)=>{
    setConfirm({msg:`Excluir "${nome}"?`,danger:true,onSim:()=>{setPastagens(prev=>prev.filter(x=>x.id!==id));setConfirm(null);}});
  };

  const sCor=s=>s==="Em uso"?"#2d6a4f":s==="Descanso"?"#457b9d":s==="Em reforma"?"#d4a017":s==="Vedado"?"#e76f51":"#9ca3af";
  const tCor=t=>t==="Corte"?"#457b9d":t==="Leiteiro"?"#2d6a4f":t==="Misto"?"#52b788":"#9ca3af";
  const total={area:pastagens.reduce((s,p)=>s+(p.area||0),0),cap:pastagens.reduce((s,p)=>s+(p.capacidade||0),0),atual:pastagens.reduce((s,p)=>s+(p.atual||0),0)};

  const F=(label,campo,type="text",req=false,opts=null)=>
    <Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts}/>;

  return(
    <div>
      <SecHeader title="Gestão de Pastagens" sub="Cadastro, mapa e controle de ocupação"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Área Total" value={`${total.area} ha`} color="#2d6a4f" icon="🌿" trend={0}/>
        <KpiCard label="Capacidade" value={`${total.cap} UA`} color="#52b788" icon="📐" trend={0}/>
        <KpiCard label="Ocupação" value={`${total.atual} cab.`} sub={`${total.cap>0?((total.atual/total.cap)*100).toFixed(0):0}% capacidade`} color="#d4a017" icon="🐄" trend={0}/>
        <KpiCard label="Em Descanso" value={`${pastagens.filter(p=>p.status==="Descanso").length}`} sub="pastagens em rotação" color="#457b9d" icon="✅" trend={0}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <TabBar tabs={[{id:"lista",label:"📋 Lista"},{id:"mapa",label:"🗺️ Mapa"}]} active={tab} onChange={setTab}/>
        <BotaoP onClick={abrirAdd}>+ Nova Pastagem</BotaoP>
      </div>
      {tab==="lista"&&(
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
          {pastagens.map(p=>{
            const ocup=p.capacidade>0?p.atual/p.capacidade:0;
            const sc=sCor(p.status),tc=tCor(p.tipo);
            return(
              <Card key={p.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div>
                    <div style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>🌿 {p.nome}</div>
                    <div style={{display:"flex",gap:6,marginTop:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:11,color:"#6b7280"}}>{p.area} ha</span>
                      <span style={{padding:"1px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:tc+"22",color:tc}}>{p.tipo}</span>
                      <span style={{padding:"1px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:sc+"22",color:sc}}>{p.status}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:6}}>
                    <BotaoEdit onClick={()=>abrirEdit(p)}/>
                    <BotaoDel onClick={()=>excluir(p.id,p.nome)}>🗑</BotaoDel>
                  </div>
                </div>
                <div style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#6b7280",marginBottom:4}}>
                    <span>{p.atual}/{p.capacidade} cab.</span>
                    <span>{p.atual===0?"Vazio":`${Math.round(ocup*100)}%`}</span>
                  </div>
                  <div style={{height:10,background:"#f3f4f6",borderRadius:5,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${Math.min(ocup*100,100)}%`,background:ocup>=0.9?"#e76f51":ocup>=0.5?"#2d6a4f":"#d4a017",borderRadius:5}}/>
                  </div>
                </div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{p.capacidade>0?((p.capacidade/p.area).toFixed(1)):0} UA/ha</div>
                {p.capim&&<div style={{fontSize:11,color:"#6b7280",marginTop:2}}>🌾 {p.capim}</div>}
                {p.dtPlantio&&<div style={{fontSize:11,color:"#9ca3af"}}>Plantio: {p.dtPlantio}</div>}
                {config.mapsApiKey&&(
                  <button onClick={()=>setMapaModal(p)} style={{marginTop:8,padding:"5px 10px",fontSize:11,background:"none",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",color:"#2d6a4f",fontWeight:600}}>
                    🗺️ {p.coordsJson?"Ver no Mapa":"Demarcar"}
                  </button>
                )}
              </Card>
            );
          })}
        </div>
      )}
      {tab==="mapa"&&(
        <Card>
          {!config.mapsApiKey?(
            <div style={{textAlign:"center",padding:40}}>
              <div style={{fontSize:40,marginBottom:12}}>🗺️</div>
              <div style={{fontSize:16,fontWeight:700,color:"#1b4332",marginBottom:8}}>Mapa não configurado</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Configure a chave da API do Google Maps em <strong>Configurações do Sistema</strong> para visualizar as pastagens no mapa.</div>
            </div>
          ):(
            <MapaGeral pastagens={pastagens} config={config}/>
          )}
        </Card>
      )}
      {modal&&(
        <Modal title={editItem?"Editar Pastagem":"Nova Pastagem"} onClose={fechar} largura={600}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Nome *","nome","text",true)}
            {F("Tipo *","tipo","text",true,TIPO_PASTO)}
            {F("Área (ha) *","area","number",true)}
            {F("Capacidade (UA) *","capacidade","number",true)}
            {F("Ocupação atual","atual","number")}
            {F("Status *","status","text",true,STATUS_PASTO)}
            <div style={{gridColumn:"1/-1"}}>{F("Tipo de capim","capim","text",false,CAPINS)}</div>
            {F("Data de plantio","dtPlantio","month")}
          </div>
          <Campo label="Observações" value={form.obs||""} onChange={v=>setForm({...form,obs:v})}/>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
            <BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP>
          </div>
        </Modal>
      )}
      {mapaModal&&config.mapsApiKey&&(
        <MapaDemarcacao pastagem={mapaModal} config={config}
          onSalvar={coordsJson=>{setPastagens(prev=>prev.map(p=>p.id===mapaModal.id?{...p,coordsJson}:p));setMapaModal(null);}}
          onFechar={()=>setMapaModal(null)}/>
      )}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}
function MapaDemarcacao({pastagem,config,onSalvar,onFechar}){
  const mapRef=useRef(null);const mapObj=useRef(null);
  const mapsLoaded=useGoogleMaps(config.mapsApiKey);
  const [instrucao,setInstrucao]=useState("Clique no mapa para marcar vértices. Mín. 3 pontos.");
  const [area,setArea]=useState(null);
  useEffect(()=>{
    if(!mapsLoaded||!mapRef.current||mapObj.current) return;
    const map=new window.google.maps.Map(mapRef.current,{center:{lat:pastagem.lat||config.lat||-14.86,lng:pastagem.lng||config.lng||-39.26},zoom:config.zoom||15,mapTypeId:"satellite"});
    mapObj.current=map;
    const pontos=[],mks=[];
    const poly=new window.google.maps.Polyline({strokeColor:"#d4a017",strokeWeight:2});poly.setMap(map);
    if(pastagem.coordsJson){
      try{
        const coords=JSON.parse(pastagem.coordsJson);
        const p2=new window.google.maps.Polygon({paths:coords,strokeColor:"#52b788",strokeWeight:2,fillColor:"#52b788",fillOpacity:0.3});p2.setMap(map);
      }catch(e){}
    }
    map.addListener("click",e=>{
      pontos.push({lat:e.latLng.lat(),lng:e.latLng.lng()});
      mks.push(new window.google.maps.Marker({position:pontos[pontos.length-1],map,icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:5,fillColor:"#d4a017",fillOpacity:1,strokeWeight:1,strokeColor:"white"}}));
      poly.setPath(pontos);
      setInstrucao(`${pontos.length} ponto(s). Continue ou clique "Salvar".`);
    });
    const ctrl=document.createElement("div");ctrl.style.cssText="margin:10px;display:flex;gap:8px;";
    const bs=document.createElement("button");bs.textContent="✅ Salvar";bs.style.cssText="padding:8px 14px;background:#1b4332;color:white;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;";
    bs.onclick=()=>{
      if(pontos.length<3){alert("Mínimo 3 pontos.");return;}
      const p3=new window.google.maps.Polygon({paths:[...pontos],strokeColor:"#52b788",strokeWeight:2,fillColor:"#52b788",fillOpacity:0.3});p3.setMap(map);
      poly.setPath([]);mks.forEach(m=>m.setMap(null));
      let ha=0;
      if(window.google.maps.geometry){ha=(window.google.maps.geometry.spherical.computeArea(pontos.map(p=>new window.google.maps.LatLng(p.lat,p.lng)))/10000).toFixed(2);}
      setArea(ha);setInstrucao(`Demarcação salva! Área: ${ha} ha.`);
      onSalvar(JSON.stringify(pontos));
    };
    const bl=document.createElement("button");bl.textContent="🗑 Limpar";bl.style.cssText="padding:8px 12px;background:#e76f51;color:white;border:none;border-radius:6px;cursor:pointer;font-size:12px;";
    bl.onclick=()=>{pontos.length=0;mks.forEach(m=>m.setMap(null));mks.length=0;poly.setPath([]);setArea(null);setInstrucao("Clique no mapa para marcar vértices.");};
    ctrl.appendChild(bs);ctrl.appendChild(bl);
    map.controls[window.google.maps.ControlPosition.TOP_CENTER].push(ctrl);
  },[mapsLoaded]);
  return(
    <Modal title={`🗺️ Demarcar — ${pastagem.nome}`} onClose={onFechar} largura={800}>
      {!mapsLoaded?<div style={{textAlign:"center",padding:40,color:"#6b7280"}}>⏳ Carregando Google Maps…</div>:(
        <>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:10,padding:"8px 12px",background:"#f0faf4",borderRadius:6}}>
            ℹ️ {instrucao}{area&&<span style={{marginLeft:12,color:"#1b4332",fontWeight:700}}>Área: {area} ha</span>}
          </div>
          <div ref={mapRef} style={{width:"100%",height:480,borderRadius:8,overflow:"hidden"}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><BotaoSec onClick={onFechar}>✕ Fechar</BotaoSec></div>
        </>
      )}
    </Modal>
  );
}
function MapaGeral({pastagens,config}){
  const mapRef=useRef(null);const mapsLoaded=useGoogleMaps(config.mapsApiKey);
  useEffect(()=>{
    if(!mapsLoaded||!mapRef.current) return;
    const map=new window.google.maps.Map(mapRef.current,{center:{lat:config.lat||-14.86,lng:config.lng||-39.26},zoom:config.zoom||13,mapTypeId:"satellite"});
    const tCor=t=>t==="Corte"?"#457b9d":t==="Leiteiro"?"#52b788":t==="Misto"?"#d4a017":"#9ca3af";
    pastagens.forEach(p=>{
      if(!p.coordsJson) return;
      try{
        const coords=JSON.parse(p.coordsJson);
        const poly=new window.google.maps.Polygon({paths:coords,strokeColor:tCor(p.tipo),strokeWeight:2,fillColor:tCor(p.tipo),fillOpacity:0.35});
        poly.setMap(map);
        const info=new window.google.maps.InfoWindow({content:`<div style="font-size:13px;padding:4px"><strong>${p.nome}</strong><br/>${p.area} ha · ${p.atual}/${p.capacidade} cab.<br/>${p.status}</div>`});
        poly.addListener("click",e=>info.setPosition(e.latLng)||info.open(map));
      }catch(e){}
      if(p.lat&&p.lng){
        const mk=new window.google.maps.Marker({position:{lat:p.lat,lng:p.lng},map,label:{text:p.nome.slice(0,8),fontSize:"10px",color:"white"},icon:{path:window.google.maps.SymbolPath.CIRCLE,scale:8,fillColor:tCor(p.tipo),fillOpacity:0.8,strokeWeight:1,strokeColor:"white"}});
      }
    });
  },[mapsLoaded,pastagens]);
  if(!mapsLoaded) return <div style={{textAlign:"center",padding:40,color:"#6b7280"}}>⏳ Carregando mapa…</div>;
  return <div ref={mapRef} style={{width:"100%",height:520,borderRadius:8,overflow:"hidden"}}/>;
}

// ── FINANCIAMENTOS ────────────────────────────────────────────────────
function FinanciamentosView({financiamentos,setFinanciamentos,setDespesas}){
  const [tab,setTab]=useState("lista");
  const [modal,setModal]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [confirm,setConfirm]=useState(null);
  const [detalhe,setDetalhe]=useState(null);
  const [pgModal,setPgModal]=useState(null);

  const abrirAdd=()=>{setEditItem(null);setForm({sistema:"SAC",carencia:0,status:"Ativo",dtContratacao:hoje()});setModal(true);};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal(true);};
  const fechar=()=>{setModal(false);setEditItem(null);setForm({});};

  const getTabela=f=>f.sistema==="SAC"?calcTabelaSAC(f):calcTabelaPRICE(f);
  const getSaldo=f=>{const t=getTabela(f);const p=t.find(p=>!(f.pagamentos||[]).includes(p.parcela));return p?p.saldo:0;};
  const getProxParcela=f=>{const t=getTabela(f);return t.find(p=>!(f.pagamentos||[]).includes(p.parcela));};

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração?":"Confirmar inclusão?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid(),valor:Number(form.valor),taxa:Number(form.taxa),carencia:Number(form.carencia||0),prazo:Number(form.prazo),pagamentos:editItem?.pagamentos||[]};
      setFinanciamentos(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };
  const excluir=(id,nome)=>{
    setConfirm({msg:`Excluir "${nome}"?`,danger:true,onSim:()=>{setFinanciamentos(prev=>prev.filter(x=>x.id!==id));setConfirm(null);}});
  };
  const pagar=(fin,parc)=>{
    setConfirm({msg:`Registrar pagamento parcela ${parc.parcela} — ${fmt(parc.prestacao)}? Será lançada como despesa.`,danger:false,onSim:()=>{
      setFinanciamentos(prev=>prev.map(f=>f.id===fin.id?{...f,pagamentos:[...(f.pagamentos||[]),parc.parcela]}:f));
      setDespesas(prev=>[...prev,{id:uid(),data:hoje(),categoria:"Financiamentos",subcategoria:"Amortização",valor:parc.prestacao,descricao:`${fin.banco} – ${fin.finalidade} – Parc.${parc.parcela}/${fin.prazo}`,fornecedor:fin.banco,nf:null}]);
      setPgModal(null);setConfirm(null);
    }});
  };

  const F=(label,campo,type="text",req=false,opts=null)=>
    <Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts}/>;

  const ativos=financiamentos.filter(f=>f.status==="Ativo");
  const dividaTotal=ativos.reduce((s,f)=>s+getSaldo(f),0);
  const proxPagamentos=ativos.map(f=>({...f,prox:getProxParcela(f),saldo:getSaldo(f)})).filter(f=>f.prox).sort((a,b)=>(a.prox.vencimento||"").localeCompare(b.prox.vencimento||""));

  const tCor=t=>t==="PRONAF"?"#2d6a4f":t==="Custeio"?"#d4a017":t==="Investimento"?"#457b9d":"#52b788";

  return(
    <div>
      <SecHeader title="Financiamentos Rurais" sub="Contratos SAC e PRICE — amortização e pagamentos"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Dívida Total" value={fmt(dividaTotal)} color="#e76f51" icon="🏦" trend={dividaTotal>0?-1:0}/>
        <KpiCard label="Contratos Ativos" value={`${ativos.length}`} color="#457b9d" icon="📄" trend={0}/>
        <KpiCard label="Próx. Vencimento" value={proxPagamentos.length>0?fmtData(proxPagamentos[0].prox?.vencimento):"—"} color="#d4a017" icon="📅" trend={0}/>
        <KpiCard label="Valor Próx." value={proxPagamentos.length>0?fmt(proxPagamentos[0].prox?.prestacao):fmt(0)} color="#2d6a4f" icon="💰" trend={0}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <TabBar tabs={[{id:"lista",label:"📋 Contratos"},{id:"posicao",label:"📊 Posição Consolidada"}]} active={tab} onChange={setTab}/>
        <BotaoP onClick={abrirAdd}>+ Novo Financiamento</BotaoP>
      </div>
      {tab==="lista"&&(
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {financiamentos.map(f=>{
            const saldo=getSaldo(f);const prox=getProxParcela(f);
            const tc=tCor(f.tipo);
            return(
              <Card key={f.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>🏦 {f.banco}</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,background:tc+"22",color:tc}}>{f.tipo}</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:f.sistema==="SAC"?"#dbeafe":"#f3e8ff",color:f.sistema==="SAC"?"#1d4ed8":"#7c3aed"}}>{f.sistema}</span>
                    </div>
                    <div style={{fontSize:13,color:"#374151",marginBottom:2}}>{f.finalidade}</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>Contratado: {fmtData(f.dtContratacao)} · Taxa: {f.taxa}% a.a. · Prazo: {f.prazo}m · Carência: {f.carencia}m</div>
                  </div>
                  <div style={{textAlign:"right",minWidth:140}}>
                    <div style={{fontSize:11,color:"#6b7280"}}>Saldo devedor</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#e76f51"}}>{fmt(saldo)}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>de {fmt(f.valor)}</div>
                  </div>
                </div>
                <div style={{height:4,background:"#f3f4f6",borderRadius:2,marginTop:8,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min((saldo/f.valor)*100,100)}%`,background:"#e76f51",borderRadius:2}}/>
                </div>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button onClick={()=>setDetalhe(f)} style={{padding:"6px 12px",fontSize:12,background:"#f0faf4",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",color:"#1b4332",fontWeight:600}}>📋 Tabela Amortização</button>
                  {prox&&<button onClick={()=>setPgModal({fin:f,parc:prox})} style={{padding:"6px 12px",fontSize:12,background:"#1b4332",border:"none",borderRadius:6,cursor:"pointer",color:"white",fontWeight:600}}>💳 Pagar Parcela {prox.parcela}</button>}
                  <BotaoEdit onClick={()=>abrirEdit(f)}/>
                  <BotaoDel onClick={()=>excluir(f.id,f.banco+" – "+f.finalidade)}>🗑</BotaoDel>
                </div>
              </Card>
            );
          })}
        </div>
      )}
      {tab==="posicao"&&(
        <div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <Card>
              <CardTitle>Saldo por Contrato</CardTitle>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ativos.map(f=>({name:f.banco.slice(0,14),saldo:Math.round(getSaldo(f))}))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>fmt(v)}/><Bar dataKey="saldo" name="Saldo" fill="#e76f51" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardTitle>Posição consolidada</CardTitle>
              {proxPagamentos.map((f,i)=>(
                <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{f.banco}</div>
                      <div style={{fontSize:11,color:"#6b7280"}}>{f.finalidade}</div>
                      <div style={{fontSize:11,color:"#9ca3af"}}>Próx: {fmtData(f.prox?.vencimento)} — {fmt(f.prox?.prestacao)}</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:15,fontWeight:700,color:"#e76f51"}}>{fmt(f.saldo)}</div>
                      <div style={{fontSize:10,color:"#9ca3af"}}>{f.sistema}</div>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:12,padding:"10px 0",borderTop:"2px solid #1b4332",display:"flex",justifyContent:"space-between"}}>
                <span style={{fontWeight:700,color:"#1b4332"}}>Total dívida bancária</span>
                <span style={{fontSize:16,fontWeight:800,color:"#e76f51"}}>{fmt(dividaTotal)}</span>
              </div>
            </Card>
          </div>
        </div>
      )}
      {detalhe&&(()=>{
        const tab=getTabela(detalhe);const pagas=detalhe.pagamentos||[];
        return(
          <Modal title={`Tabela Amortização — ${detalhe.banco}`} onClose={()=>setDetalhe(null)} largura={800}>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:10}}>{detalhe.finalidade} · {detalhe.sistema} · {detalhe.taxa}% a.a.</div>
            <div style={{maxHeight:400,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead style={{position:"sticky",top:0}}>
                  <tr>{["Parc.","Vencimento","Saldo","Amortização","Juros","Prestação","Tipo","Status"].map((h,i)=><TH key={i} s={h}/>)}</tr>
                </thead>
                <tbody>
                  {tab.map((p,i)=>{
                    const paga=pagas.includes(p.parcela);
                    return(
                      <tr key={i} style={{background:paga?"#f0faf4":i%2?"#fafafa":"white"}}>
                        <TD style={{fontWeight:700}}>{p.parcela}</TD>
                        <TD style={{color:"#6b7280"}}>{p.vencimento}</TD>
                        <TD>{fmt(p.saldo)}</TD>
                        <TD style={{color:"#2d6a4f"}}>{p.amortizacao>0?fmt(p.amortizacao):"—"}</TD>
                        <TD style={{color:"#e76f51"}}>{fmt(p.juros)}</TD>
                        <TD style={{fontWeight:700,color:"#1b4332"}}>{fmt(p.prestacao)}</TD>
                        <TD><span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:p.tipo==="Carência"?"#fef3c7":"#f0faf4",color:p.tipo==="Carência"?"#b45309":"#2d6a4f"}}>{p.tipo}</span></TD>
                        <TD><span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:paga?"#d8f3dc":"#fee2e2",color:paga?"#2d6a4f":"#dc2626"}}>{paga?"✅ Pago":"Pendente"}</span></TD>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><BotaoSec onClick={()=>setDetalhe(null)}>Fechar</BotaoSec></div>
          </Modal>
        );
      })()}
      {pgModal&&(
        <Modal title="💳 Registrar Pagamento" onClose={()=>setPgModal(null)} largura={440}>
          <div style={{marginBottom:16,padding:14,background:"#f8faf9",borderRadius:8}}>
            <div style={{fontSize:13,fontWeight:700}}>{pgModal.fin.banco} — Parcela {pgModal.parc.parcela}/{pgModal.fin.prazo}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:10,fontSize:12}}>
              <div><span style={{color:"#6b7280"}}>Vencimento:</span> <strong>{pgModal.parc.vencimento}</strong></div>
              <div><span style={{color:"#6b7280"}}>Prestação:</span> <strong style={{color:"#1b4332"}}>{fmt(pgModal.parc.prestacao)}</strong></div>
              <div><span style={{color:"#6b7280"}}>Amortização:</span> {fmt(pgModal.parc.amortizacao)}</div>
              <div><span style={{color:"#6b7280"}}>Juros:</span> {fmt(pgModal.parc.juros)}</div>
            </div>
          </div>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Será lançado automaticamente como despesa em <strong>Financiamentos</strong>.</div>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <BotaoSec onClick={()=>setPgModal(null)}>Cancelar</BotaoSec>
            <BotaoP onClick={()=>pagar(pgModal.fin,pgModal.parc)}>✅ Confirmar Pagamento</BotaoP>
          </div>
        </Modal>
      )}
      {modal&&(
        <Modal title={editItem?"Editar Financiamento":"Novo Financiamento"} onClose={fechar} largura={680}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            {F("Banco *","banco","text",true,["Banco do Brasil","BNB – Nordeste","Caixa Econômica","Sicoob","Sicredi","Bradesco","Outros"])}
            {F("Tipo *","tipo","text",true,TIPO_FINANC)}
            {F("Finalidade *","finalidade","text",true)}
            {F("Valor (R$) *","valor","number",true)}
            {F("Taxa (% a.a.) *","taxa","number",true)}
            {F("Carência (meses)","carencia","number")}
            {F("Prazo total (meses) *","prazo","number",true)}
            {F("Sistema *","sistema","text",true,SISTEMA_AMORT)}
            {F("Data contratação *","dtContratacao","date",true)}
            {F("Status","status","text",false,["Ativo","Quitado","Renegociado"])}
            <div style={{gridColumn:"1/-1"}}>{F("Garantias","garantias","text")}</div>
          </div>
          {form.valor&&form.taxa&&form.prazo&&(()=>{
            const simul=form.sistema==="SAC"?calcTabelaSAC({...form,valor:Number(form.valor),taxa:Number(form.taxa),carencia:Number(form.carencia||0),prazo:Number(form.prazo),dtContratacao:form.dtContratacao||hoje(),pagamentos:[]}):calcTabelaPRICE({...form,valor:Number(form.valor),taxa:Number(form.taxa),carencia:Number(form.carencia||0),prazo:Number(form.prazo),dtContratacao:form.dtContratacao||hoje(),pagamentos:[]});
            const normal=simul.find(p=>p.tipo==="Normal");
            return normal?<div style={{padding:12,background:"#f0faf4",borderRadius:8,marginBottom:12,fontSize:12}}><strong>Simulação:</strong> 1ª parcela normal: <strong style={{color:"#1b4332"}}>{fmt(normal.prestacao)}</strong> em {normal.vencimento}{Number(form.carencia||0)>0&&<span style={{color:"#b45309"}}> · Carência {form.carencia}m (só juros: {fmt(simul[0].prestacao)})</span>}</div>:null;
          })()}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP>
          </div>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── LANÇAMENTOS ───────────────────────────────────────────────────────
function LancamentosView({producao,setProducao,despesas,setDespesas,receitas,setReceitas,funcionarios,setFuncionarios,animaisCorte,setAnimaisCorte,vacinas,setVacinas}){
  const [tab,setTab]=useState("producao");
  const [modal,setModal]=useState(null);
  const [editItem,setEditItem]=useState(null);
  const [confirm,setConfirm]=useState(null);
  const [form,setForm]=useState({});
  const fileRef=useRef();

  const abrirAdd=()=>{setEditItem(null);setForm({data:hoje()});setModal(tab);};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal(tab);};
  const fechar=()=>{setModal(null);setEditItem(null);setForm({});};

  const F=(label,campo,type="text",req=false,opts=null)=>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts}/>;

  const salvar=()=>{
    setConfirm({msg:editItem?"Confirmar alteração?":"Confirmar inclusão?",danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid()};
      if(tab==="producao") setProducao(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="despesas") setDespesas(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="receitas") setReceitas(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="funcionarios") setFuncionarios(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,{...item,ativo:true}]);
      if(tab==="corte") setAnimaisCorte(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      if(tab==="sanitario") setVacinas(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };
  const excluir=(id,nome)=>{
    setConfirm({msg:`Excluir "${nome}"?`,danger:true,onSim:()=>{
      if(tab==="producao") setProducao(prev=>prev.filter(x=>x.id!==id));
      if(tab==="despesas") setDespesas(prev=>prev.filter(x=>x.id!==id));
      if(tab==="receitas") setReceitas(prev=>prev.filter(x=>x.id!==id));
      if(tab==="funcionarios") setFuncionarios(prev=>prev.filter(x=>x.id!==id));
      if(tab==="corte") setAnimaisCorte(prev=>prev.filter(x=>x.id!==id));
      if(tab==="sanitario") setVacinas(prev=>prev.filter(x=>x.id!==id));
      setConfirm(null);
    }});
  };
  const handleNF=e=>{const file=e.target.files[0];if(!file) return;const r=new FileReader();r.onload=ev=>setForm(f=>({...f,nf:{nome:file.name,tamanho:`${(file.size/1024).toFixed(0)} KB`,url:ev.target.result}}));r.readAsDataURL(file);};
  const subcatOpts=form.categoria?(CATEGORIAS_DESPESA[form.categoria]||[]):[];
  const BotaoAdd=({label})=><button onClick={abrirAdd} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>+ {label}</button>;
  return(
    <div>
      <SecHeader title="Lançamentos" sub="Cadastro, edição e exclusão de todos os registros"/>
      <TabBar tabs={[{id:"producao",label:"🌾 Produção"},{id:"despesas",label:"💸 Despesas"},{id:"receitas",label:"💰 Receitas"},{id:"funcionarios",label:"👥 Funcionários"},{id:"corte",label:"🐂 Gado Corte"},{id:"sanitario",label:"💉 Sanitário"}]} active={tab} onChange={setTab}/>
      {tab==="producao"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Produção"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Mês/Data","Cacau (kg)","Leite (L)","Coco (un)","Responsável","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{[...producao].sort((a,b)=>b.data.localeCompare(a.data)).map((p,i)=>(
            <tr key={p.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{fontWeight:600}}>{p.mes||p.data}</TD><TD>{fmtN(p.cacauKg)} kg</TD><TD>{fmtN(p.leiteL)} L</TD><TD>{fmtN(p.cocoUn)} un</TD>
              <TD style={{color:"#6b7280"}}>{p.responsavel}</TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(p)}/><BotaoDel onClick={()=>excluir(p.id,p.mes||p.data)}>🗑</BotaoDel></div></TD>
            </tr>
          ))}</tbody>
        </table></Card>
      </>)}
      {tab==="despesas"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Despesa"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Data","Categoria","Sub.","Descrição","Fornecedor","Valor","NF","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{[...despesas].sort((a,b)=>b.data.localeCompare(a.data)).map((d,i)=>(
            <tr key={d.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{color:"#6b7280"}}>{d.data}</TD><TD>{d.categoria}</TD><TD style={{color:"#6b7280"}}>{d.subcategoria}</TD>
              <TD>{d.descricao}</TD><TD style={{color:"#6b7280"}}>{d.fornecedor}</TD>
              <TD style={{fontWeight:700,color:"#e76f51"}}>{fmt(d.valor)}</TD>
              <TD>{d.nf?<a href={d.nf.url} target="_blank" rel="noreferrer" style={{fontSize:11,color:"#2d6a4f",textDecoration:"none",fontWeight:600}}>📄 {d.nf.nome}</a>:<span style={{color:"#9ca3af"}}>—</span>}</TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(d)}/><BotaoDel onClick={()=>excluir(d.id,d.descricao)}>🗑</BotaoDel></div></TD>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#1b4332"}}><td colSpan={5} style={{padding:"9px 12px",color:"#95d5b2",fontWeight:700}}>Total</td><td style={{padding:"9px 12px",color:"white",fontWeight:800}}>{fmt(despesas.reduce((s,d)=>s+Number(d.valor||0),0))}</td><td colSpan={2}/></tr></tfoot>
        </table></Card>
      </>)}
      {tab==="receitas"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Nova Receita"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Data","Atividade","Qtd","Unitário","Valor","Comprador","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
            <tr key={r.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{color:"#6b7280"}}>{r.data}</TD><TD style={{fontWeight:600,color:"#1b4332"}}>{r.atividade}</TD>
              <TD>{r.qtd}</TD><TD>{r.unitario}</TD><TD style={{fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</TD>
              <TD style={{color:"#6b7280"}}>{r.comprador}</TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(r)}/><BotaoDel onClick={()=>excluir(r.id,r.atividade+" "+r.data)}>🗑</BotaoDel></div></TD>
            </tr>
          ))}</tbody>
          <tfoot><tr style={{background:"#1b4332"}}><td colSpan={4} style={{padding:"9px 12px",color:"#95d5b2",fontWeight:700}}>Total</td><td style={{padding:"9px 12px",color:"white",fontWeight:800}}>{fmt(receitas.reduce((s,r)=>s+Number(r.valor||0),0))}</td><td colSpan={2}/></tr></tfoot>
        </table></Card>
      </>)}
      {tab==="funcionarios"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Funcionário"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Nome","Cargo","Atividade","Salário","Filhos","Sal. Família","Status","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{funcionarios.map((f,i)=>{const sf=calcSalFamilia(f.salario,f.numFilhos||0);return(
            <tr key={f.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{fontWeight:600}}>{f.nome}</TD><TD style={{color:"#6b7280"}}>{f.cargo}</TD><TD>{f.atividade}</TD>
              <TD>{fmt(f.salario)}</TD><TD style={{textAlign:"center"}}>{f.numFilhos||0}</TD>
              <TD style={{color:"#2d6a4f",fontWeight:sf>0?600:400}}>{sf>0?fmt(sf):"—"}</TD>
              <TD><span style={{padding:"2px 9px",borderRadius:8,fontSize:11,fontWeight:600,background:f.ativo!==false?"#d8f3dc":"#fee2e2",color:f.ativo!==false?"#2d6a4f":"#dc2626"}}>{f.ativo!==false?"Ativo":"Inativo"}</span></TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(f)}/><BotaoDel onClick={()=>excluir(f.id,f.nome)}>🗑</BotaoDel></div></TD>
            </tr>
          );})}
          </tbody>
        </table></Card>
      </>)}
      {tab==="corte"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Animal"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Brinco","Categoria","Peso Prev.","Peso Atual","Arrobas","Entrada","Prev.Abate","Status","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{animaisCorte.map((a,i)=>{
            const cor=a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
            const bg=a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
            return(
              <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                <TD style={{fontWeight:700}}>{a.brinco}</TD><TD>{a.categoria}</TD>
                <TD>{a.pesoPrev} kg</TD><TD style={{fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</TD>
                <TD style={{color:"#d4a017",fontWeight:600}}>{(a.pesoAtual/15).toFixed(1)} @</TD>
                <TD style={{color:"#6b7280"}}>{a.dtEntrada}</TD><TD>{a.previsaoAbate}</TD>
                <TD><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor}}>{a.status}</span></TD>
                <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(a)}/><BotaoDel onClick={()=>excluir(a.id,a.brinco)}>🗑</BotaoDel></div></TD>
              </tr>
            );
          })}</tbody>
        </table></Card>
      </>)}
      {tab==="sanitario"&&(<>
        <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}><BotaoAdd label="Novo Evento Sanitário"/></div>
        <Card style={{padding:0,overflow:"hidden"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Data","Rebanho","Lote","Vacina","Qtd","Custo","Status","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{const pend=v.status==="Pendente";return(
            <tr key={v.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</TD>
              <TD><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f"}}>{v.rebanho}</span></TD>
              <TD>{v.lote}</TD><TD>{v.vacina}</TD><TD>{v.qtd} cab.</TD><TD>{fmt(v.custo)}</TD>
              <TD><span style={{padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f"}}>{v.status}</span></TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(v)}/><BotaoDel onClick={()=>excluir(v.id,v.vacina)}>🗑</BotaoDel></div></TD>
            </tr>
          );})}
          </tbody>
        </table></Card>
      </>)}
      {modal==="producao"&&(<Modal title={editItem?"Editar Produção":"Nova Produção"} onClose={fechar} largura={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>{F("Data *","data","date",true)}{F("Mês ref.","mes")}{F("Cacau (kg) *","cacauKg","number",true)}{F("Leite (L) *","leiteL","number",true)}{F("Coco (un) *","cocoUn","number",true)}{F("Responsável","responsavel")}</div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {modal==="despesas"&&(<Modal title={editItem?"Editar Despesa":"Nova Despesa"} onClose={fechar} largura={600}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {F("Data *","data","date",true)}{F("Categoria *","categoria","text",true,Object.keys(CATEGORIAS_DESPESA))}
          {subcatOpts.length>0&&F("Subcategoria","subcategoria","text",false,subcatOpts)}
          {F("Valor (R$) *","valor","number",true)}{F("Descrição *","descricao","text",true)}{F("Fornecedor","fornecedor")}
        </div>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Nota Fiscal</label>
          <input type="file" accept=".pdf,image/*" ref={fileRef} onChange={handleNF} style={{fontSize:13}}/>
          {form.nf&&<div style={{marginTop:6,padding:"6px 10px",background:"#f0faf4",borderRadius:6,fontSize:12,color:"#2d6a4f"}}>📄 {form.nf.nome}</div>}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {modal==="receitas"&&(<Modal title={editItem?"Editar Receita":"Nova Receita"} onClose={fechar} largura={520}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {F("Data *","data","date",true)}{F("Atividade *","atividade","text",true,["Cacau","Leite","Coco","Gado Corte","Outros"])}
          {F("Valor (R$) *","valor","number",true)}{F("Qtd/Detalhes","qtd")}{F("Unitário","unitario")}{F("Comprador","comprador")}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {modal==="funcionarios"&&(<Modal title={editItem?"Editar Funcionário":"Novo Funcionário"} onClose={fechar} largura={560}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {F("Nome *","nome","text",true)}{F("Cargo *","cargo","text",true)}
          {F("Atividade","atividade","text",false,["Geral","Cacau","Coco","Leiteiro","Gado Corte"])}
          {F("Salário Bruto (R$) *","salario","number",true)}{F("Nº filhos","numFilhos","number")}
        </div>
        {Number(form.salario||0)<=1906.04&&Number(form.numFilhos||0)>0&&<div style={{padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12}}>✅ Sal. família: {fmt(calcSalFamilia(Number(form.salario),Number(form.numFilhos)))} ({form.numFilhos}×R$65)</div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {modal==="corte"&&(<Modal title={editItem?"Editar Animal":"Novo Animal"} onClose={fechar} largura={580}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {F("Brinco *","brinco","text",true)}{F("Categoria","categoria","text",false,["Boi Gordo","Garrote","Novilha","Bezerro Rec."])}
          {F("Peso entrada (kg)","pesoPrev","number")}{F("Peso atual (kg) *","pesoAtual","number",true)}
          {F("Data entrada","dtEntrada")}{F("Prev. abate","previsaoAbate")}{F("Pasto/Local","pasto")}{F("Status","status","text",false,["Em engorda","Pronto p/ Abate","Recria"])}
        </div>
        {form.pesoAtual&&<div style={{padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12}}>Arrobas: {(Number(form.pesoAtual)/15).toFixed(1)} @ · Receita est.: {fmt((Number(form.pesoAtual)/15)*325)}</div>}
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {modal==="sanitario"&&(<Modal title={editItem?"Editar Evento":"Novo Evento Sanitário"} onClose={fechar} largura={540}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
          {F("Data *","data","date",true)}{F("Rebanho *","rebanho","text",true,["Leiteiro","Corte","Ambos"])}
          {F("Lote/Grupo","lote")}{F("Vacina/Procedimento *","vacina","text",true)}
          {F("Qtd animais","qtd","number")}{F("Custo (R$)","custo","number")}{F("Status","status","text",false,["Pendente","Realizado","Cancelado"])}
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── USUÁRIOS ──────────────────────────────────────────────
function UsuariosView({usuarios,setUsuarios}){
  const [modal,setModal]=useState(false);
  const [editItem,setEditItem]=useState(null);
  const [form,setForm]=useState({});
  const [confirm,setConfirm]=useState(null);
  const [showSenhas,setShowSenhas]=useState({});
  const abrirAdd=()=>{setEditItem(null);setForm({ativo:true,perfil:"Operacional"});setModal(true);};
  const abrirEdit=item=>{setEditItem(item);setForm({...item});setModal(true);};
  const fechar=()=>{setModal(false);setEditItem(null);setForm({});};
  const salvar=()=>{
    setConfirm({msg:editItem?`Confirmar alterações em "${form.nome}"?`:`Criar usuário "${form.nome}"?`,danger:false,onSim:()=>{
      const item={...form,id:editItem?.id||uid()};
      setUsuarios(prev=>editItem?prev.map(x=>x.id===item.id?item:x):[...prev,item]);
      fechar();setConfirm(null);
    }});
  };
  const excluir=(id,nome)=>{
    setConfirm({msg:`Excluir "${nome}"? Perderá o acesso imediatamente.`,danger:true,onSim:()=>{setUsuarios(prev=>prev.filter(x=>x.id!==id));setConfirm(null);}});
  };
  const F=(label,campo,type="text",req=false,opts=null)=>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts}/>;
  const nivelCor=p=>p==="Administrador"?"#1b4332":p==="Gerente"?"#457b9d":p==="Financeiro"?"#d4a017":"#52b788";
  return(
    <div>
      <SecHeader title="Gestão de Usuários" sub="Apenas administradores podem criar e editar usuários"/>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,flex:1,marginRight:20}}>
          {NIVEIS.map(n=><div key={n} style={{padding:"10px 14px",background:"white",borderRadius:10,borderLeft:`3px solid ${nivelCor(n)}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"}}>
            <div style={{fontSize:11,color:"#6b7280"}}>{n}</div>
            <div style={{fontSize:18,fontWeight:700,color:nivelCor(n)}}>{usuarios.filter(u=>u.perfil===n).length}</div>
          </div>)}
        </div>
        <BotaoP onClick={abrirAdd}>+ Novo Usuário</BotaoP>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr>{["Nome","Usuário","Senha","Perfil","Status","Ações"].map((h,i)=><TH key={i} s={h}/>)}</tr></thead>
          <tbody>{usuarios.map((u,i)=>(
            <tr key={u.id} style={{background:i%2?"#fafafa":"white"}}>
              <TD style={{fontWeight:600,color:"#1a1a2e"}}>{u.nome}</TD>
              <TD style={{fontFamily:"monospace",color:"#374151"}}>{u.usuario}</TD>
              <TD><div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontFamily:"monospace",fontSize:12}}>{showSenhas[u.id]?u.senha:"••••••••"}</span>
                <button onClick={()=>setShowSenhas(s=>({...s,[u.id]:!s[u.id]}))} style={{background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#9ca3af"}}>{showSenhas[u.id]?"🙈":"👁"}</button>
              </div></TD>
              <TD><span style={{padding:"3px 10px",borderRadius:10,fontSize:12,fontWeight:700,background:nivelCor(u.perfil)+"22",color:nivelCor(u.perfil)}}>{u.perfil}</span></TD>
              <TD><span style={{padding:"3px 9px",borderRadius:8,fontSize:11,fontWeight:600,background:u.ativo!==false?"#d8f3dc":"#fee2e2",color:u.ativo!==false?"#2d6a4f":"#dc2626"}}>{u.ativo!==false?"Ativo":"Inativo"}</span></TD>
              <TD><div style={{display:"flex",gap:6}}><BotaoEdit onClick={()=>abrirEdit(u)}/><BotaoDel onClick={()=>excluir(u.id,u.nome)}>🗑</BotaoDel></div></TD>
            </tr>
          ))}</tbody>
        </table>
      </Card>
      {modal&&(<Modal title={editItem?"Editar Usuário":"Novo Usuário"} onClose={fechar} largura={480}>
        {F("Nome completo *","nome","text",true)}{F("Usuário (login) *","usuario","text",true)}{F("Senha *","senha","text",true)}{F("Perfil *","perfil","text",true,NIVEIS)}
        <div style={{marginBottom:14}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13}}>
            <input type="checkbox" checked={form.ativo!==false} onChange={e=>setForm({...form,ativo:e.target.checked})}/>Usuário ativo
          </label>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10}}><BotaoSec onClick={fechar}>Cancelar</BotaoSec><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
      </Modal>)}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}
// ── CONFIGURAÇÕES ──────────────────────────────────────────
function ConfiguracoesView({config,setConfig}){
  const [form,setForm]=useState({...config});
  const [salvo,setSalvo]=useState(false);
  const [testeMapa,setTesteMapa]=useState(false);
  const mapsLoaded=useGoogleMaps(testeMapa?form.mapsApiKey:"");
  const mapaTesteRef=useRef(null);
  useEffect(()=>{
    if(!testeMapa||!mapsLoaded||!mapaTesteRef.current) return;
    new window.google.maps.Map(mapaTesteRef.current,{center:{lat:Number(form.lat)||-14.86,lng:Number(form.lng)||-39.26},zoom:Number(form.zoom)||14,mapTypeId:"satellite"});
  },[testeMapa,mapsLoaded]);
  const salvar=()=>{
    setConfig({...form,lat:Number(form.lat),lng:Number(form.lng),zoom:Number(form.zoom)});
    setSalvo(true);setTimeout(()=>setSalvo(false),3000);
  };
  const F=(label,campo,type="text",ph="")=><Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} placeholder={ph}/>;
  return(
    <div>
      <SecHeader title="⚙️ Configurações do Sistema" sub="Apenas Administradores têm acesso"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
        <div>
          <Card style={{marginBottom:16}}>
            <CardTitle>🌱 Identificação da Fazenda</CardTitle>
            {F("Nome da fazenda","nomeFazenda","text","Ex: Fazenda Analu & Ana")}
          </Card>
          <Card>
            <CardTitle>🗺️ API Google Maps</CardTitle>
            <div style={{marginBottom:12,padding:12,background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92400e",lineHeight:1.6}}>
              <strong>Como obter a chave:</strong><br/>
              1. Acesse <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" style={{color:"#1b4332"}}>console.cloud.google.com</a><br/>
              2. Crie/selecione um projeto → "APIs e Serviços" → "Credenciais"<br/>
              3. Clique "Criar credenciais" → "Chave de API"<br/>
              4. Ative as APIs: <strong>Maps JavaScript API</strong> e <strong>Geometry Library</strong>
            </div>
            <Campo label="Chave da API Google Maps" value={form.mapsApiKey||""} onChange={v=>setForm({...form,mapsApiKey:v})} placeholder="AIzaSy..."/>
            {form.mapsApiKey&&(
              <div style={{marginTop:8}}>
                <button onClick={()=>setTesteMapa(t=>!t)} style={{padding:"7px 14px",background:"none",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",color:"#2d6a4f",fontSize:12,fontWeight:600}}>
                  {testeMapa?"🙈 Ocultar teste":"🗺️ Testar chave"}
                </button>
                {testeMapa&&<>
                  {!mapsLoaded&&<div style={{padding:16,textAlign:"center",color:"#6b7280",fontSize:13}}>⏳ Carregando…</div>}
                  <div ref={mapaTesteRef} style={{width:"100%",height:200,borderRadius:8,overflow:"hidden",marginTop:8,display:mapsLoaded?"block":"none"}}/>
                  {mapsLoaded&&<div style={{fontSize:11,color:"#2d6a4f",marginTop:4}}>✅ Chave funcionando corretamente!</div>}
                </>}
              </div>
            )}
          </Card>
        </div>
        <div>
          <Card style={{marginBottom:16}}>
            <CardTitle>📍 Centro da Fazenda no Mapa</CardTitle>
            <div style={{fontSize:12,color:"#6b7280",marginBottom:12}}>Centro inicial do mapa de pastagens. Dica: abra o Google Maps, clique com botão direito na fazenda e copie as coordenadas.</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
              {F("Latitude","lat","number","-14.86")}{F("Longitude","lng","number","-39.26")}
            </div>
            {F("Zoom padrão (13–16)","zoom","number","14")}
          </Card>
          <Card>
            <CardTitle>ℹ️ Sobre o Sistema</CardTitle>
            <div style={{display:"grid",gap:8,fontSize:13}}>
              {[["Versão","v3.0 — Abr/2025"],["Módulos","Dashboard, Financeiro, Produção, Manejo, Pastagens, Financiamentos, Lançamentos, Usuários"],["INSS 2025","Progressivo (Port. MPS/MF nº6/2025)"],["Sal. Família","R$ 65,00/filho para sal. ≤ R$ 1.906,04"],["Dados","Sessão do navegador (React state)"]].map(([l,v],i)=>(
                <div key={i} style={{padding:"7px 0",borderBottom:"1px solid #f3f4f6"}}>
                  <div style={{fontSize:11,color:"#6b7280"}}>{l}</div>
                  <div style={{fontSize:12,color:"#374151",marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:12,marginTop:20}}>
        {salvo&&<span style={{padding:"9px 16px",background:"#d8f3dc",borderRadius:8,fontSize:13,color:"#1b4332",fontWeight:600}}>✅ Salvo!</span>}
        <BotaoP onClick={salvar}>💾 Salvar Configurações</BotaoP>
      </div>
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────
function LoginView({onLogin,usuarios,nomeFazenda}){
  const [usuario,setUsuario]=useState("");
  const [senha,setSenha]=useState("");
  const [erro,setErro]=useState("");
  const [show,setShow]=useState(false);
  const handleLogin=()=>{
    const user=usuarios.find(u=>u.usuario===usuario.trim()&&u.senha===senha&&u.ativo!==false);
    if(user){setErro("");onLogin(user);}else setErro("Usuário, senha inválidos ou conta inativa.");
  };
  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#1b4332 0%,#2d6a4f 60%,#52b788 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{background:"white",borderRadius:20,padding:"40px 36px",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.35)"}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{fontSize:48,marginBottom:8}}>🌱</div>
          <div style={{fontSize:22,fontWeight:800,color:"#1b4332"}}>{nomeFazenda||"FazendaGest"}</div>
          <div style={{fontSize:12,color:"#6b7280",marginTop:3}}>Cacau · Leite · Coco · Gado</div>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Usuário</label>
          <input value={usuario} onChange={e=>setUsuario(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="seu usuário" style={{width:"100%",padding:"11px 14px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:10}}>
          <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>Senha</label>
          <div style={{position:"relative"}}>
            <input type={show?"text":"password"} value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="sua senha" style={{width:"100%",padding:"11px 40px 11px 14px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box"}}/>
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af"}}>{show?"🙈":"👁"}</button>
          </div>
        </div>
        {erro&&<div style={{background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#dc2626",marginBottom:10}}>⚠️ {erro}</div>}
        <button onClick={handleLogin} style={{width:"100%",padding:"13px",background:"#1b4332",color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:6}}>Entrar</button>
        <div style={{marginTop:20,background:"#f0faf4",borderRadius:8,padding:12}}>
          <div style={{fontSize:11,fontWeight:700,color:"#2d6a4f",marginBottom:5}}>Acessos disponíveis:</div>
          {usuarios.filter(u=>u.ativo!==false).map((u,i)=><div key={i} style={{fontSize:11,color:"#6b7280",marginBottom:2}}><strong>{u.usuario}</strong> — {u.perfil}</div>)}
        </div>
      </div>
    </div>
  );
}
// ── APP ROOT ──────────────────────────────────────────────
export default function App(){
  const [logado,setLogado]=useState(null);
  const [menu,setMenu]=useState("dashboard");
  const [config,setConfig]=useState(CONFIG_INIT);
  const [usuarios,setUsuarios]=useState(USUARIOS_INIT);
  const [funcionarios,setFuncionarios]=useState(FUNCIONARIOS_INIT);
  const [producao,setProducao]=useState(PRODUCAO_INIT);
  const [despesas,setDespesas]=useState(DESPESAS_INIT);
  const [receitas,setReceitas]=useState(RECEITAS_INIT);
  const [animaisLeiteiro]=useState(ANIMAIS_LEITEIRO_INIT);
  const [animaisCorte,setAnimaisCorte]=useState(ANIMAIS_CORTE_INIT);
  const [vacinas,setVacinas]=useState(VACINAS_INIT);
  const [pastagens,setPastagens]=useState(PASTAGENS_INIT);
  const [financiamentos,setFinanciamentos]=useState(FINANCIAMENTOS_INIT);

  if(!logado) return <LoginView onLogin={u=>{setLogado(u);setMenu("dashboard");}} usuarios={usuarios} nomeFazenda={config.nomeFazenda}/>;

  const MENU_ITEMS=[
    {id:"dashboard",     label:"Dashboard",       icon:"🏠"},
    {id:"financeiro",    label:"Financeiro",       icon:"💰"},
    {id:"producao",      label:"Produção",         icon:"📊"},
    {id:"manejo",        label:"Manejo Pecuário",  icon:"🐄"},
    {id:"pastagens",     label:"Pastagens",        icon:"🌿"},
    {id:"financiamentos",label:"Financiamentos",   icon:"🏦"},
    {id:"lancamentos",   label:"Lançamentos",      icon:"✏️"},
    {id:"usuarios",      label:"Usuários",         icon:"👤"},
    {id:"configuracoes", label:"Configurações",    icon:"⚙️"},
  ].filter(it=>temAcesso(logado.perfil,it.id));

  const nivelCor=p=>p==="Administrador"?"#95d5b2":p==="Gerente"?"#a8dadc":p==="Financeiro"?"#ffd166":"#b7e4c7";

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f0f4f1",fontSize:14}}>
      <div style={{width:215,background:"#1b4332",color:"white",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{padding:"16px 18px 12px",borderBottom:"1px solid #2d6a4f"}}>
          <div style={{fontSize:13,fontWeight:800,color:"#95d5b2"}}>🌱 {config.nomeFazenda||"FazendaGest"}</div>
          <div style={{fontSize:10,color:"#74c69d",marginTop:2}}>Cacau · Leite · Coco · Gado</div>
        </div>
        <nav style={{padding:"8px 0",flex:1,overflowY:"auto"}}>
          {MENU_ITEMS.map(it=>(
            <button key={it.id} onClick={()=>setMenu(it.id)} style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 18px",border:"none",cursor:"pointer",background:menu===it.id?"#2d6a4f":"transparent",color:menu===it.id?"#d8f3dc":"#b7e4c7",fontSize:12,fontWeight:menu===it.id?700:400,textAlign:"left",borderLeft:`3px solid ${menu===it.id?"#52b788":"transparent"}`}}>
              <span>{it.icon}</span>{it.label}
            </button>
          ))}
        </nav>
        <div style={{padding:"12px 18px",borderTop:"1px solid #2d6a4f"}}>
          <div style={{fontSize:11,color:nivelCor(logado.perfil),fontWeight:700}}>👤 {logado.nome}</div>
          <div style={{fontSize:10,color:"#74c69d",marginTop:2}}>{logado.perfil}</div>
          <button onClick={()=>setLogado(null)} style={{marginTop:10,width:"100%",padding:"7px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#b7e4c7",fontSize:11,cursor:"pointer",fontWeight:600}}>🚪 Sair</button>
          <div style={{fontSize:9,color:"#52b788",marginTop:6}}>v3.0 · Abr/2025</div>
        </div>
      </div>
      <div style={{flex:1,overflow:"auto",padding:22}}>
        {menu==="dashboard"      &&<DashboardView funcionarios={funcionarios} producao={producao} despesas={despesas} receitas={receitas} financiamentos={financiamentos}/>}
        {menu==="financeiro"     &&<FinanceiroView funcionarios={funcionarios} despesas={despesas} receitas={receitas}/>}
        {menu==="producao"       &&<ProducaoView producao={producao}/>}
        {menu==="manejo"         &&<ManejoView animaisLeiteiro={animaisLeiteiro} animaisCorte={animaisCorte} vacinas={vacinas} pastagens={pastagens}/>}
        {menu==="pastagens"      &&<PastagensView pastagens={pastagens} setPastagens={setPastagens} config={config}/>}
        {menu==="financiamentos" &&<FinanciamentosView financiamentos={financiamentos} setFinanciamentos={setFinanciamentos} setDespesas={setDespesas}/>}
        {menu==="lancamentos"    &&<LancamentosView producao={producao} setProducao={setProducao} despesas={despesas} setDespesas={setDespesas} receitas={receitas} setReceitas={setReceitas} funcionarios={funcionarios} setFuncionarios={setFuncionarios} animaisCorte={animaisCorte} setAnimaisCorte={setAnimaisCorte} vacinas={vacinas} setVacinas={setVacinas}/>}
        {menu==="usuarios"       &&<UsuariosView usuarios={usuarios} setUsuarios={setUsuarios}/>}
        {menu==="configuracoes"  &&<ConfiguracoesView config={config} setConfig={setConfig}/>}
      </div>
    </div>
  );
}
