import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ── DADOS INICIAIS ────────────────────────────────────────
const FUNCIONARIOS_INIT = [
  { id: 1, nome: "José da Silva",    cargo: "Gerente de Campo",    salario: 3800 },
  { id: 2, nome: "Maria Oliveira",   cargo: "Ordenhadeira",         salario: 1800 },
  { id: 3, nome: "Carlos Santos",    cargo: "Trabalhador Rural",    salario: 1600 },
  { id: 4, nome: "Ana Ferreira",     cargo: "Trabalhadora Rural",   salario: 1600 },
  { id: 5, nome: "Pedro Costa",      cargo: "Motorista",            salario: 2200 },
  { id: 6, nome: "Luiz Almeida",     cargo: "Tratorista",           salario: 2500 },
  { id: 7, nome: "Francisca Lima",   cargo: "Colhedora de Cacau",   salario: 1600 },
  { id: 8, nome: "Antônio Souza",    cargo: "Colhedor de Coco",     salario: 1600 },
];

const PRODUCAO = [
  { mes: "Out", cacauKg: 1200, leiteL: 8500, cocoUn: 3200 },
  { mes: "Nov", cacauKg:  980, leiteL: 8200, cocoUn: 3000 },
  { mes: "Dez", cacauKg: 1450, leiteL: 7900, cocoUn: 2800 },
  { mes: "Jan", cacauKg: 1100, leiteL: 8800, cocoUn: 3500 },
  { mes: "Fev", cacauKg:  890, leiteL: 8600, cocoUn: 3100 },
  { mes: "Mar", cacauKg: 1320, leiteL: 9100, cocoUn: 3800 },
];

const FINANCEIRO = [
  { mes: "Out", receita: 42000, despesa: 36800 },
  { mes: "Nov", receita: 38500, despesa: 35200 },
  { mes: "Dez", receita: 45000, despesa: 38100 },
  { mes: "Jan", receita: 41000, despesa: 36900 },
  { mes: "Fev", receita: 39500, despesa: 35800 },
  { mes: "Mar", receita: 47000, despesa: 37600 },
];

const DESPESAS_CATEG = [
  { name: "Folha de Pagamento",  value: 18700 },
  { name: "Encargos",            value: 7200  },
  { name: "Insumos Agrícolas",   value: 4500  },
  { name: "Ração/Suplementos",   value: 3200  },
  { name: "Combustível",         value: 2100  },
  { name: "Manutenção",          value: 1800  },
  { name: "Energia",             value: 900   },
  { name: "Tributos",            value: 1200  },
];

const ANIMAIS = [
  { id:1, lote:"Lote A – Matrizes",   qtd:28, status:"Saudável",    proxVacina:"Jul/25", pasto:"Pasto Norte" },
  { id:2, lote:"Lote B – Recria",     qtd:12, status:"Saudável",    proxVacina:"Ago/25", pasto:"Pasto Sul"   },
  { id:3, lote:"Lote C – Bezerros",   qtd: 8, status:"⚠ Atenção",  proxVacina:"Mai/25", pasto:"Piquete 1"   },
];

const VACINAS = [
  { data:"15/04/25", lote:"Lote C – Bezerros", vacina:"Brucelose + Carbúnculo", qtd:8,  status:"Pendente"  },
  { data:"01/05/25", lote:"Lote A – Matrizes",  vacina:"Febre Aftosa",           qtd:28, status:"Pendente"  },
  { data:"01/05/25", lote:"Lote B – Recria",    vacina:"Febre Aftosa",           qtd:12, status:"Pendente"  },
  { data:"15/03/25", lote:"Lote A – Matrizes",  vacina:"IBR/BVD",                qtd:28, status:"Realizado" },
];

const PASTAGENS = [
  { nome:"Pasto Norte", area:45, capacidade:30, atual:28 },
  { nome:"Pasto Sul",   area:32, capacidade:20, atual:12 },
  { nome:"Pasto Leste", area:38, capacidade:25, atual: 0 },
  { nome:"Piquete 1",   area: 8, capacidade:10, atual: 8 },
];

const COLORS = ["#2d6a4f","#52b788","#d4a017","#e76f51","#457b9d","#a8dadc","#f4a261","#264653"];

