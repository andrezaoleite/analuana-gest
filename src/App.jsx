import { useState, useRef, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ── SUPABASE ──────────────────────────────────────────────
const supabase = createClient(
  "https://qgzbeosbttysramlnjeb.supabase.co",
  "sb_publishable_ikMsKo3jMkrMGwWlz7JvHA_L3HflDR0"
);

// Converte camelCase → snake_case para salvar no banco
const toSnake = obj => {
  if(!obj || typeof obj !== "object") return obj;
  const out = {};
  for(const [k,v] of Object.entries(obj)){
    const sk = k.replace(/[A-Z]/g, c => "_" + c.toLowerCase());
    out[sk] = v;
  }
  return out;
};

// Converte snake_case → camelCase ao carregar do banco
const CAMPOS_NUMERICOS = new Set([
  "salario","salarioBruto","inss","salFamilia","fgts","baseIrrf","liquido","custoEmpresa",
  "valor","cacauKg","leiteL","cocoUn","qtd","custo","area","capacidade","atual",
  "numFilhos","precoCacau","precoLeite","precoCoco","precoArroba","taxa","carencia","prazo",
  "cetMensal","cetAnual","numParcelas","iof","iofAdicional","tarifaEstudo","seguroPenhor"
]);
const toCamel = obj => {
  if(!obj || typeof obj !== "object") return obj;
  const out = {};
  for(const [k,v] of Object.entries(obj)){
    const ck = k.replace(/_([a-z])/g, (_,c) => c.toUpperCase());
    out[ck] = CAMPOS_NUMERICOS.has(ck) && v !== null && v !== undefined ? Number(v) : v;
  }
  return out;
};


// ── CONSTANTES ────────────────────────────────────────────
const COLORS = ["#2d6a4f","#52b788","#d4a017","#e76f51","#457b9d","#a8dadc","#f4a261","#264653"];

const NIVEIS = ["Administrador","Gerente","Financeiro","Operacional"];

const CATEGORIAS_DESPESA = {
  "Folha de Pagamento": ["Salários","13º Salário","Férias","Rescisão"],
  "Encargos": ["INSS Patronal","FGTS","RAT/SAT","SENAR"],
  "Insumos Agrícolas": ["Fertilizantes","Defensivos","Sementes","Calcário"],
  "🐂 Gado de Corte": ["Ração/Suplemento","Medicamentos/Vet.","Confinamento","Compra de Animais","Outros Corte"],
  "🥛 Gado Leiteiro": ["Ração Vacas","Medicamentos Leiteiro","Higiene/Ordenha","Outros Leiteiro"],
  "Combustível": ["Diesel","Gasolina","Lubrificantes"],
  "Manutenção": ["Equipamentos","Benfeitorias","Veículos"],
  "Tributos": ["ITR","Funrural","INSS Produtor","SENAR Rural","Contribuição Sindical"],
  "Energia": ["Energia Elétrica"],
  "Outros": ["Outros"],
};

// ── HELPERS ──────────────────────────────────────────────
const fmt  = n => `R$ ${Number(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtN = n => Number(n||0).toLocaleString("pt-BR");
const hoje = () => new Date().toISOString().slice(0,10);
const uid  = () => Date.now() + Math.random();

const calcINSSEmpregado = s => Number(s) * 0.075;
const calcSalFamilia = (sal, filhos) => Number(sal) <= 1906.04 ? 67.54 * Number(filhos) : 0;
const calcFGTS = s => Number(s) * 0.08;
const calcBaseIRRF = (salBruto, inss) => Math.max(0, Number(salBruto) - Number(inss));
const calcCustoEmpresa = salBruto => Number(salBruto) * (1 + 0.20 + 0.08 + 0.01 + 0.02 + 0.1111 + 0.0833);
const temAcesso = (perfil, modulo) => {
  const mapa = {
    Administrador: ["dashboard","financeiro","folha","relatorio","producao","manejo","pastagens","gadocorte","lancamentos","financiamentos","usuarios","configuracoes"],
    Gerente:       ["dashboard","producao","manejo","pastagens","gadocorte","lancamentos"],
    Financeiro:    ["dashboard","financeiro","folha","relatorio","lancamentos","financiamentos"],
    Operacional:   ["producao","manejo","lancamentos"],
  };
  return (mapa[perfil]||[]).includes(modulo);
};


const fmtData = dataStr => { if(!dataStr) return "—"; const [y,m,d] = dataStr.split("-"); return d?`${d}/${m}/${y}`:dataStr; };
const addMeses = (dataStr, n) => {
  if(!dataStr || dataStr === "—") return "—";
  // Normalizar: aceita "YYYY-MM" ou "YYYY-MM-DD" — sempre usar primeiro dia do mês
  const base = dataStr.length >= 10 ? dataStr.slice(0,10) : dataStr.slice(0,7) + "-01";
  const d = new Date(base + "T12:00:00");
  if(isNaN(d.getTime())) return "—";
  d.setMonth(d.getMonth() + n);
  if(isNaN(d.getTime())) return "—";
  return d.toISOString().slice(0,7);
};
// Adiciona N períodos (meses, semestres ou anos) a uma data
// ── Helpers de data ──────────────────────────────────────────────────
// Adiciona mPer meses a uma string "YYYY-MM"
function addPeriodos(dtBase, n, periodicidade) {
  if(!dtBase) return "—";
  const meses = periodicidade==="anual"?12 : periodicidade==="semestral"?6 : 1;
  return addMeses(dtBase, n * meses);
}

// Diferença em meses entre duas datas "YYYY-MM" ou "YYYY-MM-DD"
function diffMeses(dtA, dtB) {
  if(!dtA||!dtB||dtA==="—"||dtB==="—") return 0;
  if(dtA.length < 7 || dtB.length < 7) return 0;
  const a = new Date(dtA.slice(0,7)+"-01T12:00:00");
  const b = new Date(dtB.slice(0,7)+"-01T12:00:00");
  if(isNaN(a.getTime())||isNaN(b.getTime())) return 0;
  return (b.getFullYear()-a.getFullYear())*12 + (b.getMonth()-a.getMonth());
}

// ── Custeio — parcela única alinhada à safra ──────────────────────
function calcTabelaCusteio(f) {
  const taxa  = (f.taxa||0)/100;
  const meses = f.dtVencimento
    ? Math.max(1, diffMeses(f.dtContratacao, f.dtVencimento))
    : (Number(f.mesesCusteio)||12);
  const juros = (f.valor||0) * taxa * (meses/12);
  const venc  = f.dtVencimento || addMeses(f.dtContratacao, meses);
  return [{
    parcela:1, tipo:"Parcela Única",
    saldo:f.valor||0, amortizacao:f.valor||0,
    juros, prestacao:(f.valor||0)+juros,
    vencimento:venc, status:"Pendente"
  }];
}

// ── Investimento SAC ─────────────────────────────────────────────
// Usa dt_primeira_parcela como âncora de todas as datas.
// Carência é derivada automaticamente de (dtContratacao → dtPrimeiraParcela).
function calcTabelaSAC(f) {
  const per  = f.periodicidade||"anual";
  const mPer = per==="anual"?12 : per==="semestral"?6 : 1;
  // Taxa por período
  const tPer = (f.taxa||0)/100 * (mPer/12);
  // Número de parcelas de amortização
  const n    = Math.max(1, Number(f.numParcelas||f.prazo)||1);
  // Amortização por parcela (SAC = constante)
  const am   = (f.valor||0) / n;
  // Carência em meses (calculada pelas datas se disponível, senão manual)
  const carenciaMeses = (f.dtContratacao && f.dtPrimeiraParcela)
    ? Math.max(0, diffMeses(f.dtContratacao, f.dtPrimeiraParcela))
    : (Number(f.carencia)||0);
  // Base para calcular datas: dt_primeira_parcela ou derivada
  const dtBaseTmp = f.dtPrimeiraParcela || addMeses(f.dtContratacao, carenciaMeses||mPer);
  const dtBase = (dtBaseTmp && dtBaseTmp !== "—") ? dtBaseTmp : null;

  const tab = [];
  // Linha de carência informativa (sem parcela de amortização)
  if(carenciaMeses > 0) {
    const txMensal = (f.taxa||0)/100/12;
    const jurosCarencia = (f.valor||0) * txMensal * carenciaMeses;
    tab.push({
      parcela:0, tipo:"Carência",
      saldo:f.valor||0, amortizacao:0,
      juros:jurosCarencia, prestacao:jurosCarencia,
      vencimento:dtBase||"—", status:"Pendente",
      isCarencia:true
    });
  }
  // Parcelas de amortização
  let s = f.valor||0;
  for(let i=0; i<n; i++) {
    const j = s * tPer;
    const p = am + j;
    const venc = dtBase ? addMeses(dtBase, i * mPer) : "—";
    tab.push({
      parcela:i+1, tipo:"Normal",
      saldo:Math.max(0,s), amortizacao:am, juros:j, prestacao:p,
      vencimento:venc, status:"Pendente"
    });
    s = Math.max(0, s - am);
  }
  return tab;
}

// ── Investimento PRICE ───────────────────────────────────────────
function calcTabelaPRICE(f) {
  const per  = f.periodicidade||"anual";
  const mPer = per==="anual"?12 : per==="semestral"?6 : 1;
  const tPer = (f.taxa||0)/100 * (mPer/12);
  const n    = Math.max(1, Number(f.numParcelas||f.prazo)||1);
  const pmt  = tPer>0 ? (f.valor||0)*(tPer*Math.pow(1+tPer,n))/(Math.pow(1+tPer,n)-1) : (f.valor||0)/n;
  const carenciaMeses = (f.dtContratacao && f.dtPrimeiraParcela)
    ? Math.max(0, diffMeses(f.dtContratacao, f.dtPrimeiraParcela))
    : (Number(f.carencia)||0);
  const dtBaseTmp = f.dtPrimeiraParcela || addMeses(f.dtContratacao, carenciaMeses||mPer);
  const dtBase = (dtBaseTmp && dtBaseTmp !== "—") ? dtBaseTmp : null;

  const tab = [];
  if(carenciaMeses > 0) {
    const txMensal = (f.taxa||0)/100/12;
    const jurosCarencia = (f.valor||0) * txMensal * carenciaMeses;
    tab.push({parcela:0,tipo:"Carência",saldo:f.valor||0,amortizacao:0,juros:jurosCarencia,prestacao:jurosCarencia,vencimento:dtBase,status:"Pendente",isCarencia:true});
  }
  let s = f.valor||0;
  for(let i=0; i<n; i++) {
    const j = s*tPer;
    const a = Math.max(0, pmt-j);
    tab.push({parcela:i+1,tipo:"Normal",saldo:Math.max(0,s),amortizacao:a,juros:j,prestacao:pmt,vencimento:dtBase?addMeses(dtBase,i*mPer):"—",status:"Pendente"});
    s = Math.max(0, s-a);
  }
  return tab;
}

// ── Roteador central ─────────────────────────────────────────────
function calcTabela(f) {
  const tipo = f.tipo||"";
  const sist = f.sistema||"SAC";
  if(sist==="Parcela Única" || tipo.startsWith("Custeio")) return calcTabelaCusteio(f);
  if(sist==="PRICE" || sist==="SAC Semestral") {
    const fBase = sist==="SAC Semestral" ? {...f, periodicidade:"semestral", sistema:"SAC"} : f;
    return sist==="PRICE" ? calcTabelaPRICE(fBase) : calcTabelaSAC(fBase);
  }
  const per = f.periodicidade || (["Investimento","PRONAF","FCO","Outros"].includes(tipo)?"anual":"mensal");
  return calcTabelaSAC({...f, periodicidade:per});
}
function useResponsive(){
  const [mob,setMob]=useState(typeof window!=="undefined"&&window.innerWidth<768);
  useEffect(()=>{const h=()=>setMob(window.innerWidth<768);window.addEventListener("resize",h);return()=>window.removeEventListener("resize",h);},[]);
  return mob;
}

// ── DADOS INICIAIS ────────────────────────────────────────
const CONFIG_INIT = {
  nomeFazenda: "Fazenda Analuana",
  precoCacau: 18, precoLeite: 2.80, precoCoco: 2.50, precoArroba: 325,
};
const USUARIOS_INIT = [
  { id:1, usuario:"admin",    senha:"fazenda2025", nome:"Administrador",   perfil:"Administrador", ativo:true },
  { id:2, usuario:"gerente",  senha:"gerente123",  nome:"José da Silva",   perfil:"Gerente",       ativo:true },
  { id:3, usuario:"contador", senha:"contabil@1",  nome:"Contador",        perfil:"Financeiro",    ativo:true },
];

const FUNCIONARIOS_INIT = []; // dados carregados do Supabase
const FOLHAS_INIT = [];

const PRODUCAO_INIT = []; // dados carregados do Supabase

const DESPESAS_INIT = []; // dados carregados do Supabase

const RECEITAS_INIT = []; // dados carregados do Supabase

const ANIMAIS_LEITEIRO_INIT = []; // dados carregados do Supabase

const ANIMAIS_CORTE_INIT = []; // dados carregados do Supabase

const VACINAS_INIT = []; // dados carregados do Supabase

const CAPINS = ["Brachiaria brizantha","Brachiaria decumbens","Panicum maximum (Mombaça)","Panicum maximum (Tanzania)","Cynodon (Tifton 85)","Andropogon gayanus","Pennisetum purpureum","Piatã","Xaraés","Marandu","Nativo/Misto"];
const STATUS_PASTO = ["Em uso","Descanso","Em reforma","Vedado","Reserva"];
const TIPO_PASTO   = ["Leiteiro","Corte","Misto","Reserva"];
const TIPO_FINANC  = ["Custeio Agrícola","Custeio Pecuário Leite","Custeio Pecuário Corte","Investimento","PRONAF","FCO","Outros"];
const SISTEMA_AMORT= ["SAC","SAC Semestral","PRICE","Parcela Única"];
const PASTAGENS_INIT = []; // dados carregados do Supabase


const FINANCIAMENTOS_INIT = []; // dados carregados do Supabase
// Histórico de gado: calculado dinamicamente das receitas reais

// ── COMPONENTES BASE ──────────────────────────────────────
function Modal({ title, children, onClose, largura=500 }) {
  const mob=useResponsive();
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:mob?8:16 }}>
      <div style={{ background:"white",borderRadius:14,width:"100%",maxWidth:mob?window.innerWidth-16:largura,maxHeight:"95vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,0.3)" }}>
        <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"16px 20px",borderBottom:"1px solid #e5e7eb" }}>
          <span style={{ fontSize:15,fontWeight:700,color:"#1b4332" }}>{title}</span>
          <button onClick={onClose} style={{ background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9ca3af" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function Confirm({ msg, onSim, onNao, danger=false }) {
  return (
    <Modal title={danger?"⚠️ Confirmar exclusão":"Confirmar ação"} onClose={onNao} largura={400}>
      <p style={{ fontSize:14,color:"#374151",marginBottom:20 }}>{msg}</p>
      <div style={{ display:"flex",gap:10,justifyContent:"flex-end" }}>
        <BotaoSecundario onClick={onNao}>Cancelar</BotaoSecundario>
        <button onClick={onSim} style={{ padding:"9px 20px",background:danger?"#dc2626":"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13 }}>
          {danger?"Sim, excluir":"Confirmar"}
        </button>
      </div>
    </Modal>
  );
}

const BotaoP = ({children,onClick,cor="#1b4332",type="button"}) => (
  <button type={type} onClick={onClick} style={{ padding:"9px 18px",background:cor,color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13 }}>{children}</button>
);
const BotaoSecundario = ({children,onClick}) => (
  <button onClick={onClick} style={{ padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13 }}>{children}</button>
);
const BotaoPerigo = ({children,onClick}) => (
  <button onClick={onClick} style={{ padding:"7px 14px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600 }}>{children}</button>
);
const BotaoEditar = ({onClick}) => (
  <button onClick={onClick} style={{ padding:"7px 12px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600 }}>✏️ Editar</button>
);

function Campo({ label, value, onChange, type="text", required=false, options=null, style={}, placeholder="" }) {
  const base = { width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box" };
  return (
    <div style={{ marginBottom:14,...style }}>
      <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5 }}>{label}{required&&<span style={{color:"#dc2626"}}> *</span>}</label>
      {options
        ? <select value={value} onChange={e=>onChange(e.target.value)} style={base}>
            <option value="">Selecione...</option>
            {options.map(o=><option key={o} value={o}>{o}</option>)}
          </select>
        : <input type={type} value={value||""} onChange={e=>onChange(e.target.value)} style={base} placeholder={placeholder}/>
      }
    </div>
  );
}

function KpiCard({ label, value, sub, color, icon, trend }) {
  return (
    <div style={{ background:"white",borderRadius:12,padding:"16px 18px",boxShadow:"0 1px 4px rgba(0,0,0,0.08)",borderLeft:`4px solid ${color}` }}>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11,color:"#6b7280",marginBottom:3,textTransform:"uppercase",letterSpacing:.5 }}>{label}</div>
          <div style={{ fontSize:19,fontWeight:700,color:"#1a1a2e" }}>{value}</div>
          {sub&&<div style={{ fontSize:11,marginTop:4,color:trend>0?"#2d6a4f":trend<0?"#e63946":"#9ca3af" }}>{trend>0?"▲ ":trend<0?"▼ ":""}{sub}</div>}
        </div>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex",gap:2,marginBottom:18,borderBottom:"2px solid #e5e7eb" }}>
      {tabs.map(t=>(
        <button key={t.id} onClick={()=>onChange(t.id)} style={{ padding:"8px 15px",border:"none",background:"none",cursor:"pointer",fontSize:13,fontWeight:active===t.id?700:400,color:active===t.id?"#2d6a4f":"#6b7280",borderBottom:active===t.id?"2px solid #2d6a4f":"2px solid transparent",marginBottom:-2 }}>{t.label}</button>
      ))}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return <div style={{ marginBottom:20 }}><h1 style={{ fontSize:19,fontWeight:800,color:"#1b4332",margin:0 }}>{title}</h1>{sub&&<p style={{ fontSize:13,color:"#6b7280",margin:"3px 0 0" }}>{sub}</p>}</div>;
}

const Card = ({children,style={}}) => <div style={{ background:"white",borderRadius:12,padding:18,boxShadow:"0 1px 4px rgba(0,0,0,0.08)",...style }}>{children}</div>;
const CardTitle = ({children}) => <div style={{ fontSize:13,fontWeight:700,color:"#1b4332",marginBottom:12 }}>{children}</div>;

// ── DASHBOARD ─────────────────────────────────────────────
function DashboardView({ funcionarios, producao, despesas, receitas, financiamentos, precos }) {
  const [aba, setAba] = useState("geral");

  const pCur = [...producao].sort((a,b)=>b.data.localeCompare(a.data))[0] || {};
  const pPrv = [...producao].sort((a,b)=>b.data.localeCompare(a.data))[1] || {};
  const PC=precos?.precoCacau||18,PL=precos?.precoLeite||2.80,PCO=precos?.precoCoco||2.50;
  const recCacau = (pCur.cacauKg||0)*PC;
  const recLeite = (pCur.leiteL||0)*PL;
  const recCoco  = (pCur.cocoUn||0)*PCO;
  const recGado  = receitas.filter(r=>r.atividade==="Gado Corte").reduce((s,r)=>s+(r.valor||0),0);
  const recTotal = recCacau+recLeite+recCoco+recGado;

  const cstTotal = despesas.reduce((s,d)=>s+(d.valor||0),0);
  const lucTotal = recTotal - cstTotal;

  const receitaPizza = [
    { name:"🍫 Cacau",      value:recCacau },
    { name:"🥛 Leite",      value:recLeite },
    { name:"🥥 Coco",       value:recCoco  },
    { name:"🐂 Gado Corte", value:recGado  },
  ].filter(x=>x.value>0);

  const despPorCateg = Object.entries(
    despesas.reduce((acc,d)=>{ acc[d.categoria]=(acc[d.categoria]||0)+(d.valor||0); return acc; },{})
  ).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);

  const hist = producao.slice(-6).map(p=>({
    mes: p.mes, Cacau:p.cacauKg*PC, Leite:p.leiteL*PL, Coco:p.cocoUn*PCO,
  }));

  const cstCacau=despesas.filter(d=>["Insumos Agrícolas","Cacau"].some(c=>d.categoria?.includes(c))).reduce((s,d)=>s+(d.valor||0),0);
  const cstLeite=despesas.filter(d=>d.categoria?.includes("Leiteiro")||d.categoria?.includes("🥛")).reduce((s,d)=>s+(d.valor||0),0);
  const cstCoco =despesas.filter(d=>d.categoria?.includes("Coco")||d.subcategoria?.includes("Coco")).reduce((s,d)=>s+(d.valor||0),0);
  const cstGado =despesas.filter(d=>d.categoria?.includes("Gado de Corte")||d.categoria?.includes("🐂")).reduce((s,d)=>s+(d.valor||0),0);

  const comp = [
    { ativ:"Cacau",      receita:recCacau, custo:cstCacau, lucro:recCacau-cstCacau, cor:"#d4a017", icon:"🍫" },
    { ativ:"Leite",      receita:recLeite, custo:cstLeite, lucro:recLeite-cstLeite, cor:"#2d6a4f", icon:"🥛" },
    { ativ:"Coco",       receita:recCoco,  custo:cstCoco,  lucro:recCoco-cstCoco,   cor:"#52b788", icon:"🥥" },
    { ativ:"Gado Corte", receita:recGado,  custo:cstGado,  lucro:recGado-cstGado,   cor:"#457b9d", icon:"🐂" },
  ];

  const ABAS = [
    { id:"geral",  label:"🏠 Geral" },
    { id:"cacau",  label:"🍫 Cacau" },
    { id:"leite",  label:"🥛 Leite" },
    { id:"coco",   label:"🥥 Coco"  },
    { id:"gado",   label:"🐂 Gado Corte" },
  ];

  const MiniChart = ({ data, dataKey, cor, tipo="bar" }) => (
    <ResponsiveContainer width="100%" height={140}>
      {tipo==="line"
        ? <LineChart data={data}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey={dataKey} stroke={cor} strokeWidth={2} dot={{r:3,fill:cor}}/></LineChart>
        : <BarChart data={data}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey={dataKey} fill={cor} radius={[3,3,0,0]}/></BarChart>
      }
    </ResponsiveContainer>
  );

  const TabAtiv = ({ atv, histData, dataKey, tipo="bar" }) => {
    const recMes = histData.map(p=>({ mes:p.mes, receita:Math.round((p[dataKey]||0)), custo:atv.custo, lucro:Math.round((p[dataKey]||0))-atv.custo }));
    return (
      <div>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
          <KpiCard label="Receita mês" value={fmt(atv.receita)} color={atv.cor} icon={atv.icon} trend={1}/>
          <KpiCard label="Custo mês"   value={fmt(atv.custo)}   color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro mês"   value={fmt(atv.lucro)}   color={atv.lucro>=0?"#2d6a4f":"#e76f51"} icon="📈" trend={atv.lucro>=0?1:-1}/>
          <KpiCard label="Margem"      value={atv.receita>0?`${((atv.lucro/atv.receita)*100).toFixed(0)}%`:"—"} color="#457b9d" icon="📊" trend={0}/>
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:14 }}>
          <Card>
            <CardTitle>Receita × Custo × Lucro — histórico</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={recMes}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill={atv.cor} radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#2d6a4f" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Produção — histórico</CardTitle>
            <MiniChart data={histData} dataKey={dataKey} cor={atv.cor} tipo={tipo}/>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionHeader title="Dashboard" sub="Análise financeira e produtiva por atividade"/>
      <div style={{ display:"flex",gap:6,marginBottom:20,flexWrap:"wrap" }}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{ padding:"9px 18px",border:"none",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:600,background:aba===a.id?"#1b4332":"white",color:aba===a.id?"white":"#6b7280",boxShadow:aba===a.id?"0 2px 8px rgba(27,67,50,0.3)":"0 1px 3px rgba(0,0,0,0.08)" }}>{a.label}</button>
        ))}
      </div>

      {aba==="geral" && (
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
            <KpiCard label="Receita Total" value={fmt(recTotal)} color="#2d6a4f" icon="💰" trend={1}/>
            <KpiCard label="Despesas"      value={fmt(cstTotal)} color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro Consol." value={fmt(lucTotal)} color={lucTotal>=0?"#d4a017":"#e76f51"} icon="📈" trend={lucTotal>=0?1:-1}/>
            <KpiCard label="Dívida Bancária" value={fmt((financiamentos||[]).filter(f=>f.status==="Ativo").reduce((s,f)=>{const t=calcTabela(f);const p=t.find(p=>!(f.pagamentos||[]).includes(p.parcela));return s+(p?p.saldo:0);},0))} color="#457b9d" icon="🏦" trend={-1}/>
          </div>

          <div style={{ display:"grid",gridTemplateColumns:"3fr 2fr",gap:14,marginBottom:14 }}>
            <Card>
              <CardTitle>Receita por atividade — histórico</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={hist}>
                  <defs>{[["gC","#d4a017"],["gL","#2d6a4f"],["gCo","#52b788"]].map(([id,c])=>(
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.3}/><stop offset="95%" stopColor={c} stopOpacity={0}/></linearGradient>
                  ))}</defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Area type="monotone" dataKey="Cacau" stroke="#d4a017" fill="url(#gC)"  strokeWidth={2}/>
                  <Area type="monotone" dataKey="Leite" stroke="#2d6a4f" fill="url(#gL)"  strokeWidth={2}/>
                  <Area type="monotone" dataKey="Coco"  stroke="#52b788" fill="url(#gCo)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            </Card>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <Card>
                <CardTitle>Distribuição de Receita</CardTitle>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart><Pie data={receitaPizza} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value">{receitaPizza.map((_,i)=><Cell key={i} fill={["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4 }}>
                  {receitaPizza.map((d,i)=><div key={i} style={{ display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#374151" }}><div style={{ width:7,height:7,borderRadius:2,background:["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}}/>{d.name} ({recTotal>0?((d.value/recTotal)*100).toFixed(0):0}%)</div>)}
                </div>
              </Card>
              <Card>
                <CardTitle>Distribuição de Despesas</CardTitle>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart><Pie data={despPorCateg.slice(0,6)} cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value">{despPorCateg.slice(0,6).map((_,i)=><Cell key={i} fill={COLORS[i]}/>)}</Pie><Tooltip formatter={v=>fmt(v)}/></PieChart>
                </ResponsiveContainer>
                <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginTop:4 }}>
                  {despPorCateg.slice(0,4).map((d,i)=><div key={i} style={{ display:"flex",alignItems:"center",gap:3,fontSize:10,color:"#374151" }}><div style={{ width:7,height:7,borderRadius:2,background:COLORS[i]}}/>{d.name.replace(/[🐂🥛]/g,"")}</div>)}
                </div>
              </Card>
            </div>
          </div>

          <Card style={{ marginBottom:14 }}>
            <CardTitle>Receita × Custo × Lucro por atividade</CardTitle>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={comp}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="ativ" tick={{fontSize:12}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginTop:14 }}>
              {[...comp].sort((a,b)=>b.lucro-a.lucro).map((a,i)=>(
                <div key={i} style={{ padding:12,background:"#f8faf9",borderRadius:8,borderTop:`3px solid ${a.cor}` }}>
                  <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:20 }}>{a.icon}</span><span style={{ fontSize:11,fontWeight:800,color:"#9ca3af" }}>#{i+1}</span></div>
                  <div style={{ fontSize:13,fontWeight:700,color:"#1a1a2e",marginTop:4 }}>{a.ativ}</div>
                  <div style={{ fontSize:12,color:"#2d6a4f" }}>Rec: {fmt(a.receita)}</div>
                  <div style={{ fontSize:12,color:"#e76f51" }}>Cst: {fmt(a.custo)}</div>
                  <div style={{ fontSize:14,fontWeight:800,color:a.lucro>=0?"#1b4332":"#dc2626",marginTop:4 }}>{fmt(a.lucro)}</div>
                  <div style={{ fontSize:10,color:"#9ca3af" }}>margem {a.receita>0?((a.lucro/a.receita)*100).toFixed(0):0}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
      {aba==="cacau" && <TabAtiv atv={comp[0]} histData={producao.slice(-6).map(p=>({mes:p.mes,cacauKg:p.cacauKg*PC}))} dataKey="cacauKg" tipo="bar"/>}
      {aba==="leite" && <TabAtiv atv={comp[1]} histData={producao.slice(-6).map(p=>({mes:p.mes,leiteL:p.leiteL*PL}))}  dataKey="leiteL"  tipo="line"/>}
      {aba==="coco"  && <TabAtiv atv={comp[2]} histData={producao.slice(-6).map(p=>({mes:p.mes,cocoUn:p.cocoUn*PCO}))} dataKey="cocoUn"  tipo="bar"/>}
      {aba==="gado"  && (
        <div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
            <KpiCard label="Receita Venda" value={fmt(recGado)}  color="#457b9d" icon="🐂" trend={1}/>
            <KpiCard label="Custo Corte"   value={fmt(cstGado)}  color="#e76f51" icon="📋" trend={0}/>
            <KpiCard label="Lucro Corte"   value={fmt(recGado-cstGado)} color={recGado-cstGado>=0?"#2d6a4f":"#e76f51"} icon="📈" trend={recGado-cstGado>=0?1:-1}/>
            <KpiCard label="R$/Arroba"     value="R$ 325,00"     color="#d4a017" icon="📊" trend={0}/>
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:14 }}>
            <Card>
              <CardTitle>Receita × Custo × Lucro — Gado Corte histórico</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recGadoHist}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                  <Bar dataKey="total" name="Receita" fill="#457b9d" radius={[3,3,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardTitle>Arrobas vendidas</CardTitle>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={recGadoHist}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip formatter={v=>fmt(v)}/><Bar dataKey="total" name="Receita" fill="#d4a017" radius={[3,3,0,0]}/></BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

// ── FINANCEIRO ────────────────────────────────────────────
function FinanceiroView({ funcionarios, despesas, receitas }) {
  const [tab, setTab] = useState("encargos");

  const totalSalBruto = 0;
  const totalSalFam   = 0;
  const totalINSSEmp  = 0;
  const totalEncPatr  = 0;
  const totalFolha    = 0;

  const thS = { padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9" };
  const tdS = { padding:"10px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6" };

  return (
    <div>
      <SectionHeader title="Módulo Financeiro" sub="Folha de pagamento, encargos, tributos, despesas e receitas"/>
      <div style={{padding:"12px 16px",background:"#f0faf4",borderRadius:10,marginBottom:18,fontSize:13,color:"#1b4332",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:20}}>📋</span>
        <span>Os valores da folha de pagamento agora são gerados no módulo <strong>Folha Salarial</strong>. Aqui você consulta encargos, tributos, despesas e receitas.</span>
      </div>
      <TabBar tabs={[{id:"encargos",label:"Encargos"},{id:"tributos",label:"Tributos"},{id:"despesas",label:"Despesas"},{id:"receitas",label:"Receitas"}]} active={tab} onChange={setTab}/>

      {tab==="encargos" && (
        <Card>
          <CardTitle>Composição dos Encargos Patronais</CardTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
            {[
              { lbl:"INSS Patronal",       perc:"20,0%", val:totalSalBruto*0.20,   desc:"Previdência Social"  },
              { lbl:"FGTS",                perc:" 8,0%", val:totalSalBruto*0.08,   desc:"Fundo de Garantia"   },
              { lbl:"RAT/SAT",             perc:" 1,0%", val:totalSalBruto*0.01,   desc:"Acidente de trabalho"},
              { lbl:"SENAR",               perc:" 2,0%", val:totalSalBruto*0.02,   desc:"Contribuição rural"  },
              { lbl:"Provisão Férias+1/3", perc:"11,1%", val:totalSalBruto*0.1111, desc:"Provisão mensal"     },
              { lbl:"Provisão 13º",        perc:" 8,3%", val:totalSalBruto*0.0833, desc:"Provisão mensal"     },
            ].map((e,i)=>(
              <div key={i} style={{ padding:14,background:"#f8faf9",borderRadius:8,borderLeft:`3px solid ${COLORS[i]}` }}>
                <div style={{ fontSize:11,color:"#6b7280" }}>{e.lbl}</div>
                <div style={{ fontSize:22,fontWeight:700,color:"#1a1a2e",margin:"3px 0" }}>{e.perc}</div>
                <div style={{ fontSize:14,fontWeight:700,color:COLORS[i] }}>{fmt(e.val)}/mês</div>
                <div style={{ fontSize:11,color:"#9ca3af",marginTop:3 }}>{e.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:14,padding:14,background:"#1b4332",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <span style={{ color:"#95d5b2",fontWeight:600 }}>Total Encargos/mês</span>
            <span style={{ color:"white",fontSize:20,fontWeight:800 }}>{fmt(totalEncPatr)}</span>
          </div>
        </Card>
      )}

      {tab==="tributos" && (
        <Card>
          <CardTitle>Tributos da Atividade Rural</CardTitle>
          {[
            { tributo:"ITR",                           base:"Valor da terra nua",      venc:"30/11/2025", valor:1200, freq:"Anual"  },
            { tributo:"Contribuição Sindical Rural",   base:"Patrimônio declarado",    venc:"31/01/2025", valor:850,  freq:"Anual"  },
            { tributo:"Funrural – RGPS",               base:"1,5% receita bruta",      venc:"Mensal",     valor:705,  freq:"Mensal" },
            { tributo:"INSS Produtor Rural",           base:"2,1% receita bruta",      venc:"Mensal",     valor:987,  freq:"Mensal" },
            { tributo:"SENAR",                         base:"0,2% comerc. rural",      venc:"Mensal",     valor:94,   freq:"Mensal" },
          ].map((t,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:"1px solid #f3f4f6" }}>
              <div><div style={{ fontSize:14,fontWeight:600,color:"#1a1a2e" }}>{t.tributo}</div><div style={{ fontSize:12,color:"#6b7280" }}>Base: {t.base} · Venc: {t.venc}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:15,fontWeight:700,color:"#e76f51" }}>{fmt(t.valor)}</div><div style={{ fontSize:11,color:"#9ca3af" }}>{t.freq}</div></div>
            </div>
          ))}
        </Card>
      )}

      {tab==="despesas" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <Card>
            <CardTitle>Despesas por categoria</CardTitle>
            {Object.entries(despesas.reduce((a,d)=>{ a[d.categoria]=(a[d.categoria]||0)+d.valor; return a; },{})).sort((a,b)=>b[1]-a[1]).map(([cat,val],i)=>(
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex",justifyContent:"space-between",marginBottom:3 }}><span style={{ fontSize:12,color:"#374151" }}>{cat}</span><span style={{ fontSize:12,fontWeight:700 }}>{fmt(val)}</span></div>
                <div style={{ height:6,background:"#f3f4f6",borderRadius:3 }}><div style={{ height:"100%",width:`${(val/despesas.reduce((s,d)=>s+d.valor,0))*100}%`,background:COLORS[i%8],borderRadius:3 }}/></div>
              </div>
            ))}
          </Card>
          <Card>
            <CardTitle>Gráfico de despesas</CardTitle>
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

      {tab==="receitas" && (
        <Card style={{ padding:0,overflow:"hidden" }}><div style={{overflowX:"auto"}}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:480 }}>
            <thead><tr>{["Data","Atividade","Qtd/Detalhes","Unitário","Valor","Comprador"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>
              {[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
                <tr key={r.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,color:"#6b7280"}}>{r.data}</td>
                  <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{r.atividade}</td>
                  <td style={tdS}>{r.qtd}</td>
                  <td style={tdS}>{r.unitario}</td>
                  <td style={{...tdS,fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{r.comprador}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background:"#1b4332" }}>
                <td colSpan={4} style={{ padding:"10px 12px",color:"#95d5b2",fontWeight:700 }}>Total Receitas</td>
                <td style={{ padding:"10px 12px",color:"white",fontWeight:800 }}>{fmt(receitas.reduce((s,r)=>s+r.valor,0))}</td>
                <td/>
              </tr>
            </tfoot>
          </table></div>
        </Card>
      )}
    </div>
  );
}

// ── PRODUÇÃO ──────────────────────────────────────────────
function ProducaoView({ producao, receitas }) {
  const [tab, setTab] = useState("geral");
  const cur = [...producao].sort((a,b)=>(b.data||"").localeCompare(a.data||""))[0]||{};
  const prv = [...producao].sort((a,b)=>(b.data||"").localeCompare(a.data||""))[1]||{};
  const hist6 = producao.slice(-6);

  // Histórico de gado a partir das receitas reais
  const recGadoHist = [...receitas]
    .filter(r=>r.atividade==="Gado Corte")
    .sort((a,b)=>(a.data||"").localeCompare(b.data||""))
    .reduce((acc,r)=>{
      const mes = r.data?new Date(r.data+"T12:00:00").toLocaleDateString("pt-BR",{month:"short",year:"2-digit"}):"—";
      const idx = acc.findIndex(x=>x.mes===mes);
      if(idx>=0) acc[idx].total+=r.valor||0;
      else acc.push({mes, total:r.valor||0, cabecas:0, arrobas:0});
      return acc;
    },[]);
  const vendGado = recGadoHist.length>0 ? recGadoHist[recGadoHist.length-1] : {cabecas:0,arrobas:0,total:0,mes:"—"};
  const prevGado = recGadoHist.length>1 ? recGadoHist[recGadoHist.length-2] : {total:0};

  return (
    <div>
      <SectionHeader title="Controle de Produção" sub="Cacau · Leite · Coco · Gado de Corte"/>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
        <KpiCard label="🍫 Cacau" value={`${fmtN(cur.cacauKg)} kg`} sub={`${(cur.cacauKg||0)-(prv.cacauKg||0)>0?"+":""}${(cur.cacauKg||0)-(prv.cacauKg||0)} kg`} color="#d4a017" icon="🍫" trend={(cur.cacauKg||0)-(prv.cacauKg||0)}/>
        <KpiCard label="🥛 Leite" value={`${fmtN(cur.leiteL)} L`}   sub={`${(cur.leiteL||0)-(prv.leiteL||0)>0?"+":""}${(cur.leiteL||0)-(prv.leiteL||0)} L`}   color="#2d6a4f" icon="🥛" trend={(cur.leiteL||0)-(prv.leiteL||0)}/>
        <KpiCard label="🥥 Coco"  value={`${fmtN(cur.cocoUn)} un`}  sub={`${(cur.cocoUn||0)-(prv.cocoUn||0)>0?"+":""}${(cur.cocoUn||0)-(prv.cocoUn||0)} un`}  color="#52b788" icon="🥥" trend={(cur.cocoUn||0)-(prv.cocoUn||0)}/>
        <KpiCard label="🐂 Gado Corte" value={fmt(vendGado.total)} sub={vendGado.mes!=="—"?`Último: ${vendGado.mes}`:"Sem vendas"} color="#457b9d" icon="🐂" trend={vendGado.total-prevGado.total}/>
      </div>
      <TabBar tabs={[{id:"geral",label:"Visão Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"},{id:"gado",label:"🐂 Gado Corte"}]} active={tab} onChange={setTab}/>

      {tab==="geral" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          {[["cacauKg","kg","#d4a017","🍫 Cacau (kg)","bar"],["leiteL","L","#2d6a4f","🥛 Leite (L)","line"],["cocoUn","un","#52b788","🥥 Coco (un)","bar"]].map(([key,unit,cor,label,tipo])=>(
            <Card key={key}>
              <CardTitle>{label}</CardTitle>
              <ResponsiveContainer width="100%" height={150}>
                {tipo==="line"
                  ? <LineChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Line type="monotone" dataKey={key} name={unit} stroke={cor} strokeWidth={2} dot={{r:3,fill:cor}}/></LineChart>
                  : <BarChart data={hist6}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip/><Bar dataKey={key} name={unit} fill={cor} radius={[3,3,0,0]}/></BarChart>
                }
              </ResponsiveContainer>
            </Card>
          ))}
          <Card>
            <CardTitle>🐂 Gado Corte — arrobas e receita</CardTitle>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={recGadoHist}><XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}}/><Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:10}}/>
                <Bar dataKey="arrobas" name="Arrobas" fill="#457b9d" radius={[3,3,0,0]}/>
                <Bar dataKey="cabecas" name="Cabeças" fill="#1b4332" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab==="cacau" && (
        <Card>
          <CardTitle>🍫 Calendário Agrícola do Cacau</CardTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12 }}>
            {[
              { ativ:"Poda de Formação / Manutenção", periodo:"Jul – Set", status:"Planejado",    prox:"Jul/25" },
              { ativ:"Adubação NPK",                   periodo:"Out – Nov", status:"Realizado",    prox:"Out/25" },
              { ativ:"Colheita Principal",              periodo:"Out – Jan", status:"Em andamento", prox:"—"      },
              { ativ:"Colheita Temporã",               periodo:"Abr – Jun", status:"Planejado",    prox:"Abr/25" },
              { ativ:"Controle Vassoura-de-Bruxa",     periodo:"Contínuo",  status:"Em andamento", prox:"Mensal" },
              { ativ:"Fermentação e Secagem",           periodo:"Pós-colh.", status:"Em andamento", prox:"—"      },
            ].map((a,i)=>{
              const cor=a.status==="Realizado"?"#2d6a4f":a.status==="Em andamento"?"#d4a017":"#457b9d";
              return (
                <div key={i} style={{ padding:12,borderRadius:8,background:"#f8faf9",borderLeft:`3px solid ${cor}` }}>
                  <div style={{ fontSize:13,fontWeight:700,color:"#1a1a2e" }}>{a.ativ}</div>
                  <div style={{ fontSize:12,color:"#6b7280",marginTop:2 }}>Período: {a.periodo}</div>
                  <div style={{ display:"flex",justifyContent:"space-between",marginTop:8,alignItems:"center" }}>
                    <span style={{ fontSize:11,padding:"2px 8px",borderRadius:10,background:cor+"22",color:cor,fontWeight:600 }}>{a.status}</span>
                    <span style={{ fontSize:11,color:"#9ca3af" }}>Próx: {a.prox}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab==="leite" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <Card>
            <CardTitle>🥛 Indicadores de Produção Leiteira</CardTitle>
            <div style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10 }}>
              {[{l:"Produção Último Mês",v:`${(cur.leiteL||0).toLocaleString("pt-BR")} L`},{l:"Média Mensal",v:producao.length>0?`${Math.round(producao.reduce((s,p)=>s+(p.leiteL||0),0)/producao.length).toLocaleString("pt-BR")} L`:"—"},{l:"Total no Período",v:`${producao.reduce((s,p)=>s+(p.leiteL||0),0).toLocaleString("pt-BR")} L`},{l:"Meses Registrados",v:`${producao.length} meses`}].map((ind,i)=>(
                <div key={i} style={{ padding:12,background:"#f8faf9",borderRadius:8,textAlign:"center" }}>
                  <div style={{ fontSize:14,fontWeight:700,color:"#1a1a2e" }}>{ind.v}</div>
                  <div style={{ fontSize:11,color:"#6b7280" }}>{ind.l}</div>
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

      {tab==="coco" && (
        <Card>
          <CardTitle>🥥 Gestão do Coqueiral</CardTitle>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18 }}>
            {[{l:"Produção Último Mês",v:`${(cur.cocoUn||0).toLocaleString("pt-BR")} un`},{l:"Média Mensal",v:producao.length>0?`${Math.round(producao.reduce((s,p)=>s+(p.cocoUn||0),0)/producao.length).toLocaleString("pt-BR")} un`:"—"},{l:"Total no Período",v:`${producao.reduce((s,p)=>s+(p.cocoUn||0),0).toLocaleString("pt-BR")} un`},{l:"Meses Registrados",v:`${producao.length} meses`}].map((i,idx)=>(
              <div key={idx} style={{ padding:14,background:"#f8faf9",borderRadius:8,textAlign:"center" }}>
                <div style={{ fontSize:18,fontWeight:700,color:"#1a1a2e" }}>{i.v}</div>
                <div style={{ fontSize:12,color:"#6b7280" }}>{i.l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:13,fontWeight:700,color:"#1b4332",marginBottom:10 }}>Calendário de Adubação</div>
          {[
            { meses:"Jan / Jul", adubo:"NPK 06-24-12",        dose:"500 g/planta" },
            { meses:"Abr / Out", adubo:"Ureia + KCl",         dose:"300+200 g/pl." },
            { meses:"Jun / Dez", adubo:"Boro + Zinco foliar", dose:"50 g/planta"  },
          ].map((a,i)=>(
            <div key={i} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #f3f4f6" }}>
              <div><div style={{ fontSize:13,fontWeight:600 }}>{a.adubo}</div></div>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:13,fontWeight:600,color:"#52b788" }}>{a.dose}</div><div style={{ fontSize:11,color:"#9ca3af" }}>{a.meses}</div></div>
            </div>
          ))}
        </Card>
      )}

      {tab==="gado" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:14 }}>
          <Card>
            <CardTitle>Vendas de Gado — histórico</CardTitle>
            <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
              <thead><tr>
                  <th style={{ padding:"8px 10px",background:"#1b4332",color:"white",fontSize:12 }}>Mês</th>
                  <th style={{ padding:"8px 10px",background:"#1b4332",color:"white",fontSize:12 }}>Receita</th>
                </tr></thead>
              <tbody>{recGadoHist.length>0 ? recGadoHist.map((v,i)=>(
                <tr key={i} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{ padding:"8px 10px",fontWeight:600 }}>{v.mes}</td>
                  <td style={{ padding:"8px 10px",color:"#d4a017",fontWeight:600 }}>{fmt(v.total)}</td>
                </tr>
              )) : <tr><td colSpan={2} style={{padding:"12px",color:"#9ca3af",textAlign:"center"}}>Nenhuma venda de gado lançada</td></tr>}
            </tbody>
              <tfoot><tr style={{ background:"#1b4332" }}>
                <td style={{ padding:"8px 10px",color:"#95d5b2",fontWeight:700 }}>Total</td>
                <td style={{ padding:"8px 10px",color:"white",fontWeight:800 }}>{fmt(recGadoHist.reduce((s,v)=>s+(v.total||0),0))}</td>
              </tr></tfoot>
            </table>
          </Card>
          <Card>
            <CardTitle>🐂 Receita de Gado — histórico</CardTitle>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={recGadoHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:9}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="total" name="Receita" fill="#457b9d" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            {recGadoHist.length===0&&<div style={{textAlign:"center",color:"#9ca3af",padding:12,fontSize:13}}>Nenhuma venda de gado lançada ainda</div>}
          </Card>
        </div>
      )}
    </div>
  );
}

// ── MANEJO PECUÁRIO ───────────────────────────────────────
function ManejoView({ animaisLeiteiro, setAnimaisLeiteiro, animaisCorte, setAnimaisCorte, vacinas, setVacinas, pastagens, dbAdd, dbUpdate, dbDelete }) {
  const [tab, setTab] = useState("leiteiro");
  const [modalL,   setModalL]   = useState(false);
  const [editL,    setEditL]    = useState(null);
  const [formL,    setFormL]    = useState({});
  const [confirmL, setConfirmL] = useState(null);
  const thS = { padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9" };
  const tdS = { padding:"10px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6" };

  return (
    <div>
      <SectionHeader title="Manejo Pecuário" sub="Gado leiteiro e gado de corte — agenda sanitária e pastagens"/>
      <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:18 }}>
        <KpiCard label="Gado Leiteiro"    value={`${animaisLeiteiro.reduce((s,a)=>s+a.qtd,0)} cab.`} color="#2d6a4f" icon="🐄" trend={0}/>
        <KpiCard label="Gado de Corte"   value={`${animaisCorte.length} cab.`}  color="#457b9d" icon="🐂" trend={0}/>
        <KpiCard label="Vacinas Pendentes" value={`${vacinas.filter(v=>v.status==="Pendente").length} eventos`} sub="Próx: 10/04/25" color="#e76f51" icon="💉" trend={-1}/>
        <KpiCard label="Pastagens" value={`${pastagens.length} áreas`} sub="1 em descanso" color="#52b788" icon="🌿" trend={0}tab==="leiteiro" && (
        <div>
          <div style={{display:"flex",justifyContent:"flex-end",marginBottom:12}}>
            <button onClick={()=>{setModalL(true);setEditL(null);setFormL({tipo_registro:"Individual",qtd:1,status:"Saudável",categoria:"Vaca em Lactação"});}} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>
              + Cadastrar Animal / Lote
            </button>
          </div>

          {/* KPIs resumo */}
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:14}}>
            {[
              ["Em Lactação", animaisLeiteiro.filter(a=>a.categoria==="Vaca em Lactação").reduce((s,a)=>s+(a.qtd||1),0),"#2d6a4f"],
              ["Vacas Secas",  animaisLeiteiro.filter(a=>a.categoria==="Vaca Seca").reduce((s,a)=>s+(a.qtd||1),0),"#457b9d"],
              ["Novilhas",     animaisLeiteiro.filter(a=>a.categoria==="Novilha").reduce((s,a)=>s+(a.qtd||1),0),"#d4a017"],
              ["Total Rebanho",animaisLeiteiro.reduce((s,a)=>s+(a.qtd||1),0),"#1b4332"],
            ].map(([l,v,c],i)=>(
              <div key={i} style={{padding:"12px 14px",background:"white",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,0.07)",borderLeft:`3px solid ${c}`}}>
                <div style={{fontSize:11,color:"#6b7280"}}>{l}</div>
                <div style={{fontSize:20,fontWeight:700,color:c}}>{v} cab.</div>
              </div>
            ))}
          </div>

          <Card style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
              <thead><tr>{["Identificação","Tipo","Raça","Categoria","Qtd","Status","Pasto","Entrada","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {animaisLeiteiro.length===0
                  ? <tr><td colSpan={9} style={{padding:20,textAlign:"center",color:"#9ca3af"}}>Nenhum animal cadastrado. Clique em "Cadastrar Animal / Lote" para começar.</td></tr>
                  : animaisLeiteiro.map((a,i)=>(
                    <tr key={a.id} style={{background:i%2?"#fafafa":"white"}}>
                      <td style={{...tdS,fontWeight:600}}>{a.brinco||a.lote||"—"}</td>
                      <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:a.tipo_registro==="Individual"?"#dbeafe":"#f3e8ff",color:a.tipo_registro==="Individual"?"#1d4ed8":"#7c3aed"}}>{a.tipo_registro||"Individual"}</span></td>
                      <td style={{...tdS,color:"#6b7280"}}>{a.raca||"—"}</td>
                      <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,background:"#f0faf4",color:"#2d6a4f",fontWeight:600}}>{a.categoria||"—"}</span></td>
                      <td style={{...tdS,textAlign:"center",fontWeight:600}}>{a.qtd||1}</td>
                      <td style={tdS}><span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:a.status==="Saudável"?"#d8f3dc":a.status==="Em Tratamento"?"#fee2e2":a.status==="Gestante"?"#fef3c7":"#f3f4f6",color:a.status==="Saudável"?"#2d6a4f":a.status==="Em Tratamento"?"#dc2626":a.status==="Gestante"?"#b45309":"#6b7280"}}>{a.status||"Saudável"}</span></td>
                      <td style={{...tdS,color:"#6b7280"}}>{a.pasto||"—"}</td>
                      <td style={{...tdS,color:"#6b7280"}}>{a.dtEntrada?new Date(a.dtEntrada+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td>
                      <td style={tdS}>
                        <div style={{display:"flex",gap:6}}>
                          <button onClick={()=>{setEditL(a);setFormL({...a});setModalL(true);}} style={{padding:"5px 10px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>✏️</button>
                          <button onClick={()=>setConfirmL({id:a.id,nome:a.brinco||a.lote||"Animal"})} style={{padding:"5px 10px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div></Card>

          {/* Modal cadastro/edição */}
          {modalL&&(
            <Modal title={editL?"Editar Animal/Lote":"Cadastrar Animal / Lote"} onClose={()=>{setModalL(false);setEditL(null);setFormL({});}} largura={580}>
              <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:0}}>
                <Campo label="Tipo de Registro *" value={formL.tipo_registro||"Individual"} onChange={v=>setFormL({...formL,tipo_registro:v})} options={["Individual","Lote"]}/>
                <Campo label={formL.tipo_registro==="Lote"?"Nome do Lote *":"Brinco / Nº *"} value={formL.brinco||""} onChange={v=>setFormL({...formL,brinco:v})} placeholder={formL.tipo_registro==="Lote"?"Ex: Lote Matrizes A":"Ex: BL-001"}/>
                {formL.tipo_registro==="Lote"&&<Campo label="Quantidade *" value={formL.qtd||""} onChange={v=>setFormL({...formL,qtd:v})} type="number" placeholder="Ex: 22"/>}
                <Campo label="Raça *" value={formL.raca||""} onChange={v=>setFormL({...formL,raca:v})} options={["Gir","Girolando","Holandesa","Jersey","Nelore Leiteiro","Mestiça","Outra"]}/>
                <Campo label="Categoria *" value={formL.categoria||"Vaca em Lactação"} onChange={v=>setFormL({...formL,categoria:v})} options={["Vaca em Lactação","Vaca Seca","Novilha","Bezerra","Touro"]}/>
                <Campo label="Status Sanitário" value={formL.status||"Saudável"} onChange={v=>setFormL({...formL,status:v})} options={["Saudável","Em Tratamento","Observação","Gestante","Descarte"]}/>
                <Campo label="Pasto Atual" value={formL.pasto||""} onChange={v=>setFormL({...formL,pasto:v})} placeholder="Ex: Pasto Norte"/>
                <Campo label="Data de Entrada" value={formL.dtEntrada||""} onChange={v=>setFormL({...formL,dtEntrada:v})} type="date"/>
                {formL.tipo_registro!=="Lote"&&<Campo label="Próx. Vacina" value={formL.proxVacina||""} onChange={v=>setFormL({...formL,proxVacina:v})} placeholder="Ex: Jul/25"/>}
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:8}}>
                <button onClick={()=>{setModalL(false);setEditL(null);setFormL({});}} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancelar</button>
                <button onClick={()=>{
                  const item={...formL,id:editL?.id||uid(),qtd:Number(formL.qtd)||1,lote:formL.tipo_registro==="Lote"?formL.brinco:""};
                  if(editL) dbUpdate("animais_leiteiro",item,setAnimaisLeiteiro);
                  else dbAdd("animais_leiteiro",item,setAnimaisLeiteiro);
                  setModalL(false);setEditL(null);setFormL({});
                }} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>💾 Salvar</button>
              </div>
            </Modal>
          )}

          {/* Confirmar exclusão */}
          {confirmL&&(
            <Confirm msg={`Excluir "${confirmL.nome}"?`} danger={true}
              onSim={()=>{dbDelete("animais_leiteiro",confirmL.id,setAnimaisLeiteiro);setConfirmL(null);}}
              onNao={()=>setConfirmL(null)}/>
          )}
        </div>
      

      )}
      {tab==="corte" && (
        <Card style={{ padding:0,overflow:"hidden" }}><div style={{overflowX:"auto"}}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:480 }}>
            <thead><tr>{["Brinco","Categoria","Peso Prev.","Peso Atual","GMD est.","Arrobas","Entrada","Prev. Abate","Local","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{animaisCorte.map((a,i)=>{
              const gmd  = a.pesoPrev ? ((a.pesoAtual-a.pesoPrev)/90).toFixed(2) : "—";
              const arrs = (a.pesoAtual/15).toFixed(1);
              const cor  = a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
              const bg   = a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
              return (
                <tr key={a.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,fontWeight:700,color:"#1a1a2e"}}>{a.brinco}</td>
                  <td style={tdS}>{a.categoria}</td>
                  <td style={tdS}>{a.pesoPrev} kg</td>
                  <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</td>
                  <td style={tdS}>{gmd} kg/dia</td>
                  <td style={{...tdS,color:"#d4a017",fontWeight:600}}>{arrs} @</td>
                  <td style={{...tdS,color:"#6b7280"}}>{a.dtEntrada}</td>
                  <td style={tdS}>{a.previsaoAbate}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{a.pasto}</td>
                  <td style={tdS}><span style={{ padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor }}>{a.status}</span></td>
                </tr>
              );
            })}</tbody>
            <tfoot>
              <tr style={{ background:"#1b4332" }}>
                <td colSpan={3} style={{ padding:"10px 12px",color:"white",fontWeight:700 }}>Total — {animaisCorte.length} animais</td>
                <td style={{ padding:"10px 12px",color:"#95d5b2",fontWeight:700 }}>{animaisCorte.reduce((s,a)=>s+a.pesoAtual,0).toLocaleString("pt-BR")} kg</td>
                <td colSpan={2} style={{ padding:"10px 12px",color:"#95d5b2",fontWeight:700 }}>{(animaisCorte.reduce((s,a)=>s+a.pesoAtual,0)/15).toFixed(1)} @ totais</td>
                <td colSpan={4}/>
              </tr>
            </tfoot>
          </table></div>
        </Card>
      )}

      {tab==="vacinas" && (
        <Card style={{ padding:0,overflow:"hidden" }}><div style={{overflowX:"auto"}}>
          <table style={{ width:"100%",borderCollapse:"collapse",minWidth:480 }}>
            <thead><tr>{["Data","Rebanho","Lote/Grupo","Vacina/Procedimento","Qtd","Custo","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{
              const pend = v.status==="Pendente";
              return (
                <tr key={v.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</td>
                  <td style={tdS}><span style={{ padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f" }}>🐂 {v.rebanho}</span></td>
                  <td style={tdS}>{v.lote}</td>
                  <td style={tdS}>{v.vacina}</td>
                  <td style={tdS}>{v.qtd} cab.</td>
                  <td style={tdS}>{fmt(v.custo)}</td>
                  <td style={tdS}><span style={{ padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f" }}>{v.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table></div>
        </Card>
      )}

    </div>
  );
}

// ── LANÇAMENTOS (CRUD CENTRAL) ────────────────────────────
function LancamentosView({ producao, setProducao, despesas, setDespesas, receitas, setReceitas, funcionarios, setFuncionarios, animaisCorte, setAnimaisCorte, vacinas, setVacinas, dbAdd, dbUpdate, dbDelete }) {
  const [tab, setTab]         = useState("producao");
  const [modal, setModal]     = useState(null);
  const [editItem, setEditItem]= useState(null);
  const [confirm, setConfirm] = useState(null);
  const [form, setForm]       = useState({});
  const fileRef               = useRef();

  const tabToTable = {
    producao:"producao", despesas:"despesas", receitas:"receitas",
    funcionarios:"funcionarios", corte:"animais_corte", sanitario:"vacinas"
  };
  const tabToState = {
    producao:setProducao, despesas:setDespesas, receitas:setReceitas,
    funcionarios:setFuncionarios, corte:setAnimaisCorte, sanitario:setVacinas
  };
  const tabToData  = {
    producao:producao, despesas:despesas, receitas:receitas,
    funcionarios:funcionarios, corte:animaisCorte, sanitario:vacinas
  };
  const abrirAdd  = () => { setEditItem(null); setForm({ data: hoje() }); setModal(tab); };
  const abrirEdit = (item) => { setEditItem(item); setForm({...item}); setModal(tab); };
  const fechar    = () => { setModal(null); setEditItem(null); setForm({}); };

  const F = (label, campo, type="text", required=false, opts=null) =>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={required} options={opts}/>;

  // ── salvar por tab ──
  const salvar = () => {
    setConfirm({
      msg: editItem ? "Confirmar alteração deste lançamento?" : "Confirmar inclusão do novo lançamento?",
      danger: false,
      onSim: () => {
        const table = tabToTable[tab];
        const setState = tabToState[tab];
        if(editItem) {
          const item = { ...form, id: editItem.id };
          if(tab==="funcionarios") dbUpdate(table, item, setState);
          else dbUpdate(table, item, setState);
        } else {
          const item = { ...form, id: uid() };
          if(tab==="funcionarios") dbAdd(table, {...item, ativo:true}, setState);
          else dbAdd(table, item, setState);
        }
        fechar(); setConfirm(null);
      }
    });
  };

  const excluir = (id, nome) => {
    setConfirm({
      msg: `Deseja excluir permanentemente "${nome}"? Esta ação não pode ser desfeita.`,
      danger: true,
      onSim: () => {
        dbDelete(tabToTable[tab], id, tabToState[tab]);
        setConfirm(null);
      }
    });
  };

  const handleNFUpload = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => setForm(f=>({...f, nf:{ nome:file.name, tamanho:`${(file.size/1024).toFixed(0)} KB`, url:ev.target.result }}));
    reader.readAsDataURL(file);
  };

  const thS = { padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9" };
  const tdS = { padding:"9px 12px",fontSize:12,borderBottom:"1px solid #f3f4f6" };

  const BotaoAdd = ({ label }) => (
    <button onClick={abrirAdd} style={{ display:"flex",alignItems:"center",gap:6,padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600 }}>+ {label}</button>
  );

  const subcatOpts = form.categoria ? (CATEGORIAS_DESPESA[form.categoria]||[]) : [];

  return (
    <div>
      <SectionHeader title="Lançamentos" sub="Cadastro, edição e exclusão de todos os registros da fazenda"/>
      <TabBar tabs={[
        {id:"producao",    label:"🌾 Produção"},
        {id:"despesas",    label:"💸 Despesas"},
        {id:"receitas",    label:"💰 Receitas"},
        {id:"funcionarios",label:"👥 Funcionários"},
        {id:"corte",       label:"🐂 Gado Corte"},
        {id:"sanitario",   label:"💉 Sanitário"},
      ]} active={tab} onChange={setTab}/>

      {/* ── PRODUÇÃO ── */}
      {tab==="producao" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Nova Produção"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Mês / Data","Cacau (kg)","Leite (L)","Coco (un)","Responsável","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{[...producao].sort((a,b)=>b.data.localeCompare(a.data)).map((p,i)=>(
                <tr key={p.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,fontWeight:600}}>{p.mes||p.data}</td>
                  <td style={tdS}>{fmtN(p.cacauKg)} kg</td>
                  <td style={tdS}>{fmtN(p.leiteL)} L</td>
                  <td style={tdS}>{fmtN(p.cocoUn)} un</td>
                  <td style={{...tdS,color:"#6b7280"}}>{p.responsavel}</td>
                  <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(p)}/><BotaoPerigo onClick={()=>excluir(p.id,p.mes||p.data)}>🗑 Excluir</BotaoPerigo></div></td>
                </tr>
              ))}</tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── DESPESAS ── */}
      {tab==="despesas" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Nova Despesa"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Data","Categoria","Subcategoria","Descrição","Fornecedor","Valor","NF","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{[...despesas].sort((a,b)=>b.data.localeCompare(a.data)).map((d,i)=>(
                <tr key={d.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,color:"#6b7280"}}>{d.data}</td>
                  <td style={tdS}>{d.categoria}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{d.subcategoria}</td>
                  <td style={tdS}>{d.descricao}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{d.fornecedor}</td>
                  <td style={{...tdS,fontWeight:700,color:"#e76f51"}}>{fmt(d.valor)}</td>
                  <td style={tdS}>{d.nf ? <a href={d.nf.url} target="_blank" rel="noreferrer" style={{ fontSize:11,color:"#2d6a4f",textDecoration:"none",fontWeight:600 }}>📄 {d.nf.nome}</a> : <span style={{ color:"#9ca3af",fontSize:11 }}>—</span>}</td>
                  <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(d)}/><BotaoPerigo onClick={()=>excluir(d.id,d.descricao)}>🗑</BotaoPerigo></div></td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{ background:"#1b4332" }}>
                <td colSpan={5} style={{ padding:"9px 12px",color:"#95d5b2",fontWeight:700 }}>Total</td>
                <td style={{ padding:"9px 12px",color:"white",fontWeight:800 }}>{fmt(despesas.reduce((s,d)=>s+Number(d.valor||0),0))}</td>
                <td colSpan={2}/>
              </tr></tfoot>
            </table>
          </Card>
        </>
      )}

      {/* ── RECEITAS ── */}
      {tab==="receitas" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Nova Receita"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Data","Atividade","Qtd/Detalhes","Unitário","Valor","Comprador","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{[...receitas].sort((a,b)=>b.data.localeCompare(a.data)).map((r,i)=>(
                <tr key={r.id} style={{ background:i%2?"#fafafa":"white" }}>
                  <td style={{...tdS,color:"#6b7280"}}>{r.data}</td>
                  <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{r.atividade}</td>
                  <td style={tdS}>{r.qtd}</td>
                  <td style={tdS}>{r.unitario}</td>
                  <td style={{...tdS,fontWeight:700,color:"#2d6a4f"}}>{fmt(r.valor)}</td>
                  <td style={{...tdS,color:"#6b7280"}}>{r.comprador}</td>
                  <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(r)}/><BotaoPerigo onClick={()=>excluir(r.id,r.atividade+" "+r.data)}>🗑</BotaoPerigo></div></td>
                </tr>
              ))}</tbody>
              <tfoot><tr style={{ background:"#1b4332" }}>
                <td colSpan={4} style={{ padding:"9px 12px",color:"#95d5b2",fontWeight:700 }}>Total</td>
                <td style={{ padding:"9px 12px",color:"white",fontWeight:800 }}>{fmt(receitas.reduce((s,r)=>s+Number(r.valor||0),0))}</td>
                <td colSpan={2}/>
              </tr></tfoot>
            </table>
          </Card>
        </>
      )}

      {/* ── FUNCIONÁRIOS ── */}
      {tab==="funcionarios" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Novo Funcionário"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Nome","Cargo","Atividade","Salário","Filhos (sal.fam.)","Sal. Família","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{funcionarios.map((f,i)=>{
                const sf = 67.54 * (f.numFilhos||0);
                return (
                  <tr key={f.id} style={{ background:i%2?"#fafafa":"white" }}>
                    <td style={{...tdS,fontWeight:600}}>{f.nome}</td>
                    <td style={{...tdS,color:"#6b7280"}}>{f.cargo}</td>
                    <td style={tdS}>{f.atividade}</td>
                    <td style={{...tdS,color:"#6b7280"}}>{f.dataAdmissao?new Date(f.dataAdmissao+"T12:00:00").toLocaleDateString("pt-BR"):"—"}</td>
                    <td style={{ ...tdS,textAlign:"center" }}>{f.numFilhos||0}</td>
                    <td style={{...tdS,color:"#2d6a4f",fontWeight:sf>0?600:400}}>{sf>0?fmt(sf):"—"}</td>
                    <td style={tdS}><span style={{ padding:"2px 9px",borderRadius:8,fontSize:11,fontWeight:600,background:f.ativo!==false?"#d8f3dc":"#fee2e2",color:f.ativo!==false?"#2d6a4f":"#dc2626" }}>{f.ativo!==false?"Ativo":"Inativo"}</span></td>
                    <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(f)}/><BotaoPerigo onClick={()=>excluir(f.id,f.nome)}>🗑</BotaoPerigo></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── GADO CORTE ── */}
      {tab==="corte" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Novo Animal"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Brinco","Categoria","Peso Prev.(kg)","Peso Atual(kg)","Arroba est.","Entrada","Prev. Abate","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{animaisCorte.map((a,i)=>{
                const cor=a.status==="Pronto p/ Abate"?"#dc2626":a.status==="Em engorda"?"#b45309":"#1d4ed8";
                const bg =a.status==="Pronto p/ Abate"?"#fee2e2":a.status==="Em engorda"?"#fef3c7":"#dbeafe";
                return (
                  <tr key={a.id} style={{ background:i%2?"#fafafa":"white" }}>
                    <td style={{...tdS,fontWeight:700}}>{a.brinco}</td>
                    <td style={tdS}>{a.categoria}</td>
                    <td style={tdS}>{a.pesoPrev} kg</td>
                    <td style={{...tdS,fontWeight:600,color:"#1b4332"}}>{a.pesoAtual} kg</td>
                    <td style={{...tdS,color:"#d4a017",fontWeight:600}}>{(a.pesoAtual/15).toFixed(1)} @</td>
                    <td style={{...tdS,color:"#6b7280"}}>{a.dtEntrada}</td>
                    <td style={tdS}>{a.previsaoAbate}</td>
                    <td style={tdS}><span style={{ padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:bg,color:cor }}>{a.status}</span></td>
                    <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(a)}/><BotaoPerigo onClick={()=>excluir(a.id,a.brinco)}>🗑</BotaoPerigo></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── SANITÁRIO ── */}
      {tab==="sanitario" && (
        <>
          <div style={{ display:"flex",justifyContent:"flex-end",marginBottom:12 }}><BotaoAdd label="Novo Evento Sanitário"/></div>
          <Card style={{ padding:0,overflow:"hidden" }}>
            <table style={{ width:"100%",borderCollapse:"collapse" }}>
              <thead><tr>{["Data","Rebanho","Lote","Vacina/Procedimento","Qtd","Custo","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
              <tbody>{[...vacinas].sort((a,b)=>a.data.localeCompare(b.data)).map((v,i)=>{
                const pend=v.status==="Pendente";
                return (
                  <tr key={v.id} style={{ background:i%2?"#fafafa":"white" }}>
                    <td style={{...tdS,fontWeight:700,color:pend?"#e76f51":"#6b7280"}}>{v.data}</td>
                    <td style={tdS}><span style={{ padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:v.rebanho==="Corte"?"#dbeafe":"#d8f3dc",color:v.rebanho==="Corte"?"#1d4ed8":"#2d6a4f" }}>{v.rebanho}</span></td>
                    <td style={tdS}>{v.lote}</td>
                    <td style={tdS}>{v.vacina}</td>
                    <td style={tdS}>{v.qtd} cab.</td>
                    <td style={tdS}>{fmt(v.custo)}</td>
                    <td style={tdS}><span style={{ padding:"3px 9px",borderRadius:10,fontSize:11,fontWeight:600,background:pend?"#fee2e2":"#d8f3dc",color:pend?"#dc2626":"#2d6a4f" }}>{v.status}</span></td>
                    <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(v)}/><BotaoPerigo onClick={()=>excluir(v.id,v.vacina)}>🗑</BotaoPerigo></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </Card>
        </>
      )}

      {/* ── MODAIS DE FORMULÁRIO ── */}
      {modal==="producao" && (
        <Modal title={editItem?"Editar Produção":"Nova Produção"} onClose={fechar} largura={520}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Data *","data","date",true)}
            {F("Mês de referência","mes","text",false)}
            {F("Cacau (kg) *","cacauKg","number",true)}
            {F("Leite (L) *","leiteL","number",true)}
            {F("Coco (un) *","cocoUn","number",true)}
            {F("Responsável","responsavel","text")}
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10,marginTop:8 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {modal==="despesas" && (
        <Modal title={editItem?"Editar Despesa":"Nova Despesa"} onClose={fechar} largura={600}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Data *","data","date",true)}
            {F("Categoria *","categoria","text",true,Object.keys(CATEGORIAS_DESPESA))}
            {subcatOpts.length>0 && F("Subcategoria","subcategoria","text",false,subcatOpts)}
            {F("Valor (R$) *","valor","number",true)}
            {F("Descrição *","descricao","text",true)}
            {F("Fornecedor","fornecedor","text")}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5 }}>Nota Fiscal (PDF ou imagem)</label>
            <input type="file" accept=".pdf,image/*" ref={fileRef} onChange={handleNFUpload} style={{ fontSize:13 }}/>
            {form.nf && <div style={{ marginTop:6,padding:"6px 10px",background:"#f0faf4",borderRadius:6,fontSize:12,color:"#2d6a4f" }}>📄 {form.nf.nome} — {form.nf.tamanho}</div>}
            <div style={{ marginTop:4,fontSize:11,color:"#9ca3af" }}>⚠️ Arquivos ficam disponíveis apenas nesta sessão. Para armazenamento permanente, entre em contato para configurar Supabase Storage.</div>
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {modal==="receitas" && (
        <Modal title={editItem?"Editar Receita":"Nova Receita"} onClose={fechar} largura={520}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Data *","data","date",true)}
            {F("Atividade *","atividade","text",true,["Cacau","Leite","Coco","Gado Corte","Outros"])}
            {F("Valor (R$) *","valor","number",true)}
            {F("Qtd / Detalhes","qtd","text")}
            {F("Valor Unitário","unitario","text")}
            {F("Comprador","comprador","text")}
          </div>
          <Campo label="Observações" value={form.obs||""} onChange={v=>setForm({...form,obs:v})}/>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {modal==="funcionarios" && (
        <Modal title={editItem?"Editar Funcionário":"Novo Funcionário"} onClose={fechar} largura={520}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Nome completo *","nome","text",true)}
            {F("Cargo *","cargo","text",true)}
            {F("Atividade","atividade","text",false,["Geral","Cacau","Coco","Leiteiro","Gado Corte"])}
            {F("Data de admissão","dataAdmissao","date")}
            {F("Nº filhos (Sal. Família)","numFilhos","number")}
          </div>
          {Number(form.numFilhos||0)>0 && (
            <div style={{ padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12 }}>
              ✅ Salário família: R$ 67,54 × {form.numFilhos} = {fmt(67.54*Number(form.numFilhos))} <span style={{color:"#9ca3af"}}>(aplicado quando sal. ≤ R$ 1.906,04)</span>
            </div>
          )}
          <div style={{ padding:10,background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92400e",marginBottom:12 }}>
            💡 O salário bruto é informado na <strong>Folha Salarial</strong>, pois pode variar a cada mês.
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {modal==="corte" && (
        <Modal title={editItem?"Editar Animal":"Novo Animal — Gado de Corte"} onClose={fechar} largura={580}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Brinco *","brinco","text",true)}
            {F("Categoria","categoria","text",false,["Boi Gordo","Garrote","Novilha","Bezerro Rec."])}
            {F("Peso de entrada (kg)","pesoPrev","number")}
            {F("Peso atual (kg) *","pesoAtual","number",true)}
            {F("Data de entrada","dtEntrada","text")}
            {F("Prev. abate","previsaoAbate","text")}
            {F("Pasto / Local","pasto","text")}
            {F("Status","status","text",false,["Em engorda","Pronto p/ Abate","Recria"])}
            {F("Custo de aquisição (R$)","custoAquisicao","number")}
          </div>
          {form.pesoAtual && <div style={{ padding:10,background:"#f0faf4",borderRadius:8,fontSize:12,color:"#2d6a4f",marginBottom:12 }}>Arrobas estimadas: <strong>{(Number(form.pesoAtual)/15).toFixed(1)} @</strong> · Receita estimada: <strong>{fmt((Number(form.pesoAtual)/15)*325)}</strong></div>}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {modal==="sanitario" && (
        <Modal title={editItem?"Editar Evento Sanitário":"Novo Evento Sanitário"} onClose={fechar} largura={540}>
          <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:0 }}>
            {F("Data *","data","date",true)}
            {F("Rebanho *","rebanho","text",true,["Leiteiro","Corte","Ambos"])}
            {F("Lote / Grupo","lote","text")}
            {F("Vacina / Procedimento *","vacina","text",true)}
            {F("Qtd animais","qtd","number")}
            {F("Custo total (R$)","custo","number")}
            {F("Status","status","text",false,["Pendente","Realizado","Cancelado"])}
          </div>
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── GESTÃO DE USUÁRIOS ────────────────────────────────────
function UsuariosView({ usuarios, setUsuarios }) {
  const [modal, setModal]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]     = useState({});
  const [confirm, setConfirm] = useState(null);
  const [showSenhas, setShowSenhas] = useState({});

  const abrirAdd  = () => { setEditItem(null); setForm({ ativo:true, perfil:"Operacional" }); setModal(true); };
  const abrirEdit = item => { setEditItem(item); setForm({...item}); setModal(true); };
  const fechar    = () => { setModal(false); setEditItem(null); setForm({}); };

  const salvar = () => {
    setConfirm({
      msg: editItem ? `Confirmar alterações no usuário "${form.nome}"?` : `Confirmar criação do usuário "${form.nome}"?`,
      danger: false,
      onSim: () => {
        const item = { ...form, id: editItem?.id || uid() };
        setUsuarios(prev => editItem ? prev.map(x=>x.id===item.id?item:x) : [...prev,item]);
        fechar(); setConfirm(null);
      }
    });
  };

  const excluir = (id, nome) => {
    setConfirm({
      msg: `Excluir o usuário "${nome}"? Ele perderá o acesso imediatamente.`,
      danger: true,
      onSim: () => { setUsuarios(prev => prev.filter(x=>x.id!==id)); setConfirm(null); }
    });
  };

  const F = (label, campo, type="text", required=false, opts=null) =>
    <Campo key={campo} label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={required} options={opts}/>;

  const thS = { padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9" };
  const tdS = { padding:"10px 12px",fontSize:13,borderBottom:"1px solid #f3f4f6" };

  const nivelCor = p => p==="Administrador"?"#1b4332":p==="Gerente"?"#457b9d":p==="Financeiro"?"#d4a017":"#52b788";

  return (
    <div>
      <SectionHeader title="Gestão de Usuários" sub="Apenas administradores podem criar, editar e definir níveis de acesso"/>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,flex:1,marginRight:20 }}>
          {NIVEIS.map(n=>(
            <div key={n} style={{ padding:"10px 14px",background:"white",borderRadius:10,borderLeft:`3px solid ${nivelCor(n)}`,boxShadow:"0 1px 3px rgba(0,0,0,0.06)" }}>
              <div style={{ fontSize:11,color:"#6b7280" }}>{n}</div>
              <div style={{ fontSize:18,fontWeight:700,color:nivelCor(n) }}>{usuarios.filter(u=>u.perfil===n).length}</div>
            </div>
          ))}
        </div>
        <BotaoP onClick={abrirAdd}>+ Novo Usuário</BotaoP>
      </div>

      <Card style={{ padding:0,overflow:"hidden" }}>
        <table style={{ width:"100%",borderCollapse:"collapse" }}>
          <thead><tr>{["Nome","Usuário","Senha","Perfil / Acesso","Status","Ações"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.map((u,i)=>(
              <tr key={u.id} style={{ background:i%2?"#fafafa":"white" }}>
                <td style={{...tdS,fontWeight:600,color:"#1a1a2e"}}>{u.nome}</td>
                <td style={{...tdS,fontFamily:"monospace",color:"#374151"}}>{u.usuario}</td>
                <td style={tdS}>
                  <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                    <span style={{ fontFamily:"monospace",fontSize:12 }}>{showSenhas[u.id]?u.senha:"••••••••"}</span>
                    <button onClick={()=>setShowSenhas(s=>({...s,[u.id]:!s[u.id]}))} style={{ background:"none",border:"none",cursor:"pointer",fontSize:13,color:"#9ca3af" }}>{showSenhas[u.id]?"🙈":"👁"}</button>
                  </div>
                </td>
                <td style={tdS}><span style={{ padding:"3px 10px",borderRadius:10,fontSize:12,fontWeight:700,background:nivelCor(u.perfil)+"22",color:nivelCor(u.perfil) }}>{u.perfil}</span></td>
                <td style={tdS}><span style={{ padding:"3px 9px",borderRadius:8,fontSize:11,fontWeight:600,background:u.ativo!==false?"#d8f3dc":"#fee2e2",color:u.ativo!==false?"#2d6a4f":"#dc2626" }}>{u.ativo!==false?"Ativo":"Inativo"}</span></td>
                <td style={tdS}><div style={{ display:"flex",gap:6 }}><BotaoEditar onClick={()=>abrirEdit(u)}/><BotaoPerigo onClick={()=>excluir(u.id,u.nome)}>🗑</BotaoPerigo></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card style={{ marginTop:14,background:"#f8faf9" }}>
        <CardTitle>Nível de acesso por perfil</CardTitle>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          {[
            { p:"Administrador", desc:"Acesso total. Gerencia usuários, financeiro, produção, manejo e lançamentos.", acesso:["Dashboard","Financeiro","Produção","Manejo","Gado Corte","Lançamentos","Usuários"] },
            { p:"Gerente",       desc:"Operação do campo. Sem acesso ao módulo financeiro nem gestão de usuários.",  acesso:["Dashboard","Produção","Manejo","Gado Corte","Lançamentos"] },
            { p:"Financeiro",    desc:"Acesso ao financeiro e lançamentos de despesas/receitas apenas.",              acesso:["Dashboard","Financeiro","Lançamentos"] },
            { p:"Operacional",   desc:"Apenas produção, manejo e lançamentos de campo.",                              acesso:["Produção","Manejo","Lançamentos"] },
          ].map((n,i)=>(
            <div key={i} style={{ padding:14,background:"white",borderRadius:8,borderTop:`3px solid ${nivelCor(n.p)}` }}>
              <div style={{ fontSize:13,fontWeight:700,color:nivelCor(n.p),marginBottom:6 }}>{n.p}</div>
              <div style={{ fontSize:11,color:"#6b7280",marginBottom:8 }}>{n.desc}</div>
              {n.acesso.map(a=><div key={a} style={{ fontSize:11,color:"#374151",padding:"2px 0",borderBottom:"1px solid #f3f4f6" }}>✅ {a}</div>)}
            </div>
          ))}
        </div>
      </Card>

      {modal && (
        <Modal title={editItem?"Editar Usuário":"Novo Usuário"} onClose={fechar} largura={480}>
          {F("Nome completo *","nome","text",true)}
          {F("Usuário (login) *","usuario","text",true)}
          {F("Senha *","senha","text",true)}
          {F("Perfil de Acesso *","perfil","text",true,NIVEIS)}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13 }}>
              <input type="checkbox" checked={form.ativo!==false} onChange={e=>setForm({...form,ativo:e.target.checked})}/>
              Usuário ativo
            </label>
          </div>
          {form.perfil && <div style={{ padding:10,background:`${nivelCor(form.perfil)}11`,borderRadius:8,fontSize:12,color:nivelCor(form.perfil),marginBottom:14,fontWeight:600 }}>Perfil selecionado: {form.perfil}</div>}
          <div style={{ display:"flex",justifyContent:"flex-end",gap:10 }}><BotaoSecundario onClick={fechar}>Cancelar</BotaoSecundario><BotaoP onClick={salvar}>💾 Salvar</BotaoP></div>
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── LOGIN ─────────────────────────────────────────────────
function LoginView({ onLogin, usuarios, nomeFazenda }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState("");
  const [show, setShow]       = useState(false);

  const handleLogin = () => {
    const user = usuarios.find(u => u.usuario===usuario.trim() && u.senha===senha && u.ativo!==false);
    if(user) { setErro(""); onLogin(user); }
    else setErro("Usuário, senha inválidos ou conta inativa.");
  };

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(135deg,#1b4332 0%,#2d6a4f 60%,#52b788 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <div style={{ background:"white",borderRadius:20,padding:"40px 36px",width:360,boxShadow:"0 20px 60px rgba(0,0,0,0.35)" }}>
        <div style={{ textAlign:"center",marginBottom:28 }}>
          <div style={{ fontSize:48,marginBottom:8 }}>🌱</div>
          <div style={{ fontSize:22,fontWeight:800,color:"#1b4332" }}>{nomeFazenda||"FazendaGest"}</div>
          <div style={{ fontSize:12,color:"#6b7280",marginTop:3 }}>Cacau · Leite · Coco · Gado</div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5 }}>Usuário</label>
          <input value={usuario} onChange={e=>setUsuario(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="seu usuário" style={{ width:"100%",padding:"11px 14px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box" }}/>
        </div>
        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5 }}>Senha</label>
          <div style={{ position:"relative" }}>
            <input type={show?"text":"password"} value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} placeholder="sua senha" style={{ width:"100%",padding:"11px 40px 11px 14px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14,boxSizing:"border-box" }}/>
            <button onClick={()=>setShow(!show)} style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",fontSize:16,color:"#9ca3af" }}>{show?"🙈":"👁"}</button>
          </div>
        </div>
        {erro && <div style={{ background:"#fee2e2",border:"1px solid #fca5a5",borderRadius:6,padding:"8px 12px",fontSize:12,color:"#dc2626",marginBottom:10 }}>⚠️ {erro}</div>}
        <button onClick={handleLogin} style={{ width:"100%",padding:"13px",background:"#1b4332",color:"white",border:"none",borderRadius:8,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:6 }}>Entrar</button>
        <div style={{ marginTop:20,background:"#f0faf4",borderRadius:8,padding:12 }}>
          <div style={{ fontSize:11,fontWeight:700,color:"#2d6a4f",marginBottom:5 }}>Acessos disponíveis:</div>
          {usuarios.filter(u=>u.ativo!==false).map((u,i)=>(
            <div key={i} style={{ fontSize:11,color:"#6b7280",marginBottom:2 }}><strong>{u.usuario}</strong> — {u.perfil}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── PASTAGENS ─────────────────────────────────────────────
function PastagensView({ pastagens, setPastagens, dbAdd, dbUpdate, dbDelete }) {
  const mob = useResponsive();
  const [modal, setModal]   = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]     = useState({});
  const [confirm, setConfirm] = useState(null);

  const abrirAdd  = () => { setEditItem(null); setForm({ tipo:"Leiteiro", status:"Em uso" }); setModal(true); };
  const abrirEdit = item => { setEditItem(item); setForm({...item}); setModal(true); };
  const fechar    = () => { setModal(false); setEditItem(null); setForm({}); };

  const salvar = () => {
    setConfirm({ msg: editItem?"Confirmar alteração?":"Confirmar inclusão?", danger:false, onSim:() => {
      const item = { ...form, id: editItem?.id || uid(), area:Number(form.area)||0, capacidade:Number(form.capacidade)||0, atual:Number(form.atual)||0 };
      if(editItem) dbUpdate("pastagens", item, setPastagens);
      else dbAdd("pastagens", item, setPastagens);
      fechar(); setConfirm(null);
    }});
  };
  const excluir = (id, nome) => {
    setConfirm({ msg:`Excluir "${nome}"?`, danger:true, onSim:() => { dbDelete("pastagens", id, setPastagens); setConfirm(null); }});
  };

  const sCor = s => s==="Em uso"?"#2d6a4f":s==="Descanso"?"#457b9d":s==="Em reforma"?"#d4a017":"#e76f51";
  const tCor = t => t==="Corte"?"#457b9d":t==="Leiteiro"?"#2d6a4f":t==="Misto"?"#52b788":"#9ca3af";
  const tot  = { area:pastagens.reduce((s,p)=>s+(p.area||0),0), cap:pastagens.reduce((s,p)=>s+(p.capacidade||0),0), atual:pastagens.reduce((s,p)=>s+(p.atual||0),0) };
  const F    = (label,campo,type="text",req=false,opts=null) => <Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts}/>;

  return (
    <div>
      <SectionHeader title="Gestão de Pastagens" sub="Controle de ocupação, capim e rotação"/>
      <div style={{ display:"grid", gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)", gap:14, marginBottom:18 }}>
        <KpiCard label="Área Total"    value={`${tot.area} ha`} color="#2d6a4f" icon="🌿" trend={0}/>
        <KpiCard label="Capacidade"    value={`${tot.cap} UA`}  color="#52b788" icon="📐" trend={0}/>
        <KpiCard label="Ocupação"      value={`${tot.atual} cab.`} sub={`${tot.cap>0?((tot.atual/tot.cap)*100).toFixed(0):0}%`} color="#d4a017" icon="🐄" trend={0}/>
        <KpiCard label="Em Descanso"   value={`${pastagens.filter(p=>p.status==="Descanso").length}`} color="#457b9d" icon="✅" trend={0}/>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", marginBottom:12 }}>
        <button onClick={abrirAdd} style={{ padding:"9px 18px", background:"#1b4332", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}>+ Nova Pastagem</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"repeat(2,1fr)", gap:14 }}>
        {pastagens.map(p => {
          const ocup = p.capacidade>0 ? p.atual/p.capacidade : 0;
          const sc=sCor(p.status), tc=tCor(p.tipo);
          return (
            <Card key={p.id}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>🌿 {p.nome}</div>
                  <div style={{ display:"flex", gap:6, marginTop:4, flexWrap:"wrap" }}>
                    <span style={{ fontSize:11, color:"#6b7280" }}>{p.area} ha</span>
                    <span style={{ padding:"1px 8px", borderRadius:8, fontSize:11, fontWeight:600, background:tc+"22", color:tc }}>{p.tipo}</span>
                    <span style={{ padding:"1px 8px", borderRadius:8, fontSize:11, fontWeight:600, background:sc+"22", color:sc }}>{p.status}</span>
                  </div>
                </div>
                <div style={{ display:"flex", gap:6 }}>
                  <button onClick={()=>abrirEdit(p)} style={{ padding:"7px 12px", background:"none", color:"#2d6a4f", border:"1px solid #b7e4c7", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 }}>✏️ Editar</button>
                  <button onClick={()=>excluir(p.id,p.nome)} style={{ padding:"7px 14px", background:"none", color:"#dc2626", border:"1px solid #fca5a5", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600 }}>🗑</button>
                </div>
              </div>
              <div style={{ marginBottom:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280", marginBottom:4 }}>
                  <span>{p.atual}/{p.capacidade} cab.</span>
                  <span>{p.atual===0?"Vazio":`${Math.round(ocup*100)}%`}</span>
                </div>
                <div style={{ height:10, background:"#f3f4f6", borderRadius:5, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min(ocup*100,100)}%`, background:ocup>=0.9?"#e76f51":ocup>=0.5?"#2d6a4f":"#d4a017", borderRadius:5 }}/>
                </div>
              </div>
              <div style={{ fontSize:11, color:"#9ca3af" }}>{p.capacidade>0?((p.capacidade/p.area).toFixed(1)):0} UA/ha</div>
              {p.capim && <div style={{ fontSize:11, color:"#6b7280", marginTop:2 }}>🌾 {p.capim}</div>}
              {p.dtPlantio && <div style={{ fontSize:11, color:"#9ca3af" }}>Plantio: {p.dtPlantio}</div>}
              {p.obs && <div style={{ fontSize:11, color:"#9ca3af", marginTop:2, fontStyle:"italic" }}>{p.obs}</div>}
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={editItem?"Editar Pastagem":"Nova Pastagem"} onClose={fechar} largura={560}>
          <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:0 }}>
            {F("Nome *","nome","text",true)}
            {F("Tipo *","tipo","text",true,TIPO_PASTO)}
            {F("Área (ha) *","area","number",true)}
            {F("Capacidade (UA) *","capacidade","number",true)}
            {F("Ocupação atual","atual","number")}
            {F("Status *","status","text",true,STATUS_PASTO)}
            <div style={{ gridColumn:"1/-1" }}>{F("Capim","capim","text",false,CAPINS)}</div>
            {F("Data de plantio","dtPlantio","month")}
          </div>
          <Campo label="Observações" value={form.obs||""} onChange={v=>setForm({...form,obs:v})}/>
          <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:8 }}>
            <button onClick={fechar} style={{ padding:"9px 16px", background:"#f3f4f6", color:"#374151", border:"1px solid #e5e7eb", borderRadius:8, cursor:"pointer", fontSize:13 }}>Cancelar</button>
            <button onClick={salvar} style={{ padding:"9px 18px", background:"#1b4332", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}>💾 Salvar</button>
          </div>
        </Modal>
      )}
      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}