// ── HELPERS ───────────────────────────────────────────────
const fmt  = n => `R$ ${Number(n).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fmtN = n => Number(n).toLocaleString("pt-BR");

// ── COMPONENTES BASE ──────────────────────────────────────
function KpiCard({ label, value, sub, color, icon, trend }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:"18px 20px",
      boxShadow:"0 1px 4px rgba(0,0,0,0.08)", borderLeft:`4px solid ${color}` }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
        <div>
          <div style={{ fontSize:11, color:"#6b7280", marginBottom:3, textTransform:"uppercase", letterSpacing:.5 }}>{label}</div>
          <div style={{ fontSize:20, fontWeight:700, color:"#1a1a2e" }}>{value}</div>
          {sub && <div style={{ fontSize:11, marginTop:4,
            color: trend > 0 ? "#2d6a4f" : trend < 0 ? "#e63946" : "#9ca3af" }}>
            {trend > 0 ? "▲ " : trend < 0 ? "▼ " : ""}{sub}
          </div>}
        </div>
        <span style={{ fontSize:22 }}>{icon}</span>
      </div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display:"flex", gap:2, marginBottom:20,
      borderBottom:"2px solid #e5e7eb", paddingBottom:0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          padding:"8px 16px", border:"none", background:"none", cursor:"pointer",
          fontSize:13, fontWeight: active===t.id ? 700 : 400,
          color: active===t.id ? "#2d6a4f" : "#6b7280",
          borderBottom: active===t.id ? "2px solid #2d6a4f" : "2px solid transparent",
          marginBottom:-2 }}>{t.label}</button>
      ))}
    </div>
  );
}

function SectionHeader({ title, sub }) {
  return (
    <div style={{ marginBottom:22 }}>
      <h1 style={{ fontSize:20, fontWeight:800, color:"#1b4332", margin:0 }}>{title}</h1>
      {sub && <p style={{ fontSize:13, color:"#6b7280", margin:"3px 0 0" }}>{sub}</p>}
    </div>
  );
}

function Card({ children, style={} }) {
  return (
    <div style={{ background:"white", borderRadius:12, padding:20,
      boxShadow:"0 1px 4px rgba(0,0,0,0.08)", ...style }}>{children}</div>
  );
}

function CardTitle({ children }) {
  return <div style={{ fontSize:14, fontWeight:700, color:"#1b4332", marginBottom:14 }}>{children}</div>;
}

// ── DASHBOARD ─────────────────────────────────────────────
function DashboardView({ funcionarios }) {
  const cur = FINANCEIRO[FINANCEIRO.length-1];
  const prv = FINANCEIRO[FINANCEIRO.length-2];
  const lucro = cur.receita - cur.despesa;
  const lucroP = prv.receita - prv.despesa;
  const pCur = PRODUCAO[PRODUCAO.length-1];
  const pPrv = PRODUCAO[PRODUCAO.length-2];

  return (
    <div>
      <SectionHeader title="Dashboard Geral" sub="Resumo consolidado • Março 2025" />

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:20 }}>
        <KpiCard label="Receita Mar/25"   value={fmt(cur.receita)} sub={`vs ${fmt(prv.receita)} mês ant.`} color="#2d6a4f" icon="💰" trend={cur.receita-prv.receita} />
        <KpiCard label="Despesas Mar/25"  value={fmt(cur.despesa)} sub={`vs ${fmt(prv.despesa)} mês ant.`} color="#e76f51" icon="📋" trend={-(cur.despesa-prv.despesa)} />
        <KpiCard label="Lucro Operac."    value={fmt(lucro)}       sub={`vs ${fmt(lucroP)} mês ant.`}      color="#d4a017" icon="📈" trend={lucro-lucroP} />
        <KpiCard label="Funcionários"     value={funcionarios.length+" ativ."} color="#457b9d" icon="👥" trend={0} />
      </div>

      {/* Receita vs Despesa + Pizza */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:14 }}>
        <Card>
          <CardTitle>Receita × Despesa — 6 meses</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={FINANCEIRO}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#2d6a4f" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#e76f51" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#e76f51" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="mes" tick={{fontSize:12}}/>
              <YAxis tick={{fontSize:11}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>fmt(v)}/>
              <Legend/>
              <Area type="monotone" dataKey="receita" name="Receita" stroke="#2d6a4f" fill="url(#gR)" strokeWidth={2}/>
              <Area type="monotone" dataKey="despesa" name="Despesa" stroke="#e76f51" fill="url(#gD)" strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <CardTitle>Distribuição de Despesas</CardTitle>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={DESPESAS_CATEG} cx="50%" cy="50%" innerRadius={38} outerRadius={68} dataKey="value">
                {DESPESAS_CATEG.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={v=>fmt(v)}/>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:8 }}>
            {DESPESAS_CATEG.map((d,i)=>(
              <div key={i} style={{ display:"flex", alignItems:"center", gap:3, fontSize:10, color:"#6b7280" }}>
                <div style={{ width:7, height:7, borderRadius:2, background:COLORS[i]}}/>
                {d.name}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Produção 6 meses */}
      <Card>
        <CardTitle>Produção — 6 meses</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14 }}>
          <div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>🍫 Cacau (kg)</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={PRODUCAO} margin={{top:0,right:0,left:-20,bottom:0}}>
                <XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/><Bar dataKey="cacauKg" name="kg" fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>🥛 Leite (L)</div>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={PRODUCAO} margin={{top:0,right:0,left:-20,bottom:0}}>
                <XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Line type="monotone" dataKey="leiteL" name="L" stroke="#2d6a4f" strokeWidth={2} dot={{fill:"#2d6a4f",r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:6 }}>🥥 Coco (un)</div>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={PRODUCAO} margin={{top:0,right:0,left:-20,bottom:0}}>
                <XAxis dataKey="mes" tick={{fontSize:10}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/><Bar dataKey="cocoUn" name="un" fill="#52b788" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>

      {/* Alertas */}
      <Card style={{ marginTop:14, background:"#fffbeb", border:"1px solid #fcd34d" }}>
        <CardTitle>⚡ Alertas e Pendências</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
          {[
            { tipo:"💉 Vacina urgente",   desc:"Brucelose Lote C – Bezerros", data:"15/04/25", cor:"#e76f51" },
            { tipo:"🌿 Rotação de pasto",  desc:"Pasto Norte acima de 90% cap.", data:"Imediato", cor:"#d97706" },
            { tipo:"📄 Tributação",         desc:"Funrural vence em 30/04/25",    data:"30/04/25", cor:"#457b9d" },
          ].map((a,i)=>(
            <div key={i} style={{ padding:12, borderRadius:8, borderLeft:`3px solid ${a.cor}`, background:"white" }}>
              <div style={{ fontSize:12, fontWeight:700, color:a.cor }}>{a.tipo}</div>
              <div style={{ fontSize:12, color:"#374151", marginTop:3 }}>{a.desc}</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>Prazo: {a.data}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── FINANCEIRO ────────────────────────────────────────────
function FinanceiroView({ funcionarios, setFuncionarios }) {
  const [tab, setTab] = useState("folha");
  const [showAdd, setShowAdd] = useState(false);
  const [nf, setNf] = useState({ nome:"", cargo:"", salario:"" });

  const totalSal = funcionarios.reduce((s,f)=>s+f.salario,0);
  const totalEnc = totalSal * 0.4744;

  const addFunc = () => {
    if (!nf.nome||!nf.cargo||!nf.salario) return;
    setFuncionarios([...funcionarios,{id:Date.now(),...nf,salario:Number(nf.salario)}]);
    setNf({nome:"",cargo:"",salario:""}); setShowAdd(false);
  };

  const thStyle = { padding:"10px 14px", textAlign:"left", fontSize:11, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #e5e7eb", background:"#f8faf9" };
  const tdStyle = { padding:"11px 14px", fontSize:13, borderBottom:"1px solid #f3f4f6" };

  return (
    <div>
      <SectionHeader title="Módulo Financeiro" sub="Folha de pagamento, encargos, tributos e despesas operacionais"/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <KpiCard label="Total Salários Brutos" value={fmt(totalSal)} color="#2d6a4f" icon="👥" trend={0}/>
        <KpiCard label="Encargos Trabalhistas" value={fmt(totalEnc)} sub="~47% sobre salários" color="#e76f51" icon="📊" trend={0}/>
        <KpiCard label="Custo Total Folha/mês" value={fmt(totalSal+totalEnc)} color="#d4a017" icon="💼" trend={0}/>
      </div>
      <TabBar tabs={[{id:"folha",label:"Folha"},{id:"encargos",label:"Encargos"},{id:"tributos",label:"Tributos"},{id:"despesas",label:"Despesas"}]} active={tab} onChange={setTab}/>

      {tab==="folha" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <span style={{ fontSize:13, color:"#6b7280" }}>{funcionarios.length} funcionários</span>
            <button onClick={()=>setShowAdd(!showAdd)} style={{ display:"flex", alignItems:"center", gap:6, padding:"8px 16px", background:"#2d6a4f", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              ＋ Funcionário
            </button>
          </div>
          {showAdd && (
            <div style={{ background:"#f0faf4", border:"1px solid #b7e4c7", borderRadius:10, padding:14, marginBottom:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr auto", gap:10, alignItems:"end" }}>
              {[["Nome","nome","text"],["Cargo","cargo","text"],["Salário R$","salario","number"]].map(([lbl,key,type])=>(
                <div key={key}>
                  <label style={{ fontSize:11, color:"#374151", display:"block", marginBottom:3 }}>{lbl}</label>
                  <input type={type} value={nf[key]} onChange={e=>setNf({...nf,[key]:e.target.value})}
                    style={{ width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:13, boxSizing:"border-box" }}/>
                </div>
              ))}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={addFunc} style={{ padding:"7px 14px", background:"#2d6a4f", color:"white", border:"none", borderRadius:6, cursor:"pointer" }}>✓</button>
                <button onClick={()=>setShowAdd(false)} style={{ padding:"7px 14px", background:"#e5e7eb", border:"none", borderRadius:6, cursor:"pointer" }}>✕</button>
              </div>
            </div>
          )}
          <Card style={{ padding:0, overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                {["Nome","Cargo","Salário Bruto","INSS (20%)","FGTS (8%)","Férias+13º (19%)","Custo Total",""].map((h,i)=>(
                  <th key={i} style={thStyle}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {funcionarios.map((f,i)=>{
                  const e={ inss:f.salario*.20, fgts:f.salario*.08, fd:f.salario*.1944, total:f.salario*1.4744 };
                  return (
                    <tr key={f.id} style={{ background:i%2===0?"white":"#fafafa" }}>
                      <td style={{...tdStyle,fontWeight:600,color:"#1a1a2e"}}>{f.nome}</td>
                      <td style={{...tdStyle,color:"#6b7280"}}>{f.cargo}</td>
                      <td style={tdStyle}>{fmt(f.salario)}</td>
                      <td style={{...tdStyle,color:"#e76f51"}}>{fmt(e.inss)}</td>
                      <td style={{...tdStyle,color:"#457b9d"}}>{fmt(e.fgts)}</td>
                      <td style={{...tdStyle,color:"#d4a017"}}>{fmt(e.fd)}</td>
                      <td style={{...tdStyle,fontWeight:700,color:"#1b4332"}}>{fmt(e.total)}</td>
                      <td style={tdStyle}><button onClick={()=>setFuncionarios(funcionarios.filter(x=>x.id!==f.id))} style={{ background:"none", border:"none", color:"#e76f51", cursor:"pointer" }}>✕</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#1b4332" }}>
                  <td colSpan={2} style={{ padding:"11px 14px", fontWeight:700, color:"white", fontSize:13 }}>TOTAIS</td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#95d5b2", fontSize:13 }}>{fmt(totalSal)}</td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#95d5b2", fontSize:13 }}>{fmt(totalSal*.20)}</td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#95d5b2", fontSize:13 }}>{fmt(totalSal*.08)}</td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"#95d5b2", fontSize:13 }}>{fmt(totalSal*.1944)}</td>
                  <td style={{ padding:"11px 14px", fontWeight:700, color:"white",   fontSize:14 }}>{fmt(totalSal+totalEnc)}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </Card>
        </>
      )}

      {tab==="encargos" && (
        <Card>
          <CardTitle>Composição dos Encargos Trabalhistas</CardTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
            {[
              {lbl:"INSS Patronal",      perc:"20,0%", val:totalSal*.200,  desc:"Previdência Social"},
              {lbl:"FGTS",              perc:" 8,0%", val:totalSal*.080,  desc:"Fundo de Garantia"},
              {lbl:"Férias + 1/3",      perc:"11,1%", val:totalSal*.1111, desc:"Provisão mensal"},
              {lbl:"13º Salário",       perc:" 8,3%", val:totalSal*.0833, desc:"Provisão mensal"},
              {lbl:"RAT/SAT",           perc:" 1,0%", val:totalSal*.010,  desc:"Acidente de trabalho"},
              {lbl:"Sistema S (SENAR)", perc:" 2,0%", val:totalSal*.020,  desc:"Contribuição rural"},
            ].map((e,i)=>(
              <div key={i} style={{ padding:16, background:"#f8faf9", borderRadius:8, borderLeft:`3px solid ${COLORS[i]}` }}>
                <div style={{ fontSize:11, color:"#6b7280" }}>{e.lbl}</div>
                <div style={{ fontSize:22, fontWeight:700, color:"#1a1a2e", margin:"3px 0" }}>{e.perc}</div>
                <div style={{ fontSize:14, fontWeight:700, color:COLORS[i] }}>{fmt(e.val)}/mês</div>
                <div style={{ fontSize:11, color:"#9ca3af", marginTop:3 }}>{e.desc}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop:16, padding:14, background:"#1b4332", borderRadius:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ color:"#95d5b2", fontWeight:600 }}>Total Encargos/mês</span>
            <span style={{ color:"white", fontSize:20, fontWeight:800 }}>{fmt(totalEnc)}</span>
          </div>
        </Card>
      )}

      {tab==="tributos" && (
        <Card>
          <CardTitle>Tributos da Atividade Rural</CardTitle>
          {[
            { tributo:"ITR – Imposto Territorial Rural",     base:"Valor da terra nua",      venc:"30/11/2025", valor:1200,  freq:"Anual"  },
            { tributo:"Contribuição Sindical Rural",          base:"Patrimônio declarado",     venc:"31/01/2025", valor:850,   freq:"Anual"  },
            { tributo:"Funrural (PF) – RGPS",                base:"1,5% receita bruta",       venc:"Mensal",     valor:705,   freq:"Mensal" },
            { tributo:"INSS Produtor Rural (PF)",             base:"2,1% receita bruta",       venc:"Mensal",     valor:987,   freq:"Mensal" },
            { tributo:"SENAR",                                base:"0,2% sobre comerc. rural", venc:"Mensal",     valor:94,    freq:"Mensal" },
          ].map((t,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize:14, fontWeight:600, color:"#1a1a2e" }}>{t.tributo}</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>Base: {t.base} · Venc.: {t.venc}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:15, fontWeight:700, color:"#e76f51" }}>{fmt(t.valor)}</div>
                <div style={{ fontSize:11, color:"#9ca3af" }}>{t.freq}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {tab==="despesas" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>Categorias de Despesa — Mar/25</CardTitle>
            {DESPESAS_CATEG.map((d,i)=>(
              <div key={i} style={{ marginBottom:10 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12, color:"#374151" }}>{d.name}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{fmt(d.value)}</span>
                </div>
                <div style={{ height:6, background:"#f3f4f6", borderRadius:3 }}>
                  <div style={{ height:"100%", width:`${(d.value/DESPESAS_CATEG.reduce((s,x)=>s+x.value,0))*100}%`, background:COLORS[i], borderRadius:3 }}/>
                </div>
              </div>
            ))}
            <div style={{ borderTop:"2px solid #1b4332", paddingTop:10, display:"flex", justifyContent:"space-between", marginTop:6 }}>
              <span style={{ fontWeight:700, color:"#1b4332" }}>Total</span>
              <span style={{ fontWeight:800, fontSize:16, color:"#1b4332" }}>{fmt(DESPESAS_CATEG.reduce((s,d)=>s+d.value,0))}</span>
            </div>
          </Card>
          <Card>
            <CardTitle>Gráfico de Despesas</CardTitle>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={DESPESAS_CATEG} cx="50%" cy="48%" outerRadius={100} dataKey="value" nameKey="name"
                  label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                  {DESPESAS_CATEG.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)}/>
                <Legend wrapperStyle={{fontSize:11}}/>
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── PRODUÇÃO ──────────────────────────────────────────────
function ProducaoView() {
  const [tab, setTab] = useState("geral");
  const cur = PRODUCAO[PRODUCAO.length-1];
  const prv = PRODUCAO[PRODUCAO.length-2];
  const PC=18, PL=2.80, PCO=2.50;
  const recMes = cur.cacauKg*PC + cur.leiteL*PL + cur.cocoUn*PCO;

  return (
    <div>
      <SectionHeader title="Controle de Produção" sub="Cacau · Leite · Coco — dados mensais e calendário agrícola"/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <KpiCard label="🍫 Cacau Mar/25" value={`${fmtN(cur.cacauKg)} kg`} sub={`${cur.cacauKg-prv.cacauKg>0?"+":""}${cur.cacauKg-prv.cacauKg} kg vs mês ant.`} color="#d4a017" icon="🍫" trend={cur.cacauKg-prv.cacauKg}/>
        <KpiCard label="🥛 Leite Mar/25" value={`${fmtN(cur.leiteL)} L`}    sub={`${cur.leiteL-prv.leiteL>0?"+":""}${cur.leiteL-prv.leiteL} L vs mês ant.`}   color="#2d6a4f" icon="🥛" trend={cur.leiteL-prv.leiteL}/>
        <KpiCard label="🥥 Coco Mar/25"  value={`${fmtN(cur.cocoUn)} un`}   sub={`${cur.cocoUn-prv.cocoUn>0?"+":""}${cur.cocoUn-prv.cocoUn} un vs mês ant.`} color="#52b788" icon="🥥" trend={cur.cocoUn-prv.cocoUn}/>
      </div>
      <TabBar tabs={[{id:"geral",label:"Visão Geral"},{id:"cacau",label:"🍫 Cacau"},{id:"leite",label:"🥛 Leite"},{id:"coco",label:"🥥 Coco"}]} active={tab} onChange={setTab}/>

      {tab==="geral" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card><CardTitle>Cacau (kg)</CardTitle>
            <ResponsiveContainer width="100%" height={180}><BarChart data={PRODUCAO}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="cacauKg" name="kg" fill="#d4a017" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
          </Card>
          <Card><CardTitle>Leite (L)</CardTitle>
            <ResponsiveContainer width="100%" height={180}><LineChart data={PRODUCAO}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Line type="monotone" dataKey="leiteL" name="L" stroke="#2d6a4f" strokeWidth={2} dot={{fill:"#2d6a4f",r:4}}/></LineChart></ResponsiveContainer>
          </Card>
          <Card><CardTitle>Coco (un)</CardTitle>
            <ResponsiveContainer width="100%" height={180}><BarChart data={PRODUCAO}><CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/><XAxis dataKey="mes" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Bar dataKey="cocoUn" name="un" fill="#52b788" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Receita Estimada — Mar/25</CardTitle>
            {[{prod:"Cacau",qtd:`${fmtN(cur.cacauKg)} kg`,preco:`R$ ${PC}/kg`,total:cur.cacauKg*PC,c:"#d4a017"},
              {prod:"Leite", qtd:`${fmtN(cur.leiteL)} L`, preco:`R$ ${PL}/L`, total:cur.leiteL*PL,  c:"#2d6a4f"},
              {prod:"Coco",  qtd:`${fmtN(cur.cocoUn)} un`,preco:`R$ ${PCO}/un`,total:cur.cocoUn*PCO, c:"#52b788"}
            ].map((p,i)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:"1px solid #f3f4f6" }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:p.c }}>{p.prod}</div>
                  <div style={{ fontSize:12, color:"#6b7280" }}>{p.qtd} × {p.preco}</div>
                </div>
                <div style={{ fontSize:15, fontWeight:700 }}>{fmt(p.total)}</div>
              </div>
            ))}
            <div style={{ marginTop:12, padding:12, background:"#1b4332", borderRadius:8, display:"flex", justifyContent:"space-between" }}>
              <span style={{ color:"#95d5b2", fontWeight:600 }}>Total Estimado</span>
              <span style={{ color:"white", fontWeight:800, fontSize:16 }}>{fmt(recMes)}</span>
            </div>
            <div style={{ marginTop:8, fontSize:11, color:"#9ca3af" }}>* Atualize os preços conforme contratos vigentes.</div>
          </Card>
        </div>
      )}

      {tab==="cacau" && (
        <Card>
          <CardTitle>🍫 Calendário Agrícola do Cacau</CardTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:12 }}>
            {[
              {ativ:"Poda de Formação / Manutenção",    periodo:"Jul – Set",   status:"Planejado",     prox:"Jul/25"},
              {ativ:"Adubação NPK",                      periodo:"Out – Nov",   status:"Realizado",     prox:"Out/25"},
              {ativ:"Colheita Principal",                periodo:"Out – Jan",   status:"Em andamento",  prox:"—"},
              {ativ:"Colheita Temporã",                  periodo:"Abr – Jun",   status:"Planejado",     prox:"Abr/25"},
              {ativ:"Controle Vassoura-de-Bruxa",        periodo:"Contínuo",    status:"Em andamento",  prox:"Mensal"},
              {ativ:"Fermentação e Secagem",             periodo:"Pós-colheita",status:"Em andamento",  prox:"—"},
            ].map((a,i)=>{
              const cor=a.status==="Realizado"?"#2d6a4f":a.status==="Em andamento"?"#d4a017":"#457b9d";
              const bgC=a.status==="Realizado"?"#d8f3dc":a.status==="Em andamento"?"#fff3cd":"#dbeafe";
              const txC=a.status==="Realizado"?"#2d6a4f":a.status==="Em andamento"?"#b45309":"#1e40af";
              return (
                <div key={i} style={{ padding:14, borderRadius:8, background:"#f8faf9", borderLeft:`3px solid ${cor}` }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{a.ativ}</div>
                  <div style={{ fontSize:12, color:"#6b7280", marginTop:3 }}>Período: {a.periodo}</div>
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:8, alignItems:"center" }}>
                    <span style={{ fontSize:11, padding:"2px 8px", borderRadius:10, background:bgC, color:txC, fontWeight:600 }}>{a.status}</span>
                    <span style={{ fontSize:11, color:"#9ca3af" }}>Próx: {a.prox}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab==="leite" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>🥛 Indicadores de Produção Leiteira</CardTitle>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
              {[
                {lbl:"Vacas em Lactação",  val:"22 cab.", icon:"🐄"},
                {lbl:"Média L/vaca/dia",   val:"13,8 L",  icon:"📊"},
                {lbl:"CCS Médio",          val:"<200 mil",icon:"🧪"},
                {lbl:"Gordura Média",      val:"3,8%",    icon:"📈"},
                {lbl:"Proteína",           val:"3,2%",    icon:"🔬"},
                {lbl:"Classificação",      val:"Tipo A",  icon:"✅"},
              ].map((ind,i)=>(
                <div key={i} style={{ padding:12, background:"#f8faf9", borderRadius:8, textAlign:"center" }}>
                  <div style={{ fontSize:22 }}>{ind.icon}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:"#1a1a2e", marginTop:3 }}>{ind.val}</div>
                  <div style={{ fontSize:11, color:"#6b7280" }}>{ind.lbl}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card>
            <CardTitle>Evolução da Produção de Leite (L)</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={PRODUCAO}>
                <defs><linearGradient id="gL" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2d6a4f" stopOpacity={0.3}/><stop offset="95%" stopColor="#2d6a4f" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:12}}/><YAxis tick={{fontSize:11}}/>
                <Tooltip/>
                <Area type="monotone" dataKey="leiteL" name="Litros" stroke="#2d6a4f" fill="url(#gL)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {tab==="coco" && (
        <Card>
          <CardTitle>🥥 Gestão do Coqueiral</CardTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:20 }}>
            {[{lbl:"Área Plantada",icon:"🌴",val:"12 ha"},{lbl:"Plantas Produtivas",icon:"🌿",val:"480 un"},{lbl:"Cachos/Planta",icon:"📦",val:"8 cachos"},{lbl:"Cocos/Cacho",icon:"🥥",val:"10 un"}].map((i,idx)=>(
              <div key={idx} style={{ padding:14, background:"#f8faf9", borderRadius:8, textAlign:"center" }}>
                <div style={{ fontSize:24 }}>{i.icon}</div>
                <div style={{ fontSize:18, fontWeight:700, color:"#1a1a2e", marginTop:4 }}>{i.val}</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>{i.lbl}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize:13, fontWeight:700, color:"#1b4332", marginBottom:10 }}>Calendário de Adubação</div>
          {[
            {meses:"Jan / Jul",adubo:"NPK 06-24-12",     dose:"500 g/planta",obs:"Plantio e manutenção"},
            {meses:"Abr / Out",adubo:"Ureia + KCl",      dose:"300+200 g/pl.", obs:"Cobertura nitrogenada"},
            {meses:"Jun / Dez",adubo:"Boro + Zinco foliar",dose:"50 g/planta", obs:"Micronutrientes"},
          ].map((a,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:"1px solid #f3f4f6" }}>
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:"#1a1a2e" }}>{a.adubo}</div>
                <div style={{ fontSize:12, color:"#6b7280" }}>{a.obs}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#52b788" }}>{a.dose}</div>
                <div style={{ fontSize:11, color:"#9ca3af" }}>{a.meses}</div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// ── MANEJO ────────────────────────────────────────────────
function ManejoView() {
  const [tab, setTab] = useState("animais");
  const thS = { padding:"10px 14px", textAlign:"left", fontSize:11, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #e5e7eb", background:"#f8faf9" };
  const tdS = { padding:"12px 14px", fontSize:13, borderBottom:"1px solid #f3f4f6" };

  return (
    <div>
      <SectionHeader title="Manejo Pecuário" sub="Controle de animais, agenda sanitária e gestão de pastagens"/>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14, marginBottom:20 }}>
        <KpiCard label="Total de Bovinos"         value="48 cabeças"   color="#2d6a4f" icon="🐄" trend={0}/>
        <KpiCard label="Vacinas Pendentes"         value="3 eventos"    sub="Próxima: 15/04/25" color="#e76f51" icon="💉" trend={-1}/>
        <KpiCard label="Pastagens em Descanso"     value="1 de 4"       color="#457b9d" icon="🌿" trend={0}/>
      </div>
      <TabBar tabs={[{id:"animais",label:"Animais"},{id:"vacinas",label:"Agenda Sanitária"},{id:"pastagens",label:"Pastagens"}]} active={tab} onChange={setTab}/>

      {tab==="animais" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Lote","Qtd","Status","Pasto Atual","Próx. Vacina"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{ANIMAIS.map((a,i)=>(
              <tr key={a.id} style={{ background:i%2?"#fafafa":"white" }}>
                <td style={{...tdS,fontWeight:600,color:"#1a1a2e"}}>{a.lote}</td>
                <td style={tdS}>{a.qtd} cab.</td>
                <td style={tdS}><span style={{ padding:"3px 10px", borderRadius:10, fontSize:12, fontWeight:600, background:a.status.includes("Atenção")?"#fff3cd":"#d8f3dc", color:a.status.includes("Atenção")?"#b45309":"#2d6a4f" }}>{a.status}</span></td>
                <td style={{...tdS,color:"#6b7280"}}>{a.pasto}</td>
                <td style={{...tdS,color:a.proxVacina==="Mai/25"?"#e76f51":"#374151",fontWeight:a.proxVacina==="Mai/25"?700:400}}>{a.proxVacina}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {tab==="vacinas" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Data","Lote","Vacina","Qtd","Status"].map((h,i)=><th key={i} style={thS}>{h}</th>)}</tr></thead>
            <tbody>{VACINAS.map((v,i)=>(
              <tr key={i} style={{ background:i%2?"#fafafa":"white" }}>
                <td style={{...tdS,fontWeight:600,color:v.status==="Pendente"?"#e76f51":"#6b7280"}}>{v.data}</td>
                <td style={tdS}>{v.lote}</td>
                <td style={tdS}>{v.vacina}</td>
                <td style={tdS}>{v.qtd} cab.</td>
                <td style={tdS}><span style={{ padding:"3px 10px", borderRadius:10, fontSize:12, fontWeight:600, background:v.status==="Pendente"?"#fee2e2":"#d8f3dc", color:v.status==="Pendente"?"#dc2626":"#2d6a4f" }}>{v.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </Card>
      )}

      {tab==="pastagens" && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:14 }}>
          {PASTAGENS.map((p,i)=>{
            const ocup=p.atual/p.capacidade;
            const status=p.atual===0?"Descanso":ocup>=.9?"Superlotado":ocup>=.5?"Ocupado":"Subutilizado";
            const cor=p.atual===0?"#457b9d":ocup>=.9?"#e76f51":ocup>=.5?"#2d6a4f":"#d4a017";
            return (
              <Card key={i}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:700, color:"#1a1a2e" }}>🌿 {p.nome}</div>
                    <div style={{ fontSize:12, color:"#6b7280", marginTop:2 }}>{p.area} hectares</div>
                  </div>
                  <span style={{ padding:"4px 10px", borderRadius:10, fontSize:12, fontWeight:600, background:cor+"22", color:cor }}>{status}</span>
                </div>
                <div style={{ marginTop:14 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280", marginBottom:5 }}>
                    <span>Ocupação: {p.atual}/{p.capacidade} cabeças</span>
                    <span>{p.atual===0?"Vazio":`${Math.round(ocup*100)}%`}</span>
                  </div>
                  <div style={{ height:10, background:"#f3f4f6", borderRadius:5, overflow:"hidden" }}>
                    <div style={{ height:"100%", width:`${Math.min(ocup*100,100)}%`, background:cor, borderRadius:5 }}/>
                  </div>
                </div>
                <div style={{ marginTop:10, fontSize:11, color:"#9ca3af" }}>Cap. suporte: {p.capacidade} UA · {(p.capacidade/p.area).toFixed(1)} UA/ha</div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── INTEGRAÇÃO SHEETS ─────────────────────────────────────
function ImportarView() {
  const sheets = [
    { title:"📋 FUNCIONÁRIOS",       cols:["ID","Nome","CPF","Cargo","Salário Bruto","Admissão","Tipo Contrato","Status"],      desc:"Uma linha por funcionário. Enviar ao contador para validar." },
    { title:"💰 FINANCEIRO_MENSAL",  cols:["Mês/Ano","Rec. Cacau","Rec. Leite","Rec. Coco","Despesas","Saldo","Obs."],          desc:"Uma linha por mês. O contador alimenta diretamente." },
    { title:"🍫 PRODUCAO",           cols:["Data","Produto","Quantidade","Unidade","Talhão/Lote","Responsável"],                 desc:"Registro diário ou semanal da colheita e produção." },
    { title:"🐄 ANIMAIS",            cols:["Brinco","Lote","Sexo","Peso","Data Pesagem","Status","Obs."],                       desc:"Um animal por linha. Atualize pesos e eventos." },
    { title:"💉 SANITÁRIO",          cols:["Data","Lote","Evento","Produto","Dose","Veterinário","Custo R$"],                   desc:"Vacinas, vermifugações, tratamentos. Base de rastreabilidade." },
    { title:"🧾 NOTAS_FISCAIS",      cols:["Nº NF","Data","Fornecedor","CNPJ","Descrição","Valor","Categoria"],                desc:"Cole exportações do contador. Base fiscal automatizada." },
  ];

  return (
    <div>
      <SectionHeader title="Integração Google Sheets" sub="Estrutura de planilhas para integrar contador, notas fiscais e extratos bancários"/>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
        {sheets.map((s,i)=>(
          <Card key={i}>
            <div style={{ fontSize:14, fontWeight:700, color:"#1b4332", marginBottom:6 }}>{s.title}</div>
            <div style={{ fontSize:12, color:"#6b7280", marginBottom:10 }}>{s.desc}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
              {s.cols.map((col,j)=>(
                <span key={j} style={{ padding:"3px 8px", background:"#f0faf4", border:"1px solid #b7e4c7", borderRadius:4, fontSize:11, color:"#2d6a4f", fontFamily:"monospace" }}>{col}</span>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Próximos passos */}
      <div style={{ marginTop:14, background:"#1b4332", borderRadius:12, padding:22, color:"white" }}>
        <div style={{ fontSize:15, fontWeight:800, marginBottom:14 }}>🚀 Roadmap de Implementação</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {[
            {n:"01",t:"Planilha base",d:"Crie o Google Sheets com as abas acima e compartilhe com o contador"},
            {n:"02",t:"Alimentar dados",d:"Contador exporta balancete, folha e NFs mensalmente em .xlsx"},
            {n:"03",t:"Processar com Claude",d:"Envie os arquivos ao Claude (Cowork ou aqui) para extração automática"},
            {n:"04",t:"Evoluir para web",d:"Sistema web completo com banco de dados e acesso multi-usuário"},
          ].map((s,i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,0.1)", borderRadius:8, padding:14 }}>
              <div style={{ fontSize:22, fontWeight:800, color:"#95d5b2" }}>{s.n}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"white", marginTop:4 }}>{s.t}</div>
              <div style={{ fontSize:11, color:"#b7e4c7", marginTop:5 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dica Claude */}
      <Card style={{ marginTop:14, background:"#eff6ff", border:"1px solid #bfdbfe" }}>
        <div style={{ fontSize:14, fontWeight:700, color:"#1e40af", marginBottom:8 }}>💡 Como usar o Claude para processar arquivos</div>
        <div style={{ fontSize:13, color:"#374151" }}>
          <strong>1. Notas Fiscais:</strong> Envie o PDF da NF ao Claude e peça: <em>"Extraia fornecedor, valor e categoria desta NF e formate em CSV"</em><br/>
          <strong>2. Extrato bancário:</strong> Cole o extrato e peça: <em>"Categorize cada lançamento como Receita, Despesa de Insumo, Folha, Tributo ou Outros"</em><br/>
          <strong>3. Balancete:</strong> Envie o .xlsx do contador e peça: <em>"Gere os KPIs mensais da fazenda a partir deste balancete"</em>
        </div>
      </Card>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────
export default function App() {
  const [menu, setMenu] = useState("dashboard");
  const [funcionarios, setFuncionarios] = useState(FUNCIONARIOS_INIT);

  const items = [
    { id:"dashboard", label:"Dashboard",         icon:"🏠" },
    { id:"financeiro",label:"Financeiro",         icon:"💰" },
    { id:"producao",  label:"Produção",           icon:"📊" },
    { id:"manejo",    label:"Manejo Pecuário",    icon:"🐄" },
    { id:"importar",  label:"Integração Sheets",  icon:"📁" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f0f4f1", fontSize:14 }}>
      {/* SIDEBAR */}
      <div style={{ width:210, background:"#1b4332", color:"white", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"18px 18px 14px", borderBottom:"1px solid #2d6a4f" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#95d5b2" }}>🌱 FazendaGest</div>
          <div style={{ fontSize:10, color:"#74c69d", marginTop:2 }}>Cacau · Leite · Coco</div>
        </div>
        <nav style={{ padding:"10px 0", flex:1 }}>
          {items.map(it=>(
            <button key={it.id} onClick={()=>setMenu(it.id)} style={{
              display:"flex", alignItems:"center", gap:9,
              width:"100%", padding:"11px 18px", border:"none", cursor:"pointer",
              background: menu===it.id?"#2d6a4f":"transparent",
              color: menu===it.id?"#d8f3dc":"#b7e4c7",
              fontSize:13, fontWeight: menu===it.id?700:400, textAlign:"left",
              borderLeft:`3px solid ${menu===it.id?"#52b788":"transparent"}`
            }}>
              <span>{it.icon}</span>{it.label}
            </button>
          ))}
        </nav>
        <div style={{ padding:"10px 18px", borderTop:"1px solid #2d6a4f", fontSize:10, color:"#52b788" }}>
          v1.0 · Mar/2025<br/>
          <span style={{ color:"#74c69d" }}>Dados locais no navegador</span>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflow:"auto", padding:22 }}>
        {menu==="dashboard" && <DashboardView funcionarios={funcionarios}/>}
        {menu==="financeiro" && <FinanceiroView funcionarios={funcionarios} setFuncionarios={setFuncionarios}/>}
        {menu==="producao"   && <ProducaoView/>}
        {menu==="manejo"     && <ManejoView/>}
        {menu==="importar"   && <ImportarView/>}
      </div>
    </div>
  );
}