// ── FINANCIAMENTOS ─────────────────────────────────────────
function FinanciamentosView({ financiamentos, setFinanciamentos, setDespesas, dbAdd, dbUpdate, dbDelete }) {
  const mob = useResponsive();
  const [tab, setTab]         = useState("lista");
  const [modal, setModal]     = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm]       = useState({});
  const [confirm, setConfirm] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [pgModal, setPgModal] = useState(null);

  // Detectar tipo de financiamento para adaptar formulário
  const isCusteio = t => (t||"").startsWith("Custeio");
  const isInvest  = t => ["Investimento","PRONAF","FCO"].includes(t||"");

  const abrirAdd  = () => {
    setEditItem(null);
    setForm({ sistema:"SAC", periodicidade:"anual", carencia:0, status:"Ativo", dtContratacao:hoje(), mesesCusteio:12, iof:0, iofAdicional:0, tarifaEstudo:0, seguroPenhor:0, cetMensal:0, cetAnual:0 });
    setModal(true);
  };
  const abrirEdit = item => { setEditItem(item); setForm({...item}); setModal(true); };
  const fechar    = () => { setModal(false); setEditItem(null); setForm({}); };

  // Adaptar sistema e periodicidade quando o tipo muda
  const setTipo = v => {
    if(isCusteio(v)) setForm(f=>({...f, tipo:v, sistema:"Parcela Única", periodicidade:"unica"}));
    else if(v==="Custeio Pecuário Leite") setForm(f=>({...f, tipo:v, sistema:"SAC", periodicidade:"mensal"}));
    else setForm(f=>({...f, tipo:v, sistema:"SAC", periodicidade:"anual"}));
  };

  const getSaldo = f => { const t=calcTabela(f).filter(p=>p.parcela>0); const p=t.find(p=>!(f.pagamentos||[]).includes(p.parcela)); return p?p.saldo:0; };
  const getProx  = f => calcTabela(f).filter(p=>p.parcela>0).find(p=>!(f.pagamentos||[]).includes(p.parcela));

  const salvar = () => {
    setConfirm({ msg:editItem?"Confirmar alteração?":"Confirmar inclusão?", danger:false, onSim:() => {
      const item = {
        ...form, id:editItem?.id||uid(),
        valor:Number(form.valor)||0, taxa:Number(form.taxa)||0,
        carencia:Number(form.carencia)||0, prazo:Number(form.prazo)||0,
        mesesCusteio:Number(form.mesesCusteio)||12,
        numParcelas:Number(form.numParcelas)||0,
        iof:Number(form.iof)||0, iofAdicional:Number(form.iofAdicional)||0,
        tarifaEstudo:Number(form.tarifaEstudo)||0, seguroPenhor:Number(form.seguroPenhor)||0,
        cetMensal:Number(form.cetMensal)||0, cetAnual:Number(form.cetAnual)||0,
        pagamentos:editItem?.pagamentos||[]
      };
      if(editItem) dbUpdate("financiamentos", item, setFinanciamentos);
      else dbAdd("financiamentos", item, setFinanciamentos);
      fechar(); setConfirm(null);
    }});
  };
  const excluir = (id, nome) => {
    setConfirm({ msg:`Excluir "${nome}"?`, danger:true, onSim:() => { dbDelete("financiamentos", id, setFinanciamentos); setConfirm(null); }});
  };
  const pagar = (fin, parc) => {
    setConfirm({ msg:`Confirmar pagamento de ${fmt(parc.prestacao)}? Será lançado como despesa.`, danger:false, onSim:() => {
      const finAtualizado = {...fin, pagamentos:[...(fin.pagamentos||[]),parc.parcela]};
      dbUpdate("financiamentos", finAtualizado, setFinanciamentos);
      const desp = {
        id:uid(), data:hoje(), categoria:"Financiamentos", subcategoria:"Amortização",
        valor:parc.prestacao,
        descricao:`${fin.banco} – ${fin.finalidade} – Parc.${parc.parcela}${fin.sistema!=="Parcela Única"?`/${isCusteio(fin.tipo)?1:fin.prazo}`:""}`,
        fornecedor:fin.banco, nf:null
      };
      dbAdd("despesas", desp, setDespesas);
      setPgModal(null); setConfirm(null);
    }});
  };

  const ativos      = financiamentos.filter(f=>f.status==="Ativo");
  const dividaTotal = ativos.reduce((s,f)=>s+getSaldo(f),0);
  const proxList    = ativos.map(f=>({...f,prox:getProx(f),saldo:getSaldo(f)})).filter(f=>f.prox).sort((a,b)=>(a.prox?.vencimento||"").localeCompare(b.prox?.vencimento||""));
  const tCor = t => (t||"").startsWith("Custeio")?"#d4a017":t==="PRONAF"?"#2d6a4f":"#457b9d";
  const thS  = {padding:"8px 10px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,borderBottom:"1px solid #e5e7eb",background:"#f8faf9",whiteSpace:"nowrap"};
  const tdS  = {padding:"8px 10px",fontSize:12,borderBottom:"1px solid #f3f4f6"};

  // Badge do sistema / periodicidade
  const badgeSist = f => {
    if(isCusteio(f.tipo)) return {label:"Parcela Única",bg:"#fef3c7",cl:"#b45309"};
    if(f.sistema==="SAC Semestral") return {label:"SAC Semestral",bg:"#dbeafe",cl:"#1d4ed8"};
    if(f.sistema==="PRICE") return {label:"PRICE",bg:"#f3e8ff",cl:"#7c3aed"};
    const per = f.periodicidade||"anual";
    return {label:`SAC ${per}`,bg:"#dbeafe",cl:"#1d4ed8"};
  };

  // Campo auxiliar
  const F = (label,campo,type="text",req=false,opts=null,ph="") =>
    <Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} required={req} options={opts} placeholder={ph}/>;

  return (
    <div>
      <SectionHeader title="Financiamentos Rurais" sub="Custeio e investimento — amortização alinhada à safra"/>
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:14,marginBottom:18}}>
        <KpiCard label="Dívida Total"     value={fmt(dividaTotal)}  color="#e76f51" icon="🏦" trend={-1}/>
        <KpiCard label="Contratos Ativos" value={`${ativos.length}`} color="#457b9d" icon="📄" trend={0}/>
        <KpiCard label="Próx. Vencimento" value={proxList[0]?.prox?.vencimento||"—"} color="#d4a017" icon="📅" trend={0}/>
        <KpiCard label="Próx. Valor"      value={fmt(proxList[0]?.prox?.prestacao||0)} color="#2d6a4f" icon="💰" trend={0}/>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
        <TabBar tabs={[{id:"lista",label:"📋 Contratos"},{id:"posicao",label:"📊 Posição"}]} active={tab} onChange={setTab}/>
        <button onClick={abrirAdd} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>+ Novo Financiamento</button>
      </div>

      {tab==="lista" && (
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          {financiamentos.length===0 && <Card><div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>Nenhum financiamento cadastrado.</div></Card>}
          {financiamentos.map(f=>{
            const saldo=getSaldo(f), prox=getProx(f), tc=tCor(f.tipo), bs=badgeSist(f);
            const tabela=calcTabela(f), pagas=(f.pagamentos||[]).length;
            return (
              <Card key={f.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:10}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
                      <span style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>🏦 {f.banco}</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:700,background:tc+"22",color:tc}}>{f.tipo}</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,fontWeight:600,background:bs.bg,color:bs.cl}}>{bs.label}</span>
                      <span style={{padding:"2px 8px",borderRadius:8,fontSize:11,background:f.status==="Ativo"?"#d8f3dc":"#f3f4f6",color:f.status==="Ativo"?"#2d6a4f":"#9ca3af"}}>{f.status}</span>
                    </div>
                    <div style={{fontSize:13,color:"#374151",marginBottom:2}}>{f.finalidade}</div>
                    <div style={{fontSize:12,color:"#6b7280"}}>
                      {f.numeroContrato&&<><strong>{f.numeroContrato}</strong> · </>}Taxa: {f.taxa}% a.a.{f.cetAnual>0&&<> · CET: {f.cetAnual}% a.a.</>}
                      {!isCusteio(f.tipo)&&<> · {f.numParcelas||f.prazo} parcelas {f.periodicidade==="anual"?"anuais":"mensais"}{f.carencia>0?` · Carência: ${f.carencia}m`:""}</>}
                      {isCusteio(f.tipo)&&<> · Venc: {f.dtVencimento||"—"} · Prazo: {f.mesesCusteio||12} meses</>}
                      {pagas>0&&<> · {pagas}/{tabela.length} pago(s)</>}
                    </div>
                  </div>
                  <div style={{textAlign:"right",minWidth:130}}>
                    <div style={{fontSize:11,color:"#6b7280"}}>Saldo devedor</div>
                    <div style={{fontSize:18,fontWeight:800,color:"#e76f51"}}>{fmt(saldo)}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>de {fmt(f.valor)}</div>
                  </div>
                </div>
                <div style={{height:4,background:"#f3f4f6",borderRadius:2,margin:"10px 0 8px",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${Math.min((saldo/Math.max(f.valor,1))*100,100)}%`,background:"#e76f51",borderRadius:2}}/>
                </div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setDetalhe(f)} style={{padding:"6px 12px",fontSize:12,background:"#f0faf4",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",color:"#1b4332",fontWeight:600}}>📋 Detalhes</button>
                  {prox&&<button onClick={()=>setPgModal({fin:f,parc:prox})} style={{padding:"6px 12px",fontSize:12,background:"#1b4332",border:"none",borderRadius:6,cursor:"pointer",color:"white",fontWeight:600}}>💳 Registrar Pagamento</button>}
                  <button onClick={()=>abrirEdit(f)} style={{padding:"7px 12px",background:"none",color:"#2d6a4f",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>✏️ Editar</button>
                  <button onClick={()=>excluir(f.id,f.banco)} style={{padding:"7px 14px",background:"none",color:"#dc2626",border:"1px solid #fca5a5",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>🗑</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab==="posicao" && (
        <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:14}}>
          <Card>
            <CardTitle>Saldo por Contrato</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ativos.map(f=>({name:(f.banco||"").slice(0,12),saldo:Math.round(getSaldo(f))}))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="name" tick={{fontSize:10}}/>
                <YAxis tick={{fontSize:9}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/>
                <Bar dataKey="saldo" fill="#e76f51" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Próximos vencimentos</CardTitle>
            {proxList.map((f,i)=>(
              <div key={i} style={{padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <div>
                    <div style={{fontSize:13,fontWeight:600}}>{f.banco}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>{f.finalidade} · Venc: {f.prox?.vencimento}</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:"#e76f51"}}>{fmt(f.saldo)}</div>
                    <div style={{fontSize:11,color:"#9ca3af"}}>próx: {fmt(f.prox?.prestacao||0)}</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{marginTop:12,padding:"10px 0",borderTop:"2px solid #1b4332",display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,color:"#1b4332"}}>Total dívida</span>
              <span style={{fontSize:16,fontWeight:800,color:"#e76f51"}}>{fmt(dividaTotal)}</span>
            </div>
          </Card>
        </div>
      )}

      {/* Detalhe do contrato */}
      {detalhe&&(()=>{
        const tabela=calcTabela(detalhe), pagas=detalhe.pagamentos||[], bs=badgeSist(detalhe);
        const despTotal=(detalhe.iof||0)+(detalhe.iofAdicional||0)+(detalhe.tarifaEstudo||0)+(detalhe.seguroPenhor||0);
        return (
          <Modal title={`📋 ${detalhe.banco} — ${detalhe.finalidade}`} onClose={()=>setDetalhe(null)} largura={760}>
            {/* Grid de informações do contrato */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
              {[
                detalhe.numeroContrato?["Contrato",detalhe.numeroContrato]:null,
                ["Valor Liberado",fmt(detalhe.valor)],
                ["Taxa Efetiva",`${detalhe.taxa}% a.a.`],
                detalhe.cetAnual>0?["CET",`${detalhe.cetMensal}% m · ${detalhe.cetAnual}% a.a.`]:null,
                ["Liberação",detalhe.dtContratacao||"—"],
                ["Status",detalhe.status],
                isCusteio(detalhe.tipo)?["Vencimento",detalhe.dtVencimento||"—"]:["Sistema",bs.label],
                !isCusteio(detalhe.tipo)?["Parcelas",`${detalhe.numParcelas||detalhe.prazo} × ${detalhe.periodicidade}`]:null,
                detalhe.carencia>0?["Carência",`${detalhe.carencia} meses`]:null,
              ].filter(Boolean).map(([l,v],i)=>(
                <div key={i} style={{padding:"8px 12px",background:"#f8faf9",borderRadius:6}}>
                  <div style={{fontSize:10,color:"#6b7280"}}>{l}</div>
                  <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{v}</div>
                </div>
              ))}
            </div>
            {/* Despesas vinculadas */}
            {despTotal>0&&(
              <div style={{marginBottom:12,padding:"10px 14px",background:"#fef3c7",borderRadius:8}}>
                <div style={{fontSize:11,fontWeight:700,color:"#92400e",marginBottom:6}}>Despesas vinculadas à concessão</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:4,fontSize:12}}>
                  {detalhe.iof>0&&<div><span style={{color:"#6b7280"}}>IOF: </span><strong>{fmt(detalhe.iof)}</strong></div>}
                  {detalhe.iofAdicional>0&&<div><span style={{color:"#6b7280"}}>IOF Adicional: </span><strong>{fmt(detalhe.iofAdicional)}</strong></div>}
                  {detalhe.tarifaEstudo>0&&<div><span style={{color:"#6b7280"}}>Tarifa Estudo: </span><strong>{fmt(detalhe.tarifaEstudo)}</strong></div>}
                  {detalhe.seguroPenhor>0&&<div><span style={{color:"#6b7280"}}>BB Seguro Penhor: </span><strong>{fmt(detalhe.seguroPenhor)}</strong></div>}
                  <div style={{gridColumn:"1/-1",borderTop:"1px solid #fcd34d",paddingTop:4,display:"flex",justifyContent:"space-between"}}>
                    <span style={{color:"#b45309",fontWeight:600}}>Valor total devido</span>
                    <strong style={{color:"#b45309"}}>{fmt((detalhe.valor||0)+despTotal)}</strong>
                  </div>
                </div>
              </div>
            )}
            {/* Tabela de amortização */}
            <div style={{fontSize:11,color:"#6b7280",marginBottom:8}}>{detalhe.finalidade} · {bs.label} · {detalhe.taxa}% a.a.</div>
            <div style={{maxHeight:320,overflow:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,minWidth:500}}>
                <thead style={{position:"sticky",top:0}}>
                  <tr>{["Parc.","Vencimento","Saldo","Amort.","Juros","Total","Tipo","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {tabela.map((p,i)=>{
                    const isCarencia = p.parcela===0;
                    const paga = !isCarencia && pagas.includes(p.parcela);
                    return(
                      <tr key={i} style={{background:isCarencia?"#fef9ec":paga?"#f0faf4":i%2?"#fafafa":"white"}}>
                        <td style={{...tdS,fontWeight:700,color:isCarencia?"#b45309":"inherit"}}>
                          {isCarencia?"—":p.parcela}
                        </td>
                        <td style={{...tdS,color:"#6b7280"}}>{p.vencimento}</td>
                        <td style={tdS}>{fmt(p.saldo)}</td>
                        <td style={{...tdS,color:"#2d6a4f"}}>{p.amortizacao>0?fmt(p.amortizacao):"—"}</td>
                        <td style={{...tdS,color:"#e76f51"}}>{fmt(p.juros)}</td>
                        <td style={{...tdS,fontWeight:700,color:isCarencia?"#b45309":"#1b4332"}}>{fmt(p.prestacao)}</td>
                        <td style={tdS}><span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:isCarencia?"#fef3c7":p.tipo==="Carência"?"#fef3c7":"#f0faf4",color:isCarencia?"#b45309":p.tipo==="Carência"?"#b45309":"#2d6a4f"}}>{isCarencia?"Carência":p.tipo}</span></td>
                        <td style={tdS}>
                          {isCarencia
                            ? <span style={{fontSize:10,color:"#9ca3af"}}>Informativo</span>
                            : <span style={{fontSize:10,padding:"1px 6px",borderRadius:6,background:paga?"#d8f3dc":"#fee2e2",color:paga?"#2d6a4f":"#dc2626"}}>{paga?"✅ Pago":"Pendente"}</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
              <button onClick={()=>setDetalhe(null)} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Fechar</button>
            </div>
          </Modal>
        );
      })()}

            {/* Modal pagamento */}
      {pgModal&&(
        <Modal title="💳 Registrar Pagamento" onClose={()=>setPgModal(null)} largura={420}>
          <div style={{marginBottom:16,padding:14,background:"#f8faf9",borderRadius:8}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{pgModal.fin.banco} — {pgModal.fin.finalidade}</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
              <div><span style={{color:"#6b7280"}}>Vencimento:</span> <strong>{pgModal.parc.vencimento}</strong></div>
              <div><span style={{color:"#6b7280"}}>Total:</span> <strong style={{color:"#1b4332"}}>{fmt(pgModal.parc.prestacao)}</strong></div>
              <div><span style={{color:"#6b7280"}}>Amortização:</span> {fmt(pgModal.parc.amortizacao)}</div>
              <div><span style={{color:"#6b7280"}}>Juros:</span> {fmt(pgModal.parc.juros)}</div>
            </div>
          </div>
          <p style={{fontSize:12,color:"#6b7280",marginBottom:16}}>Será lançado em <strong>Despesas → Financiamentos → Amortização</strong> com a data de hoje.</p>
          <div style={{display:"flex",justifyContent:"flex-end",gap:10}}>
            <button onClick={()=>setPgModal(null)} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancelar</button>
            <button onClick={()=>pagar(pgModal.fin,pgModal.parc)} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>✅ Confirmar Pagamento</button>
          </div>
        </Modal>
      )}

      {/* Modal cadastro/edição */}
      {modal&&(
        <Modal title={editItem?"Editar Financiamento":"Novo Financiamento"} onClose={fechar} largura={720}>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6}}>Identificação</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:0}}>
            <Campo label="Banco *" value={form.banco||""} onChange={v=>setForm({...form,banco:v})} options={["Banco do Brasil","BNB – Nordeste","Caixa Econômica","Sicoob","Sicredi","Bradesco","Outros"]} required/>
            <Campo label="Nº do Contrato" value={form.numeroContrato||""} onChange={v=>setForm({...form,numeroContrato:v})} placeholder="Ex: 12345678-9"/>
            <Campo label="Tipo *" value={form.tipo||""} onChange={setTipo} options={TIPO_FINANC} required/>
            <Campo label="Status" value={form.status||"Ativo"} onChange={v=>setForm({...form,status:v})} options={["Ativo","Quitado","Renegociado"]}/>
            <div style={{gridColumn:"1/-1"}}><Campo label="Finalidade *" value={form.finalidade||""} onChange={v=>setForm({...form,finalidade:v})} required placeholder="Ex: Investimento agropecuário tradicional"/></div>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,marginTop:8}}>Valores e CET</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:0}}>
            <Campo label="Valor Liberado (R$) *" value={form.valor||""} onChange={v=>setForm({...form,valor:v})} type="number" required placeholder="Ex: 163000"/>
            <Campo label="Taxa de Juros Efetiva (% a.a.) *" value={form.taxa||""} onChange={v=>setForm({...form,taxa:v})} type="number" required placeholder="Ex: 7.5"/>
            <Campo label="CET Mensal (%)" value={form.cetMensal||""} onChange={v=>setForm({...form,cetMensal:v})} type="number" placeholder="Ex: 0.65"/>
            <Campo label="CET Anual (%)" value={form.cetAnual||""} onChange={v=>setForm({...form,cetAnual:v})} type="number" placeholder="Ex: 8.1"/>
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,marginTop:8}}>Despesas vinculadas à concessão de crédito</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:0}}>
            <Campo label="IOF (R$)" value={form.iof||""} onChange={v=>setForm({...form,iof:v})} type="number" placeholder="0,00"/>
            <Campo label="IOF Adicional (R$)" value={form.iofAdicional||""} onChange={v=>setForm({...form,iofAdicional:v})} type="number" placeholder="0,00"/>
            <Campo label="Tarifa de Estudo da Operação (R$)" value={form.tarifaEstudo||""} onChange={v=>setForm({...form,tarifaEstudo:v})} type="number" placeholder="0,00"/>
            <Campo label="BB Seguro Penhor Rural (R$)" value={form.seguroPenhor||""} onChange={v=>setForm({...form,seguroPenhor:v})} type="number" placeholder="0,00"/>
          </div>
          {Number(form.valor)>0&&(
            <div style={{padding:"8px 14px",background:"#fef3c7",borderRadius:8,marginBottom:4,fontSize:12,display:"flex",justifyContent:"space-between"}}>
              <span style={{color:"#92400e"}}>Valor total devido = liberado + despesas</span>
              <strong style={{color:"#b45309"}}>{fmt((Number(form.valor)||0)+(Number(form.iof)||0)+(Number(form.iofAdicional)||0)+(Number(form.tarifaEstudo)||0)+(Number(form.seguroPenhor)||0))}</strong>
            </div>
          )}
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,marginTop:8}}>Datas</div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:0}}>
            <Campo label="Data de Liberação *" value={form.dtContratacao||""} onChange={v=>setForm({...form,dtContratacao:v})} type="date" required/>
            <Campo label="Data de Cálculo (CET)" value={form.dataCalculo||""} onChange={v=>setForm({...form,dataCalculo:v})} type="date"/>
            {isCusteio(form.tipo)&&<Campo label="Data de Vencimento *" value={form.dtVencimento||""} onChange={v=>setForm({...form,dtVencimento:v})} type="date" required/>}
            {!isCusteio(form.tipo)&&<Campo label="Data 1ª Parcela" value={form.dtPrimeiraParcela||""} onChange={v=>setForm({...form,dtPrimeiraParcela:v})} type="date"/>}
          </div>
          <div style={{fontSize:11,fontWeight:700,color:"#6b7280",textTransform:"uppercase",letterSpacing:.5,marginBottom:6,marginTop:8}}>
            {isCusteio(form.tipo)?"Custeio":"Reposição de Capital"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"1fr 1fr",gap:0}}>
            {isCusteio(form.tipo)&&<Campo label="Prazo (meses)" value={form.mesesCusteio||""} onChange={v=>setForm({...form,mesesCusteio:v})} type="number" placeholder="Ex: 12"/>}
            {!isCusteio(form.tipo)&&<>
              <Campo label="Nº de Parcelas *" value={form.numParcelas||form.prazo||""} onChange={v=>setForm({...form,numParcelas:v,prazo:v})} type="number" required placeholder="Ex: 8"/>
              <Campo label="Periodicidade *" value={form.periodicidade||"anual"} onChange={v=>setForm({...form,periodicidade:v})} options={["anual","semestral","mensal"]} required/>
              {/* Carência calculada automaticamente pelas datas */}
              {form.dtContratacao&&form.dtPrimeiraParcela&&(()=>{
                const car=diffMeses(form.dtContratacao,form.dtPrimeiraParcela);
                return car>0?<div style={{gridColumn:"1/-1",padding:"8px 12px",background:"#f0faf4",borderRadius:6,fontSize:12,color:"#2d6a4f"}}>📅 Carência calculada: <strong>{car} meses</strong> (liberação → 1ª parcela)</div>:null;
              })()}
              <Campo label="Sistema de amortização" value={form.sistema||"SAC"} onChange={v=>setForm({...form,sistema:v})} options={["SAC","SAC Semestral","PRICE","Não informado"]}/>
            </>}
            <Campo label="Garantias" value={form.garantias||""} onChange={v=>setForm({...form,garantias:v})} placeholder="Ex: Penhor da safra, Hipoteca"/>
          </div>
          {form.valor&&form.taxa&&(form.dtContratacao||'').length>=10&&(()=>{
            const prev=calcTabela({...form,valor:Number(form.valor),taxa:Number(form.taxa),numParcelas:Number(form.numParcelas||form.prazo)||1,prazo:Number(form.numParcelas||form.prazo)||1,mesesCusteio:Number(form.mesesCusteio)||12,dtPrimeiraParcela:form.dtPrimeiraParcela,dtContratacao:form.dtContratacao,pagamentos:[]});
            const totalP=prev.reduce((s,p)=>s+p.prestacao,0);
            const totalJ=prev.reduce((s,p)=>s+p.juros,0);
            const desp=(Number(form.iof)||0)+(Number(form.iofAdicional)||0)+(Number(form.tarifaEstudo)||0)+(Number(form.seguroPenhor)||0);
            return(
              <div style={{marginTop:4,padding:"10px 14px",background:"#f0faf4",borderRadius:8,fontSize:12,color:"#1b4332",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
                <div><div style={{color:"#6b7280",fontSize:11}}>Nº parcelas</div><strong>{prev.length}</strong></div>
                <div><div style={{color:"#6b7280",fontSize:11}}>Total juros</div><strong>{fmt(totalJ)}</strong></div>
                <div><div style={{color:"#6b7280",fontSize:11}}>Total prestações</div><strong>{fmt(totalP)}</strong></div>
                <div><div style={{color:"#6b7280",fontSize:11}}>Custo total c/ despesas</div><strong>{fmt(totalP+desp)}</strong></div>
              </div>
            );
          })()}
          <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:12}}>
            <button onClick={fechar} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancelar</button>
            <button onClick={salvar} style={{padding:"9px 18px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontSize:13}}>💾 Salvar</button>
          </div>
        </Modal>
      )}
      {confirm&&<Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}


// ── CONFIGURAÇÕES ──────────────────────────────────────────
function ConfiguracoesView({ config, setConfig }) {
  const mob = useResponsive();
  const [form, setForm] = useState({...config});
  const [salvo, setSalvo] = useState(false);

  const salvar = () => {
    setConfig({ ...form, precoCacau:Number(form.precoCacau)||18, precoLeite:Number(form.precoLeite)||2.80, precoCoco:Number(form.precoCoco)||2.50, precoArroba:Number(form.precoArroba)||325 });
    setSalvo(true); setTimeout(()=>setSalvo(false), 3000);
  };
  const F = (label,campo,type="text",ph="") => <Campo label={label} value={form[campo]||""} onChange={v=>setForm({...form,[campo]:v})} type={type} placeholder={ph}/>;

  return (
    <div>
      <SectionHeader title="⚙️ Configurações do Sistema" sub="Apenas Administradores têm acesso"/>
      <div style={{ display:"grid", gridTemplateColumns:mob?"1fr":"1fr 1fr", gap:20 }}>
        <div>
          <Card style={{ marginBottom:16 }}>
            <CardTitle>🌱 Identificação da Fazenda</CardTitle>
            {F("Nome da fazenda","nomeFazenda","text","Ex: Fazenda Analu & Ana")}
          </Card>
          <Card>
            <CardTitle>💰 Preços Base das Commodities</CardTitle>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:14, padding:"10px 12px", background:"#f0faf4", borderRadius:8, lineHeight:1.6 }}>
              Atualize conforme negociação com compradores. Os cálculos de receita e lucro serão recalculados automaticamente.
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:0 }}>
              {F("🍫 Cacau (R$/kg)","precoCacau","number","18.00")}
              {F("🥛 Leite (R$/litro)","precoLeite","number","2.80")}
              {F("🥥 Coco (R$/unidade)","precoCoco","number","2.50")}
              {F("🐂 Arroba (R$/@)","precoArroba","number","325.00")}
            </div>
          </Card>
        </div>
        <Card>
          <CardTitle>ℹ️ Sobre o Sistema</CardTitle>
          {[["Versão","v3.1 — Abr/2025"],["Módulos","Dashboard, Financeiro, Produção, Manejo, Pastagens, Financiamentos, Lançamentos, Usuários"],["INSS 2025","Progressivo (Port. MPS/MF nº6/2025)"],["Sal. Família","R$ 65,00/filho para sal. ≤ R$ 1.906,04"],["Dados","Sessão do navegador (React state)"]].map(([l,v],i) => (
            <div key={i} style={{ padding:"7px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div style={{ fontSize:11, color:"#6b7280" }}>{l}</div>
              <div style={{ fontSize:12, color:"#374151", marginTop:2 }}>{v}</div>
            </div>
          ))}
        </Card>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:12, marginTop:20 }}>
        {salvo && <span style={{ padding:"9px 16px", background:"#d8f3dc", borderRadius:8, fontSize:13, color:"#1b4332", fontWeight:600 }}>✅ Salvo!</span>}
        <button onClick={salvar} style={{ padding:"9px 18px", background:"#1b4332", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:13 }}>💾 Salvar Configurações</button>
      </div>
    </div>
  );
}


// ── FOLHA SALARIAL ────────────────────────────────────────
const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function FolhaSalarialView({ funcionarios, folhas, setFolhas, dbAdd, setDespesas }) {
  const mob = useResponsive();
  const anoAtual = new Date().getFullYear();
  const mesAtual = new Date().getMonth() + 1;

  const [aba, setAba]               = useState("historico");
  const [mes, setMes]               = useState(mesAtual);
  const [ano, setAno]               = useState(anoAtual);
  const [tipo, setTipo]             = useState("normal");
  const [popupAberto, setPopupAberto] = useState(false);
  const [selecionados, setSelecionados] = useState({}); // {id: {checked, salario}}
  const [folhaAtiva, setFolhaAtiva] = useState(null);
  const [confirm, setConfirm]       = useState(null);

  const ativos = funcionarios.filter(f => f.ativo !== false);

  // Abrir popup — inicializar state de seleção
  const abrirPopup = () => {
    const init = {};
    ativos.forEach(f => { init[f.id] = { checked: false, salario: "" }; });
    setSelecionados(init);
    setPopupAberto(true);
  };

  const toggleFunc = id => {
    setSelecionados(prev => ({...prev, [id]: {...prev[id], checked: !prev[id].checked}}));
  };
  const setSalario = (id, val) => {
    setSelecionados(prev => ({...prev, [id]: {...prev[id], salario: val}}));
  };
  const selecionadosList = ativos.filter(f => selecionados[f.id]?.checked);

  // Calcular itens da folha
  const calcularItens = () => {
    return selecionadosList.map(f => {
      const sal   = Number(selecionados[f.id]?.salario) || 0;
      const inss  = calcINSSEmpregado(sal);
      const sf    = calcSalFamilia(sal, f.numFilhos || 0);
      const fgts  = calcFGTS(sal);
      const birrf = calcBaseIRRF(sal, inss);
      const liq   = sal - inss + sf;
      const custo = calcCustoEmpresa(sal);
      return {
        id: uid(),
        funcionarioId: f.id,
        funcionarioNome: f.nome,
        salarioBruto: sal,
        inss, salFamilia: sf, fgts,
        baseIrrf: birrf,
        liquido: liq,
        custoEmpresa: custo,
      };
    });
  };

  const gerarFolha = () => {
    if(selecionadosList.length === 0) { alert("Selecione ao menos um funcionário."); return; }
    const semSalario = selecionadosList.filter(f => !Number(selecionados[f.id]?.salario));
    if(semSalario.length > 0) { alert(`Informe o salário de: ${semSalario.map(f=>f.nome).join(", ")}`); return; }
    const itens = calcularItens();
    setFolhaAtiva({ mes, ano, tipo, itens });
    setPopupAberto(false);
    setAba("preview");
  };

  const salvarFolha = () => {
    if(!folhaAtiva) return;
    const tipoLabel = folhaAtiva.tipo==="13o"?"13º Salário":"Salário";
    const mesLabel  = MESES[(Number(folhaAtiva.mes)||1)-1];
    setConfirm({ msg:`Confirmar geração da folha de ${tipoLabel} — ${mesLabel}/${folhaAtiva.ano}?`, danger:false, onSim: async () => {
      const folhaId = uid();
      const itens   = folhaAtiva.itens || [];
      const totBruto  = itens.reduce((s,i) => s + (i.salarioBruto||0), 0);
      const totEnc    = itens.reduce((s,i) => s + ((i.custoEmpresa||0) - (i.salarioBruto||0)), 0);
      const totFgts   = itens.reduce((s,i) => s + (i.fgts||0), 0);
      const totCusto  = itens.reduce((s,i) => s + (i.custoEmpresa||0), 0);

      // Salvar folha no Supabase
      const folha = { id:folhaId, mes:folhaAtiva.mes, ano:folhaAtiva.ano, tipo:folhaAtiva.tipo, status:"fechado", itens };
      await dbAdd("folhas", {id:folhaId, mes:folhaAtiva.mes, ano:folhaAtiva.ano, tipo:folhaAtiva.tipo, status:"fechado"}, () => {});
      for(const item of itens) {
        await dbAdd("folha_itens", {...item, folhaId}, () => {});
      }

      // Lançar como despesa — Opção A (1 lançamento por folha)
      const anoStr = String(folhaAtiva.ano);
      const mesStr = String(folhaAtiva.mes).padStart(2,"0");
      const despData = `${anoStr}-${mesStr}-01`;
      const desp = {
        id: uid(),
        data: despData,
        categoria: "Folha de Pagamento",
        subcategoria: tipoLabel,
        valor: totCusto,
        descricao: `Folha ${tipoLabel} — ${mesLabel}/${folhaAtiva.ano} (${itens.length} func.)`,
        fornecedor: "Folha Salarial",
        nf: null,
      };
      await dbAdd("despesas", desp, setDespesas);

      setFolhas(prev => [folha, ...prev]);
      setFolhaAtiva(null);
      setAba("historico");
      setConfirm(null);
    }});
  };

  const thS = { padding:"9px 12px", textAlign:"left", fontSize:11, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #e5e7eb", background:"#f8faf9", whiteSpace:"nowrap" };
  const tdS = { padding:"9px 12px", fontSize:12, borderBottom:"1px solid #f3f4f6" };

  // Totais do preview
  const totais = folhaAtiva ? folhaAtiva.itens.reduce((acc, it) => ({
    salarioBruto:  acc.salarioBruto  + it.salarioBruto,
    inss:          acc.inss          + it.inss,
    salFamilia:    acc.salFamilia    + it.salFamilia,
    fgts:          acc.fgts          + it.fgts,
    baseIrrf:      acc.baseIrrf      + it.baseIrrf,
    liquido:       acc.liquido       + it.liquido,
    custoEmpresa:  acc.custoEmpresa  + it.custoEmpresa,
  }), {salarioBruto:0,inss:0,salFamilia:0,fgts:0,baseIrrf:0,liquido:0,custoEmpresa:0}) : null;

  return (
    <div>
      <SectionHeader title="📋 Folha Salarial" sub="Geração mensal de folha de pagamento"/>

      {/* KPIs da última folha */}
      {folhas.length > 0 && (() => {
        const ult = folhas[0];
        const tots = (Array.isArray(ult.itens)?ult.itens:[]).reduce((a,it)=>({sal:a.sal+(it.salarioBruto||0),liq:a.liq+(it.liquido||0),custo:a.custo+(it.custoEmpresa||0)}),{sal:0,liq:0,custo:0});
        return (
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:14,marginBottom:18}}>
            <KpiCard label="Última Folha" value={`${MESES[(ult.mes||1)-1]}/${ult.ano}`} sub={(ult.tipo||"normal")==="13o"?"13º Salário":"Salário Normal"} color="#2d6a4f" icon="📋" trend={0}/>
            <KpiCard label="Total Bruto"  value={fmt(tots.sal)}   color="#d4a017" icon="💰" trend={0}/>
            <KpiCard label="Total Líquido" value={fmt(tots.liq)} color="#2d6a4f" icon="✅" trend={0}/>
            <KpiCard label="Custo Empresa" value={fmt(tots.custo)} color="#e76f51" icon="🏢" trend={0}/>
          </div>
        );
      })()}

      <TabBar tabs={[{id:"historico",label:"📂 Histórico"},{id:"nova",label:"➕ Nova Folha"},...(folhaAtiva?[{id:"preview",label:"👁 Preview"}]:[])]} active={aba} onChange={setAba}/>

      {/* ── NOVA FOLHA ── */}
      {aba==="nova" && (
        <Card>
          <CardTitle>Configurar nova folha</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"repeat(3,1fr)",gap:16,marginBottom:20}}>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Mês *</label>
              <select value={mes} onChange={e=>setMes(Number(e.target.value))} style={{width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14}}>
                {MESES.map((m,i)=><option key={i} value={i+1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Ano *</label>
              <select value={ano} onChange={e=>setAno(Number(e.target.value))} style={{width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14}}>
                {[anoAtual-1,anoAtual,anoAtual+1].map(a=><option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{display:"block",fontSize:12,fontWeight:600,color:"#374151",marginBottom:5}}>Tipo *</label>
              <select value={tipo} onChange={e=>setTipo(e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid #d1d5db",borderRadius:8,fontSize:14}}>
                <option value="normal">Salário do Mês</option>
                <option value="13o">13º Salário</option>
              </select>
            </div>
          </div>
          <div style={{padding:"12px 16px",background:"#f0faf4",borderRadius:8,marginBottom:20,fontSize:13,color:"#1b4332"}}>
            Folha de <strong>{tipo==="13o"?"13º Salário":"Salário"}</strong> — <strong>{MESES[mes-1]}/{ano}</strong> · {ativos.length} funcionários ativos disponíveis
          </div>
          <button onClick={abrirPopup} style={{padding:"11px 24px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:14}}>
            👥 Selecionar Funcionários e Informar Salários
          </button>
        </Card>
      )}

      {/* ── HISTÓRICO ── */}
      {aba==="historico" && (
        folhas.length === 0
          ? <Card><div style={{textAlign:"center",padding:30,color:"#9ca3af"}}>
              <div style={{fontSize:32,marginBottom:8}}>📋</div>
              <div style={{fontSize:14}}>Nenhuma folha gerada ainda. Vá em <strong>Nova Folha</strong> para começar.</div>
            </div></Card>
          : <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {folhas.map((f,i) => {
                const tots = (f.itens||[]).reduce((a,it)=>({sal:a.sal+(it.salarioBruto||0),liq:a.liq+(it.liquido||0),custo:a.custo+(it.custoEmpresa||0)}),{sal:0,liq:0,custo:0});
                return (
                  <Card key={f.id||i}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:700,color:"#1a1a2e"}}>
                          {tipo==="13o"?"🎄 13º Salário":"💰 Salário"} — {MESES[(Number(f.mes)||1)-1]}/{f.ano}
                          <span style={{marginLeft:10,padding:"2px 10px",borderRadius:8,fontSize:11,fontWeight:600,background:f.tipo==="13o"?"#fef3c7":"#d8f3dc",color:f.tipo==="13o"?"#b45309":"#2d6a4f"}}>{f.tipo==="13o"?"13º":"Normal"}</span>
                        </div>
                        <div style={{fontSize:12,color:"#6b7280",marginTop:2}}>{(Array.isArray(f.itens)?f.itens:[]).length} funcionários · Bruto: {fmt(tots.sal)} · Líquido: {fmt(tots.liq)}</div>
                      </div>
                      <button onClick={()=>{setFolhaAtiva(f);setAba("preview");}} style={{padding:"7px 14px",background:"none",border:"1px solid #b7e4c7",borderRadius:6,cursor:"pointer",color:"#2d6a4f",fontSize:12,fontWeight:600}}>
                        👁 Ver Folha
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
      )}

      {/* ── PREVIEW DA FOLHA ── */}
      {aba==="preview" && folhaAtiva && (
        <div>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:10}}>
            <div>
              <div style={{fontSize:16,fontWeight:700,color:"#1b4332"}}>
                {folhaAtiva.tipo==="13o"?"🎄 13º Salário":"💰 Folha Salarial"} — {MESES[(Number(folhaAtiva.mes)||1)-1]}/{folhaAtiva.ano}
              </div>
              <div style={{fontSize:12,color:"#6b7280"}}>{(folhaAtiva.itens||[]).length} funcionários</div>
            </div>
            {!folhaAtiva.status && (
              <button onClick={salvarFolha} style={{padding:"9px 20px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
                💾 Salvar Folha
              </button>
            )}
          </div>

          <Card style={{padding:0,overflow:"hidden"}}>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:700}}>
                <thead>
                  <tr>{["Funcionário","Sal. Bruto","INSS (7,5%)","Sal. Família","FGTS (8%)","Base IRRF","Líquido","Custo Empresa"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {(folhaAtiva.itens||[]).map((it,i)=>(
                    <tr key={it.id||i} style={{background:i%2?"#fafafa":"white"}}>
                      <td style={{...tdS,fontWeight:600,color:"#1a1a2e"}}>{it.funcionarioNome}</td>
                      <td style={tdS}>{fmt(it.salarioBruto)}</td>
                      <td style={{...tdS,color:"#e76f51"}}>{fmt(it.inss)}</td>
                      <td style={{...tdS,color:"#2d6a4f",fontWeight:it.salFamilia>0?600:400}}>{it.salFamilia>0?fmt(it.salFamilia):"—"}</td>
                      <td style={{...tdS,color:"#457b9d"}}>{fmt(it.fgts)}</td>
                      <td style={tdS}>{fmt(it.baseIrrf)}</td>
                      <td style={{...tdS,fontWeight:700,color:"#1b4332"}}>{fmt(it.liquido)}</td>
                      <td style={{...tdS,fontWeight:600,color:"#374151"}}>{fmt(it.custoEmpresa)}</td>
                    </tr>
                  ))}
                </tbody>
                {totais && (
                  <tfoot>
                    <tr style={{background:"#1b4332"}}>
                      <td style={{padding:"10px 12px",color:"white",fontWeight:700}}>TOTAIS</td>
                      <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totais.salarioBruto)}</td>
                      <td style={{padding:"10px 12px",color:"#fca5a5",fontWeight:700}}>{fmt(totais.inss)}</td>
                      <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totais.salFamilia)}</td>
                      <td style={{padding:"10px 12px",color:"#a8dadc",fontWeight:700}}>{fmt(totais.fgts)}</td>
                      <td style={{padding:"10px 12px",color:"#e5e7eb",fontWeight:700}}>{fmt(totais.baseIrrf)}</td>
                      <td style={{padding:"10px 12px",color:"white",fontWeight:800}}>{fmt(totais.liquido)}</td>
                      <td style={{padding:"10px 12px",color:"#ffd166",fontWeight:700}}>{fmt(totais.custoEmpresa)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          <div style={{marginTop:12,padding:"12px 16px",background:"#fffbeb",borderRadius:8,fontSize:12,color:"#92400e"}}>
            💡 <strong>Referências:</strong> INSS: 7,5% sobre o salário bruto · Salário Família: R$ 67,54/filho (sal. ≤ R$ 1.906,04) · FGTS: 8% sobre salário bruto · Custo Empresa inclui INSS patronal (20%), FGTS (8%), RAT (1%), SENAR (2%), provisões férias (11,1%) e 13º (8,3%)
          </div>
        </div>
      )}

      {/* ── POPUP SELEÇÃO DE FUNCIONÁRIOS ── */}
      {popupAberto && (
        <Modal title={`👥 Selecionar Funcionários — ${MESES[mes-1]}/${ano} (${tipo==="13o"?"13º":"Normal"})`} onClose={()=>setPopupAberto(false)} largura={680}>
          <div style={{fontSize:12,color:"#6b7280",marginBottom:14,padding:"8px 12px",background:"#f0faf4",borderRadius:6}}>
            Marque os funcionários e informe o salário bruto de cada um para este mês.
          </div>
          <div style={{maxHeight:400,overflowY:"auto"}}>
            {ativos.map((f,i) => (
              <div key={f.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid #f3f4f6"}}>
                <input type="checkbox" checked={!!selecionados[f.id]?.checked} onChange={()=>toggleFunc(f.id)}
                  style={{width:16,height:16,cursor:"pointer",accentColor:"#1b4332"}}/>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:600,color:"#1a1a2e"}}>{f.nome}</div>
                  <div style={{fontSize:11,color:"#6b7280"}}>{f.cargo} · {f.numFilhos||0} dependente(s)</div>
                </div>
                {selecionados[f.id]?.checked && (
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:12,color:"#374151",whiteSpace:"nowrap"}}>Salário bruto:</span>
                    <input
                      type="number"
                      value={selecionados[f.id]?.salario||""}
                      onChange={e=>setSalario(f.id,e.target.value)}
                      placeholder="R$ 0,00"
                      style={{width:110,padding:"6px 10px",border:"1px solid #d1d5db",borderRadius:6,fontSize:13}}
                    />
                  </div>
                )}
                {selecionados[f.id]?.checked && selecionados[f.id]?.salario && (
                  <div style={{fontSize:11,color:"#2d6a4f",minWidth:80,textAlign:"right"}}>
                    Líq: {fmt(Number(selecionados[f.id].salario)*0.925 + calcSalFamilia(Number(selecionados[f.id].salario),f.numFilhos||0))}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,color:"#6b7280"}}>{selecionadosList.length} funcionário(s) selecionado(s)</div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setPopupAberto(false)} style={{padding:"9px 16px",background:"#f3f4f6",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,cursor:"pointer",fontSize:13}}>Cancelar</button>
              <button onClick={gerarFolha} style={{padding:"9px 20px",background:"#1b4332",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
                📋 Gerar Folha
              </button>
            </div>
          </div>
        </Modal>
      )}

      {confirm && <Confirm msg={confirm.msg} danger={confirm.danger} onSim={confirm.onSim} onNao={()=>setConfirm(null)}/>}
    </div>
  );
}


// ── RELATÓRIO FINANCEIRO GERENCIAL ───────────────────────
function RelatorioView({ producao, despesas, receitas, folhas, financiamentos, config, precos }) {
  const mob = useResponsive();
  const anoAtual = new Date().getFullYear();
  const [periodo, setPeriodo] = useState("trimestral");
  const [anoRef,  setAnoRef]  = useState(anoAtual);
  const [trimestreRef, setTrimestreRef] = useState(Math.ceil((new Date().getMonth()+1)/3));
  const [semestreRef, setSemestreRef]   = useState(new Date().getMonth()<6?1:2);

  // ── Definir meses do período ─────────────────────────────
  const getMeses = () => {
    if(periodo==="anual")      return Array.from({length:12},(_,i)=>({mes:i+1,ano:anoRef}));
    if(periodo==="semestral"){
      const ini = semestreRef===1?1:7;
      return Array.from({length:6},(_,i)=>({mes:ini+i,ano:anoRef}));
    }
    // trimestral
    const ini = (trimestreRef-1)*3+1;
    return Array.from({length:3},(_,i)=>({mes:ini+i,ano:anoRef}));
  };
  const mesesPeriodo = getMeses();
  const labelPeriodo = periodo==="anual"?`Ano ${anoRef}`:
    periodo==="semestral"?`${semestreRef}º Semestre ${anoRef}`:
    `${trimestreRef}º Trimestre ${anoRef}`;

  const PC=precos?.precoCacau||18, PL=precos?.precoLeite||2.80,
        PCO=precos?.precoCoco||2.50, PA=precos?.precoArroba||325;

  // ── Filtrar dados do período ─────────────────────────────
  const noMes = (dataStr, m, a) => {
    if(!dataStr) return false;
    const d = new Date(dataStr+"T12:00:00");
    return d.getMonth()+1===m && d.getFullYear()===a;
  };

  const dadosPorMes = mesesPeriodo.map(({mes,ano}) => {
    const recMes   = receitas.filter(r => noMes(r.data,mes,ano));
    const despMes  = despesas.filter(d => noMes(d.data,mes,ano));
    const prodMes  = producao.filter(p => noMes(p.data,mes,ano));
    const recCacau = prodMes.reduce((s,p)=>s+(p.cacauKg||0)*PC,0);
    const recLeite = prodMes.reduce((s,p)=>s+(p.leiteL||0)*PL,0);
    const recCoco  = prodMes.reduce((s,p)=>s+(p.cocoUn||0)*PCO,0);
    const recGado  = recMes.filter(r=>r.atividade==="Gado Corte").reduce((s,r)=>s+(r.valor||0),0);
    const recTotal = recCacau+recLeite+recCoco+recGado;
    const despTotal= despMes.reduce((s,d)=>s+(d.valor||0),0);
    return {
      mes, ano,
      label: MESES[mes-1].slice(0,3)+"/"+String(ano).slice(2),
      recTotal, recCacau, recLeite, recCoco, recGado,
      despTotal, lucro: recTotal-despTotal,
      despPorCat: despMes.reduce((a,d)=>{a[d.categoria]=(a[d.categoria]||0)+(d.valor||0);return a;},{}),
    };
  });

  // Totais do período
  const totRec  = dadosPorMes.reduce((s,m)=>s+m.recTotal,0);
  const totDesp = dadosPorMes.reduce((s,m)=>s+m.despTotal,0);
  const totLuc  = totRec-totDesp;

  // Despesas por categoria no período
  const despPorCatPeriodo = {};
  dadosPorMes.forEach(m => {
    Object.entries(m.despPorCat).forEach(([cat,val])=>{
      despPorCatPeriodo[cat]=(despPorCatPeriodo[cat]||0)+val;
    });
  });

  // Receitas por atividade no período
  const recPizza = [
    {name:"🍫 Cacau", value:dadosPorMes.reduce((s,m)=>s+m.recCacau,0)},
    {name:"🥛 Leite",  value:dadosPorMes.reduce((s,m)=>s+m.recLeite,0)},
    {name:"🥥 Coco",   value:dadosPorMes.reduce((s,m)=>s+m.recCoco,0)},
    {name:"🐂 Gado",   value:dadosPorMes.reduce((s,m)=>s+m.recGado,0)},
  ].filter(x=>x.value>0);

  // Evolução da dívida (saldo devedor de cada financiamento)
  const dividaAtual = financiamentos.filter(f=>f.status==="Ativo").reduce((s,f)=>{
    const tab = calcTabela(f);
    const prox = tab.find(p=>!(f.pagamentos||[]).includes(p.parcela));
    return s+(prox?prox.saldo:0);
  },0);

  // Folhas do período
  const folhasPeriodo = folhas.filter(f =>
    mesesPeriodo.some(m => Number(f.mes)===m.mes && Number(f.ano)===m.ano)
  );
  const totFolhaBruto = folhasPeriodo.reduce((s,f)=>
    s+(f.itens||[]).reduce((a,i)=>a+(i.salarioBruto||0),0),0);
  const totFolhaCusto = folhasPeriodo.reduce((s,f)=>
    s+(f.itens||[]).reduce((a,i)=>a+(i.custoEmpresa||0),0),0);
  const totFolhaFgts  = folhasPeriodo.reduce((s,f)=>
    s+(f.itens||[]).reduce((a,i)=>a+(i.fgts||0),0),0);
  const totFolhaInss  = folhasPeriodo.reduce((s,f)=>
    s+(f.itens||[]).reduce((a,i)=>a+(i.inss||0),0),0);

  const CHART_COLORS = ["#2d6a4f","#52b788","#d4a017","#e76f51","#457b9d","#a8dadc","#f4a261","#264653"];

  return (
    <div>
      <SectionHeader title="📊 Relatório Financeiro Gerencial" sub={`${config?.nomeFazenda||"Fazenda"} — ${labelPeriodo}`}/>

      {/* Seletor de período */}
      <div style={{display:"flex",gap:10,marginBottom:20,flexWrap:"wrap",alignItems:"flex-end"}}>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4}}>PERÍODO</label>
          <div style={{display:"flex",gap:0,borderRadius:8,overflow:"hidden",border:"1px solid #e5e7eb"}}>
            {[["trimestral","Trimestral"],["semestral","Semestral"],["anual","Anual"]].map(([v,l])=>(
              <button key={v} onClick={()=>setPeriodo(v)} style={{padding:"8px 14px",border:"none",cursor:"pointer",fontSize:13,fontWeight:periodo===v?700:400,background:periodo===v?"#1b4332":"white",color:periodo===v?"white":"#374151"}}>{l}</button>
            ))}
          </div>
        </div>
        <div>
          <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4}}>ANO</label>
          <select value={anoRef} onChange={e=>setAnoRef(Number(e.target.value))} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13}}>
            {[anoAtual-2,anoAtual-1,anoAtual].map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        {periodo==="trimestral"&&(
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4}}>TRIMESTRE</label>
            <select value={trimestreRef} onChange={e=>setTrimestreRef(Number(e.target.value))} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13}}>
              {[1,2,3,4].map(t=><option key={t} value={t}>{t}º Trimestre</option>)}
            </select>
          </div>
        )}
        {periodo==="semestral"&&(
          <div>
            <label style={{display:"block",fontSize:11,fontWeight:600,color:"#6b7280",marginBottom:4}}>SEMESTRE</label>
            <select value={semestreRef} onChange={e=>setSemestreRef(Number(e.target.value))} style={{padding:"8px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13}}>
              <option value={1}>1º Semestre</option><option value={2}>2º Semestre</option>
            </select>
          </div>
        )}
        <button onClick={()=>window.print()} style={{padding:"8px 16px",background:"#457b9d",color:"white",border:"none",borderRadius:8,cursor:"pointer",fontSize:13,fontWeight:600}}>🖨️ Imprimir</button>
      </div>

      {/* KPIs principais */}
      <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:14,marginBottom:20}}>
        <KpiCard label="Receita Total"    value={fmt(totRec)}  color="#2d6a4f" icon="💰" trend={1}/>
        <KpiCard label="Despesa Total"    value={fmt(totDesp)} color="#e76f51" icon="📋" trend={-1}/>
        <KpiCard label={totLuc>=0?"Lucro":"Prejuízo"} value={fmt(Math.abs(totLuc))} color={totLuc>=0?"#d4a017":"#dc2626"} icon={totLuc>=0?"📈":"📉"} trend={totLuc>=0?1:-1}/>
        <KpiCard label="Dívida Bancária"  value={fmt(dividaAtual)} color="#457b9d" icon="🏦" trend={-1}/>
      </div>

      {/* Evolução Receita × Despesa × Lucro */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"2fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <CardTitle>Evolução Receita × Despesa × Lucro</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dadosPorMes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="label" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
              <Bar dataKey="recTotal"  name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/>
              <Bar dataKey="despTotal" name="Despesa" fill="#e76f51" radius={[3,3,0,0]}/>
              <Bar dataKey="lucro"     name="Lucro"   fill="#d4a017" radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Receita por Atividade</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={recPizza} cx="50%" cy="48%" outerRadius={70} dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                {recPizza.map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Despesas por categoria */}
      <div style={{display:"grid",gridTemplateColumns:mob?"1fr":"2fr 1fr",gap:14,marginBottom:14}}>
        <Card>
          <CardTitle>Despesas por Categoria no Período</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart layout="vertical" data={Object.entries(despPorCatPeriodo).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([cat,val])=>({cat:cat.replace(/[🐂🥛]/g,"").trim(),val}))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <YAxis type="category" dataKey="cat" tick={{fontSize:10}} width={110}/>
              <Tooltip formatter={v=>fmt(v)}/>
              <Bar dataKey="val" name="Valor" fill="#e76f51" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle>Distribuição de Despesas</CardTitle>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={Object.entries(despPorCatPeriodo).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name:name.replace(/[🐂🥛]/g,"").trim(),value}))} cx="50%" cy="48%" outerRadius={70} dataKey="value" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                {Object.entries(despPorCatPeriodo).slice(0,6).map((_,i)=><Cell key={i} fill={CHART_COLORS[i]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:10}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Receita mês a mês por atividade */}
      <Card style={{marginBottom:14}}>
        <CardTitle>Receita por Atividade — Mês a Mês</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dadosPorMes}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="label" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
            <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="recCacau" name="🍫 Cacau" fill="#d4a017" radius={[3,3,0,0]} stackId="r"/>
            <Bar dataKey="recLeite" name="🥛 Leite" fill="#2d6a4f" radius={[3,3,0,0]} stackId="r"/>
            <Bar dataKey="recCoco"  name="🥥 Coco"  fill="#52b788" radius={[3,3,0,0]} stackId="r"/>
            <Bar dataKey="recGado"  name="🐂 Gado"  fill="#457b9d" radius={[3,3,0,0]} stackId="r"/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Dívidas Bancárias */}
      {financiamentos.filter(f=>f.status==="Ativo").length>0&&(
        <Card style={{marginBottom:14}}>
          <CardTitle>Evolução das Dívidas Bancárias</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:mob?"1fr":financiamentos.filter(f=>f.status==="Ativo").length===1?"1fr":"1fr 1fr",gap:14}}>
            {financiamentos.filter(f=>f.status==="Ativo").map((fin,fi)=>{
              const tab    = calcTabela(fin);
              const pagas  = fin.pagamentos||[];
              const prox   = tab.find(p=>!pagas.includes(p.parcela));
              const saldoAtual = prox?prox.saldo:0;
              const pctQuit = ((1-(saldoAtual/fin.valor))*100).toFixed(0);
              const parcelasRestantes = tab.filter(p=>!pagas.includes(p.parcela)).length;
              return(
                <div key={fin.id} style={{padding:14,background:"#f8faf9",borderRadius:8,borderLeft:`3px solid ${CHART_COLORS[fi%8]}`}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#1a1a2e",marginBottom:6}}>{fin.banco} — {fin.finalidade}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:10}}>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:11,color:"#6b7280"}}>Valor original</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#374151"}}>{fmt(fin.valor)}</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:11,color:"#6b7280"}}>Saldo devedor</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#e76f51"}}>{fmt(saldoAtual)}</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:11,color:"#6b7280"}}>Quitado</div>
                      <div style={{fontSize:14,fontWeight:700,color:"#2d6a4f"}}>{pctQuit}%</div>
                    </div>
                  </div>
                  <div style={{height:8,background:"#e5e7eb",borderRadius:4,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pctQuit}%`,background:CHART_COLORS[fi%8],borderRadius:4,transition:"width 0.5s"}}/>
                  </div>
                  <div style={{marginTop:6,fontSize:11,color:"#9ca3af"}}>{parcelasRestantes} parcelas restantes · {fin.sistema} · {fin.taxa}% a.a.</div>
                </div>
              );
            })}
          </div>
          <div style={{marginTop:12,padding:"10px 14px",background:"#fee2e2",borderRadius:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:13,color:"#b91c1c",fontWeight:600}}>Total dívida bancária atual</span>
            <span style={{fontSize:16,fontWeight:800,color:"#dc2626"}}>{fmt(dividaAtual)}</span>
          </div>
        </Card>
      )}

      {/* Folha de Pagamento no período */}
      {folhasPeriodo.length>0&&(
        <Card style={{marginBottom:14}}>
          <CardTitle>Folha de Pagamento no Período</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:mob?"repeat(2,1fr)":"repeat(4,1fr)",gap:12,marginBottom:14}}>
            {[["Custo Total Empresa",totFolhaCusto,"#e76f51"],["Total Salários Brutos",totFolhaBruto,"#d4a017"],["FGTS Acumulado",totFolhaFgts,"#457b9d"],["INSS Descontado",totFolhaInss,"#9ca3af"]].map(([l,v,c],i)=>(
              <div key={i} style={{padding:12,background:"#f8faf9",borderRadius:8,borderLeft:`3px solid ${c}`}}>
                <div style={{fontSize:11,color:"#6b7280"}}>{l}</div>
                <div style={{fontSize:16,fontWeight:700,color:"#1a1a2e",marginTop:4}}>{fmt(v)}</div>
              </div>
            ))}
          </div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",minWidth:500,fontSize:12}}>
              <thead>
                <tr>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>Folha</th>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>Tipo</th>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>Funcionários</th>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>Total Bruto</th>
                  <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>Custo Empresa</th>
                </tr>
              </thead>
              <tbody>
                {folhasPeriodo.map((f,i)=>{
                  const bruto = (f.itens||[]).reduce((s,it)=>s+(it.salarioBruto||0),0);
                  const custo = (f.itens||[]).reduce((s,it)=>s+(it.custoEmpresa||0),0);
                  return(
                    <tr key={f.id||i} style={{background:i%2?"#fafafa":"white"}}>
                      <td style={{padding:"8px 12px",fontWeight:600}}>{MESES[(Number(f.mes)||1)-1]}/{f.ano}</td>
                      <td style={{padding:"8px 12px"}}><span style={{padding:"2px 8px",borderRadius:6,fontSize:11,fontWeight:600,background:f.tipo==="13o"?"#fef3c7":"#d8f3dc",color:f.tipo==="13o"?"#b45309":"#2d6a4f"}}>{f.tipo==="13o"?"13º Salário":"Normal"}</span></td>
                      <td style={{padding:"8px 12px",color:"#6b7280"}}>{(f.itens||[]).length} func.</td>
                      <td style={{padding:"8px 12px",fontWeight:600}}>{fmt(bruto)}</td>
                      <td style={{padding:"8px 12px",fontWeight:700,color:"#e76f51"}}>{fmt(custo)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tabela resumo mensal */}
      <Card>
        <CardTitle>Resumo Mensal — {labelPeriodo}</CardTitle>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",minWidth:500,fontSize:12}}>
            <thead>
              <tr>
                {["Mês","Receita","Despesa","Lucro/Prejuízo","Margem"].map((h,i)=>(
                  <th key={i} style={{padding:"9px 12px",textAlign:"left",fontSize:11,color:"#6b7280",fontWeight:600,background:"#f8faf9",borderBottom:"1px solid #e5e7eb"}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dadosPorMes.map((m,i)=>(
                <tr key={i} style={{background:i%2?"#fafafa":"white"}}>
                  <td style={{padding:"9px 12px",fontWeight:600}}>{MESES[m.mes-1]}/{m.ano}</td>
                  <td style={{padding:"9px 12px",color:"#2d6a4f",fontWeight:600}}>{fmt(m.recTotal)}</td>
                  <td style={{padding:"9px 12px",color:"#e76f51"}}>{fmt(m.despTotal)}</td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:m.lucro>=0?"#1b4332":"#dc2626"}}>{m.lucro>=0?"+":""}{fmt(m.lucro)}</td>
                  <td style={{padding:"9px 12px",color:m.recTotal>0?(m.lucro/m.recTotal>=0?"#2d6a4f":"#dc2626"):"#9ca3af"}}>
                    {m.recTotal>0?`${((m.lucro/m.recTotal)*100).toFixed(1)}%`:"—"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:"#1b4332"}}>
                <td style={{padding:"10px 12px",color:"white",fontWeight:700}}>TOTAL</td>
                <td style={{padding:"10px 12px",color:"#95d5b2",fontWeight:700}}>{fmt(totRec)}</td>
                <td style={{padding:"10px 12px",color:"#fca5a5",fontWeight:700}}>{fmt(totDesp)}</td>
                <td style={{padding:"10px 12px",color:totLuc>=0?"#95d5b2":"#fca5a5",fontWeight:800}}>{totLuc>=0?"+":""}{fmt(totLuc)}</td>
                <td style={{padding:"10px 12px",color:totRec>0?(totLuc/totRec>=0?"#95d5b2":"#fca5a5"):"white",fontWeight:700}}>
                  {totRec>0?`${((totLuc/totRec)*100).toFixed(1)}%`:"—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────
export default function App() {
  const mob = useResponsive();
  const [menuAberto,    setMenuAberto]    = useState(false);
  const [dbCarregado,   setDbCarregado]   = useState(false);
  const [logado,        setLogado]        = useState(null);
  const [menu,          setMenu]          = useState("dashboard");
  const [config,        setConfig]        = useState(CONFIG_INIT);
  const [usuarios,      setUsuarios]      = useState(USUARIOS_INIT);
  const [funcionarios,  setFuncionarios]  = useState(FUNCIONARIOS_INIT);
  const [producao,      setProducao]      = useState(PRODUCAO_INIT);
  const [despesas,      setDespesas]      = useState(DESPESAS_INIT);
  const [receitas,      setReceitas]      = useState(RECEITAS_INIT);
  const [animaisLeiteiro,setAnimaisLeiteiro] = useState(ANIMAIS_LEITEIRO_INIT);
  const [animaisCorte,  setAnimaisCorte]  = useState(ANIMAIS_CORTE_INIT);
  const [vacinas,       setVacinas]       = useState(VACINAS_INIT);
  const [pastagens,     setPastagens]     = useState(PASTAGENS_INIT);
  const [financiamentos,setFinanciamentos]= useState(FINANCIAMENTOS_INIT);
  const [folhas,        setFolhas]         = useState(FOLHAS_INIT);

  // ── Carregar dados do Supabase ─────────────────────────
  useEffect(() => {
    const sb = async (table, query) => {
      try { return await query; }
      catch(e) { console.warn("Erro ao carregar "+table+":", e.message); return {data:null,error:e}; }
    };

    const carregar = async () => {
      // Queries individuais — falha de uma não afeta as outras
      const [cfg,func,prod,desp,rec,animL,animC,vac,past,fin,fol] = await Promise.all([
        sb("config_fazenda",  supabase.from("config_fazenda").select("*").eq("id","principal").maybeSingle()),
        sb("funcionarios",    supabase.from("funcionarios").select("*").order("nome")),
        sb("producao",        supabase.from("producao").select("*").order("data",{ascending:false})),
        sb("despesas",        supabase.from("despesas").select("*").order("data",{ascending:false})),
        sb("receitas",        supabase.from("receitas").select("*").order("data",{ascending:false})),
        sb("animais_leiteiro",supabase.from("animais_leiteiro").select("*")),
        sb("animais_corte",   supabase.from("animais_corte").select("*")),
        sb("vacinas",         supabase.from("vacinas").select("*").order("data")),
        sb("pastagens",       supabase.from("pastagens").select("*").order("nome")),
        sb("financiamentos",  supabase.from("financiamentos").select("*").order("criado_em")),
        sb("folhas",          supabase.from("folhas").select("*, folha_itens(*)").order("ano",{ascending:false}).order("mes",{ascending:false})),
      ]);

      if(cfg?.data)         setConfig(c=>({...c,...toCamel(cfg.data)}));
      if(func?.data?.length)  setFuncionarios(func.data.map(toCamel));
      if(prod?.data?.length)  setProducao(prod.data.map(toCamel));
      if(desp?.data?.length)  setDespesas(desp.data.map(toCamel));
      if(rec?.data?.length)   setReceitas(rec.data.map(toCamel));
      if(animL?.data?.length) setAnimaisLeiteiro(animL.data.map(toCamel));
      if(animC?.data?.length) setAnimaisCorte(animC.data.map(toCamel));
      if(vac?.data?.length)   setVacinas(vac.data.map(toCamel));
      if(past?.data?.length)  setPastagens(past.data.map(toCamel));
      if(fin?.data?.length)   setFinanciamentos(fin.data.map(toCamel));
      if(fol?.data?.length)   setFolhas(fol.data.map(f=>({...toCamel(f),itens:(f.folha_itens||[]).map(toCamel)})));

      setDbCarregado(true);
    };
    carregar();
  }, []);

  // ── Helpers de persistência ────────────────────────────
  // Colunas permitidas por tabela — evita enviar campos extras que o banco rejeita
  const COLS = {
    funcionarios:     ["id","nome","cargo","atividade","num_filhos","ativo","data_admissao"],
    producao:         ["id","data","mes","cacau_kg","leite_l","coco_un","responsavel"],
    despesas:         ["id","data","categoria","subcategoria","valor","descricao","fornecedor","nf"],
    receitas:         ["id","data","atividade","valor","qtd","unitario","comprador","obs"],
    animais_leiteiro: ["id","brinco","lote","qtd","status","prox_vacina","pasto","raca","categoria","dt_entrada","tipo_registro"],
    animais_corte:    ["id","brinco","categoria","peso_prev","peso_atual","dt_entrada","previsao_abate","pasto","status","custo_aquisicao"],
    vacinas:          ["id","data","rebanho","lote","vacina","qtd","custo","status"],
    pastagens:        ["id","nome","area","capacidade","atual","tipo","status","capim","dt_plantio","obs"],
    financiamentos:   ["id","banco","tipo","finalidade","valor","taxa","carencia","prazo","dt_contratacao","dt_vencimento","sistema","periodicidade","meses_custeio","numero_contrato","data_liberacao","data_calculo","cet_mensal","cet_anual","dt_primeira_parcela","dt_ultima_parcela","num_parcelas","iof","iof_adicional","tarifa_estudo","seguro_penhor","garantias","status","pagamentos"],
    folhas:           ["id","mes","ano","tipo","status"],
    folha_itens:      ["id","folha_id","funcionario_id","funcionario_nome","salario_bruto","inss","sal_familia","fgts","base_irrf","liquido","custo_empresa"],
    config_fazenda:   ["id","nome_fazenda","preco_cacau","preco_leite","preco_coco","preco_arroba","atualizado_em"],
  };
  const filtrar = (table, row) => {
    const cols = COLS[table];
    if(!cols) return row;
    return Object.fromEntries(Object.entries(row).filter(([k]) => cols.includes(k)));
  };
  const dbAdd = async (table, item, setState) => {
    const raw = toSnake({...item});
    delete raw.criado_em;
    const row = filtrar(table, raw);
    setState(prev => [...prev, item]);
    const {data, error} = await supabase.from(table).insert(row).select();
    if(error) console.error("dbAdd erro:", table, error.message, JSON.stringify(row));
    else console.log("dbAdd OK:", table, data);
  };
  const dbUpdate = async (table, item, setState) => {
    setState(prev => prev.map(x => x.id === item.id ? item : x));
    const raw = toSnake({...item});
    delete raw.criado_em;
    const row = filtrar(table, raw);
    const {error} = await supabase.from(table).update(row).eq("id", item.id);
    if(error) console.error("dbUpdate erro:", table, error.message, JSON.stringify(row));
  };
  const dbDelete = async (table, id, setState) => {
    setState(prev => prev.filter(x => x.id !== id));
    const {error} = await supabase.from(table).delete().eq("id", id);
    if(error) console.error("dbDelete:", table, error.message);
  };
  const dbSaveConfig = async (newConfig) => {
    setConfig(newConfig);
    const row = {
      id: "principal",
      nome_fazenda:  newConfig.nomeFazenda,
      preco_cacau:   newConfig.precoCacau,
      preco_leite:   newConfig.precoLeite,
      preco_coco:    newConfig.precoCoco,
      preco_arroba:  newConfig.precoArroba,
      atualizado_em: new Date().toISOString(),
    };
    const {error} = await supabase.from("config_fazenda").upsert(row);
    if(error) console.error("dbSaveConfig:", error.message);
  };

  if(!dbCarregado) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#f0f4f1",fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:12}}>🌱</div>
        <div style={{color:"#2d6a4f",fontWeight:700,fontSize:16}}>Carregando Fazenda Analuana…</div>
        <div style={{color:"#9ca3af",fontSize:13,marginTop:6}}>Conectando ao banco de dados</div>
      </div>
    </div>
  );

  if(!logado) return <LoginView onLogin={u=>{ setLogado(u); setMenu("dashboard"); }} usuarios={usuarios} nomeFazenda={config.nomeFazenda}/>;

  const MENU_ITEMS = [
    { id:"dashboard",      label:"Dashboard",       icon:"🏠" },
    { id:"financeiro",     label:"Financeiro",       icon:"💰" },
    { id:"folha",          label:"Folha Salarial",    icon:"📋" },
    { id:"relatorio",      label:"Relatório",          icon:"📊" },
    { id:"producao",       label:"Produção",         icon:"📊" },
    { id:"manejo",         label:"Manejo Pecuário",  icon:"🐄" },
    { id:"pastagens",      label:"Pastagens",        icon:"🌿" },
    { id:"financiamentos", label:"Financiamentos",   icon:"🏦" },
    { id:"lancamentos",    label:"Lançamentos",      icon:"✏️"  },
    { id:"usuarios",       label:"Usuários",         icon:"👤" },
    { id:"configuracoes",  label:"Configurações",    icon:"⚙️" },
  ].filter(it => temAcesso(logado.perfil, it.id));

  const nivelCor = p => p==="Administrador"?"#95d5b2":p==="Gerente"?"#a8dadc":p==="Financeiro"?"#ffd166":"#b7e4c7";
  const precos = { precoCacau:config.precoCacau||18, precoLeite:config.precoLeite||2.80, precoCoco:config.precoCoco||2.50, precoArroba:config.precoArroba||325 };

  return (
    <div style={{ display:"flex",height:"100vh",fontFamily:"'Segoe UI',system-ui,sans-serif",background:"#f0f4f1",fontSize:14 }}>
      {mob && menuAberto && <div onClick={()=>setMenuAberto(false)} style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:90 }}/>}
      <div style={{ width:mob?180:215,background:"#1b4332",color:"white",display:"flex",flexDirection:"column",flexShrink:0,position:mob?"fixed":"relative",height:"100vh",zIndex:mob?100:1,left:mob&&!menuAberto?-180:0,transition:"left 0.25s ease" }}>
        <div style={{ padding:"14px 16px 10px",borderBottom:"1px solid #2d6a4f",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
          <div>
            <div style={{ fontSize:12,fontWeight:800,color:"#95d5b2" }}>🌱 {config.nomeFazenda||"FazendaGest"}</div>
            <div style={{ fontSize:9,color:"#74c69d",marginTop:1 }}>Cacau · Leite · Coco · Gado</div>
          </div>
          {mob && <button onClick={()=>setMenuAberto(false)} style={{ background:"none",border:"none",color:"#b7e4c7",fontSize:18,cursor:"pointer",padding:4 }}>✕</button>}
        </div>
        <nav style={{ padding:"8px 0",flex:1,overflowY:"auto" }}>
          {MENU_ITEMS.map(it=>(
            <button key={it.id} onClick={()=>{ setMenu(it.id); setMenuAberto(false); }} style={{ display:"flex",alignItems:"center",gap:9,width:"100%",padding:"10px 16px",border:"none",cursor:"pointer",background:menu===it.id?"#2d6a4f":"transparent",color:menu===it.id?"#d8f3dc":"#b7e4c7",fontSize:12,fontWeight:menu===it.id?700:400,textAlign:"left",borderLeft:`3px solid ${menu===it.id?"#52b788":"transparent"}` }}>
              <span>{it.icon}</span>{it.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"10px 16px",borderTop:"1px solid #2d6a4f" }}>
          <div style={{ fontSize:11,color:nivelCor(logado.perfil),fontWeight:700 }}>👤 {logado.nome}</div>
          <div style={{ fontSize:10,color:"#74c69d",marginTop:2 }}>{logado.perfil}</div>
          <button onClick={()=>setLogado(null)} style={{ marginTop:8,width:"100%",padding:"7px",background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:6,color:"#b7e4c7",fontSize:11,cursor:"pointer",fontWeight:600 }}>🚪 Sair</button>
          <div style={{ fontSize:9,color:"#52b788",marginTop:4 }}>v3.1 · Abr/2025</div>
        </div>
      </div>

      <div style={{ flex:1,overflow:"auto",display:"flex",flexDirection:"column" }}>
        {mob && (
          <div style={{ background:"#1b4332",padding:"10px 16px",display:"flex",alignItems:"center",gap:12,flexShrink:0 }}>
            <button onClick={()=>setMenuAberto(true)} style={{ background:"none",border:"none",color:"white",fontSize:22,cursor:"pointer",padding:0,lineHeight:1 }}>☰</button>
            <span style={{ color:"#95d5b2",fontWeight:700,fontSize:13 }}>🌱 {config.nomeFazenda||"FazendaGest"}</span>
            <span style={{ color:"#74c69d",fontSize:11,marginLeft:"auto" }}>{MENU_ITEMS.find(m=>m.id===menu)?.label}</span>
          </div>
        )}
        <div style={{ flex:1,overflow:"auto",padding:mob?14:22 }}>
          {menu==="dashboard"      && <DashboardView funcionarios={funcionarios} producao={producao} despesas={despesas} receitas={receitas} financiamentos={financiamentos} precos={precos}/>}
          {menu==="financeiro"     && <FinanceiroView funcionarios={funcionarios} despesas={despesas} receitas={receitas} folhas={folhas}/>}
          {menu==="folha"          && <FolhaSalarialView funcionarios={funcionarios} folhas={folhas} setFolhas={setFolhas} dbAdd={dbAdd} setDespesas={setDespesas}/>}
          {menu==="producao"       && <ProducaoView producao={producao} receitas={receitas}/>}
          {menu==="manejo"         && <ManejoView animaisLeiteiro={animaisLeiteiro} setAnimaisLeiteiro={setAnimaisLeiteiro} animaisCorte={animaisCorte} setAnimaisCorte={setAnimaisCorte} vacinas={vacinas} setVacinas={setVacinas} pastagens={pastagens} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete}/>}
          {menu==="pastagens"      && <PastagensView pastagens={pastagens} setPastagens={setPastagens} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete}/>}
          {menu==="financiamentos" && <FinanciamentosView financiamentos={financiamentos} setFinanciamentos={setFinanciamentos} setDespesas={setDespesas} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete}/>}
          {menu==="lancamentos"    && <LancamentosView producao={producao} setProducao={setProducao} despesas={despesas} setDespesas={setDespesas} receitas={receitas} setReceitas={setReceitas} funcionarios={funcionarios} setFuncionarios={setFuncionarios} animaisCorte={animaisCorte} setAnimaisCorte={setAnimaisCorte} vacinas={vacinas} setVacinas={setVacinas} dbAdd={dbAdd} dbUpdate={dbUpdate} dbDelete={dbDelete}/>}
          {menu==="usuarios"       && <UsuariosView usuarios={usuarios} setUsuarios={setUsuarios}/>}
          {menu==="configuracoes"  && <ConfiguracoesView config={config} setConfig={dbSaveConfig}/>}
          {menu==="relatorio"      && <RelatorioView producao={producao} despesas={despesas} receitas={receitas} folhas={folhas} financiamentos={financiamentos} config={config} precos={precos}/>}
        </div>
      </div>
    </div>
  );
}
