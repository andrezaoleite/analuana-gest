import { useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from "recharts";

// ── DADOS GADO DE CORTE ───────────────────────────────────
const REBANHO_CORTE_INIT = [
  { id:1,  brinco:"BC-001", categoria:"Boi Gordo",    pesoPrev:480, pesoAtual:512, dtEntrada:"Jan/25", previsaoAbate:"Mai/25", pasto:"Confinamento A", status:"Pronto p/ Abate" },
  { id:2,  brinco:"BC-002", categoria:"Boi Gordo",    pesoPrev:460, pesoAtual:498, dtEntrada:"Jan/25", previsaoAbate:"Mai/25", pasto:"Confinamento A", status:"Pronto p/ Abate" },
  { id:3,  brinco:"BC-003", categoria:"Garrote",      pesoPrev:320, pesoAtual:345, dtEntrada:"Fev/25", previsaoAbate:"Ago/25", pasto:"Pasto Leste",   status:"Em engorda"      },
  { id:4,  brinco:"BC-004", categoria:"Garrote",      pesoPrev:310, pesoAtual:338, dtEntrada:"Fev/25", previsaoAbate:"Ago/25", pasto:"Pasto Leste",   status:"Em engorda"      },
  { id:5,  brinco:"BC-005", categoria:"Novilha",      pesoPrev:290, pesoAtual:315, dtEntrada:"Mar/25", previsaoAbate:"Set/25", pasto:"Pasto Sul",     status:"Em engorda"      },
  { id:6,  brinco:"BC-006", categoria:"Novilha",      pesoPrev:280, pesoAtual:302, dtEntrada:"Mar/25", previsaoAbate:"Set/25", pasto:"Pasto Sul",     status:"Em engorda"      },
  { id:7,  brinco:"BC-007", categoria:"Boi Gordo",    pesoPrev:490, pesoAtual:505, dtEntrada:"Dez/24", previsaoAbate:"Abr/25", pasto:"Confinamento B",status:"Pronto p/ Abate" },
  { id:8,  brinco:"BC-008", categoria:"Bezerro Rec.", pesoPrev:180, pesoAtual:195, dtEntrada:"Mar/25", previsaoAbate:"Jan/26", pasto:"Piquete 2",     status:"Recria"          },
  { id:9,  brinco:"BC-009", categoria:"Bezerro Rec.", pesoPrev:175, pesoAtual:188, dtEntrada:"Mar/25", previsaoAbate:"Jan/26", pasto:"Piquete 2",     status:"Recria"          },
  { id:10, brinco:"BC-010", categoria:"Garrote",      pesoPrev:330, pesoAtual:352, dtEntrada:"Fev/25", previsaoAbate:"Ago/25", pasto:"Pasto Leste",   status:"Em engorda"      },
];

const VENDAS_GADO = [
  { mes:"Out", cabecas:4, arrobas:240, valorArroba:310, total:74400  },
  { mes:"Nov", cabecas:3, arrobas:178, valorArroba:315, total:56070  },
  { mes:"Dez", cabecas:6, arrobas:372, valorArroba:320, total:119040 },
  { mes:"Jan", cabecas:5, arrobas:305, valorArroba:318, total:96990  },
  { mes:"Fev", cabecas:4, arrobas:244, valorArroba:322, total:78568  },
  { mes:"Mar", cabecas:7, arrobas:434, valorArroba:325, total:141050 },
];

const CUSTOS_CORTE = [
  { mes:"Out", racaoSupl:8200, medicamentos:1100, maoDeObra:2400, outros:900  },
  { mes:"Nov", racaoSupl:7800, medicamentos: 900, maoDeObra:2400, outros:700  },
  { mes:"Dez", racaoSupl:9100, medicamentos:1300, maoDeObra:2400, outros:1100 },
  { mes:"Jan", racaoSupl:8600, medicamentos:1000, maoDeObra:2400, outros:800  },
  { mes:"Fev", racaoSupl:8000, medicamentos: 950, maoDeObra:2400, outros:750  },
  { mes:"Mar", racaoSupl:9400, medicamentos:1200, maoDeObra:2400, outros:950  },
];

const VACINAS_CORTE = [
  { data:"10/04/25", lote:"Confinamento A+B", vacina:"Febre Aftosa",           qtd:9,  status:"Pendente"  },
  { data:"15/04/25", lote:"Piquete 2",        vacina:"Brucelose + Carbunculo", qtd:2,  status:"Pendente"  },
  { data:"01/03/25", lote:"Todos",            vacina:"Vermifugacao",            qtd:10, status:"Realizado" },
  { data:"10/02/25", lote:"Confinamento A",   vacina:"IBR/BVD",                qtd:5,  status:"Realizado" },
];

const GANHO_PESO = [
  { mes:"Out", gmDiario:0.82 },
  { mes:"Nov", gmDiario:0.78 },
  { mes:"Dez", gmDiario:0.91 },
  { mes:"Jan", gmDiario:0.88 },
  { mes:"Fev", gmDiario:0.85 },
  { mes:"Mar", gmDiario:0.93 },
];


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
  const [aba, setAba] = useState("geral");

  // ── dados consolidados ──
  const PC=18, PL=2.80, PCO=2.50;
  const cur  = FINANCEIRO[FINANCEIRO.length-1];
  const prv  = FINANCEIRO[FINANCEIRO.length-2];
  const pCur = PRODUCAO[PRODUCAO.length-1];
  const vGado= VENDAS_GADO[VENDAS_GADO.length-1];
  const prvG = VENDAS_GADO[VENDAS_GADO.length-2];
  const cCor = CUSTOS_CORTE[CUSTOS_CORTE.length-1];

  const recCacau = pCur.cacauKg * PC;
  const recLeite = pCur.leiteL  * PL;
  const recCoco  = pCur.cocoUn  * PCO;
  const recGado  = vGado.total;
  const recTotal = recCacau + recLeite + recCoco + recGado;

  const cstCorte = cCor.racaoSupl + cCor.medicamentos + cCor.maoDeObra + cCor.outros;

  // Custos estimados por atividade (Mar/25)
  const cstCacau = 9200;   // insumos + mão de obra cacau
  const cstLeite = 7400;   // ração vacas leiteiras + mão de obra ordenha
  const cstCoco  = 4100;   // adubação + colheita

  const lucCacau = recCacau - cstCacau;
  const lucLeite = recLeite - cstLeite;
  const lucCoco  = recCoco  - cstCoco;
  const lucGado  = recGado  - cstCorte;
  const lucTotal = lucCacau + lucLeite + lucCoco + lucGado;

  // Dados para pizza de receita
  const receitaPizza = [
    { name:"🍫 Cacau",       value: recCacau },
    { name:"🥛 Leite",       value: recLeite },
    { name:"🥥 Coco",        value: recCoco  },
    { name:"🐂 Gado Corte",  value: recGado  },
  ];

  // Dados comparativos por atividade
  const comparativo = [
    { ativ:"Cacau",      receita:recCacau, custo:cstCacau, lucro:lucCacau, icon:"🍫", cor:"#d4a017" },
    { ativ:"Leite",      receita:recLeite, custo:cstLeite, lucro:lucLeite, icon:"🥛", cor:"#2d6a4f" },
    { ativ:"Coco",       receita:recCoco,  custo:cstCoco,  lucro:lucCoco,  icon:"🥥", cor:"#52b788" },
    { ativ:"Gado Corte", receita:recGado,  custo:cstCorte, lucro:lucGado,  icon:"🐂", cor:"#457b9d" },
  ];

  // Evolução receita por atividade (6 meses)
  const evolReceita = PRODUCAO.map((p,i) => ({
    mes:    p.mes,
    Cacau:  p.cacauKg * PC,
    Leite:  p.leiteL  * PL,
    Coco:   p.cocoUn  * PCO,
    Gado:   VENDAS_GADO[i]?.total || 0,
  }));

  // ── Aba GERAL ──────────────────────────────────────────
  const TabGeral = () => (
    <div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
        <KpiCard label="Receita Total Mar/25"  value={fmt(recTotal)}  sub={`Gado: ${fmt(recGado)}`}          color="#2d6a4f" icon="💰" trend={1}/>
        <KpiCard label="Despesas Mar/25"       value={fmt(cur.despesa)} sub={`vs ${fmt(prv.despesa)} ant.`}  color="#e76f51" icon="📋" trend={-(cur.despesa-prv.despesa)}/>
        <KpiCard label="Lucro Consolidado"     value={fmt(lucTotal)}   sub="Todas as atividades"             color="#d4a017" icon="📈" trend={lucTotal>0?1:-1}/>
        <KpiCard label="Funcionários Ativos"   value={funcionarios.length+" ativ."} color="#457b9d" icon="👥" trend={0}/>
      </div>

      {/* Receita vs Despesa */}
      <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
        <Card>
          <CardTitle>Receita por Atividade — 6 meses</CardTitle>
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={evolReceita}>
              <defs>
                {[["gC","#d4a017"],["gL","#2d6a4f"],["gCo","#52b788"],["gG","#457b9d"]].map(([id,c])=>(
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={c} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={c} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="mes" tick={{fontSize:11}}/>
              <YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
              <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
              <Area type="monotone" dataKey="Cacau" stroke="#d4a017" fill="url(#gC)"  strokeWidth={2}/>
              <Area type="monotone" dataKey="Leite" stroke="#2d6a4f" fill="url(#gL)"  strokeWidth={2}/>
              <Area type="monotone" dataKey="Coco"  stroke="#52b788" fill="url(#gCo)" strokeWidth={2}/>
              <Area type="monotone" dataKey="Gado"  stroke="#457b9d" fill="url(#gG)"  strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <Card>
            <CardTitle>Distribuição de Receita</CardTitle>
            <ResponsiveContainer width="100%" height={110}>
              <PieChart>
                <Pie data={receitaPizza} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                  {receitaPizza.map((_,i)=><Cell key={i} fill={["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:4 }}>
              {receitaPizza.map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#374151" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:["#d4a017","#2d6a4f","#52b788","#457b9d"][i]}}/>
                  {d.name} ({((d.value/recTotal)*100).toFixed(0)}%)
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle>Distribuição de Despesas</CardTitle>
            <ResponsiveContainer width="100%" height={110}>
              <PieChart>
                <Pie data={DESPESAS_CATEG} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value">
                  {DESPESAS_CATEG.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                </Pie>
                <Tooltip formatter={v=>fmt(v)}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:4 }}>
              {DESPESAS_CATEG.slice(0,4).map((d,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:4, fontSize:10, color:"#374151" }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:COLORS[i]}}/>
                  {d.name}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Comparativo por atividade */}
      <Card style={{ marginBottom:14 }}>
        <CardTitle>Receita × Custo × Lucro por Atividade — Mar/25</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={comparativo} margin={{top:0,right:20,left:0,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
            <XAxis dataKey="ativ" tick={{fontSize:12}}/>
            <YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
            <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
            <Bar dataKey="receita" name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/>
            <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
            <Bar dataKey="lucro"   name="Lucro"   fill="#d4a017" radius={[3,3,0,0]}/>
          </BarChart>
        </ResponsiveContainer>

        {/* Cards de ranking */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginTop:16 }}>
          {[...comparativo].sort((a,b)=>b.lucro-a.lucro).map((a,i)=>(
            <div key={i} style={{ padding:12, background:"#f8faf9", borderRadius:8, borderTop:`3px solid ${a.cor}` }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                <span style={{ fontSize:18 }}>{a.icon}</span>
                <span style={{ fontSize:11, fontWeight:800, color:"#6b7280" }}>#{i+1}</span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:"#1a1a2e" }}>{a.ativ}</div>
              <div style={{ fontSize:12, color:"#2d6a4f", marginTop:4 }}>Rec: {fmt(a.receita)}</div>
              <div style={{ fontSize:12, color:"#e76f51" }}>Cst: {fmt(a.custo)}</div>
              <div style={{ fontSize:14, fontWeight:800, color: a.lucro>0?"#1b4332":"#dc2626", marginTop:4 }}>
                {fmt(a.lucro)}
              </div>
              <div style={{ fontSize:10, color:"#9ca3af" }}>margem {((a.lucro/a.receita)*100).toFixed(0)}%</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Alertas */}
      <Card style={{ background:"#fffbeb", border:"1px solid #fcd34d" }}>
        <CardTitle>⚡ Alertas e Pendências</CardTitle>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
          {[
            { tipo:"💉 Vacina urgente",   desc:"Brucelose Lote C – Bezerros",      data:"15/04/25", cor:"#e76f51" },
            { tipo:"🐂 Abate previsto",   desc:"3 bois prontos – Confinamento A/B", data:"Abr/25",  cor:"#1b4332" },
            { tipo:"🌿 Rotação de pasto", desc:"Pasto Norte acima de 90% cap.",     data:"Imediato", cor:"#d97706" },
            { tipo:"📄 Tributação",        desc:"Funrural vence em 30/04/25",        data:"30/04/25", cor:"#457b9d" },
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

  // ── Aba CACAU ──────────────────────────────────────────
  const TabCacau = () => {
    const recMes = PRODUCAO.map(p=>({ mes:p.mes, receita:p.cacauKg*PC, custo:9200, lucro:p.cacauKg*PC-9200 }));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
          <KpiCard label="Receita Mar/25" value={fmt(recCacau)} color="#d4a017" icon="🍫" trend={1}/>
          <KpiCard label="Custo Mar/25"   value={fmt(cstCacau)} color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro Mar/25"   value={fmt(lucCacau)} color="#2d6a4f" icon="📈" trend={lucCacau>0?1:-1}/>
          <KpiCard label="Margem"         value={`${((lucCacau/recCacau)*100).toFixed(0)}%`} color="#457b9d" icon="📊" trend={0}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>🍫 Receita × Custo × Lucro — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#d4a017" radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#2d6a4f" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Producao (kg) — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={PRODUCAO}>
                <defs><linearGradient id="gCAC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#d4a017" stopOpacity={0.3}/><stop offset="95%" stopColor="#d4a017" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Area type="monotone" dataKey="cacauKg" name="kg" stroke="#d4a017" fill="url(#gCAC)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card style={{ marginTop:14 }}>
          <CardTitle>Indicadores de Custo — Cacau</CardTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { lbl:"Custo/kg produzido",   val:`R$ ${(cstCacau/pCur.cacauKg).toFixed(2)}`, cor:"#e76f51" },
              { lbl:"Preco medio mercado",  val:"R$ 18,00/kg",                                cor:"#d4a017" },
              { lbl:"Producao Mar/25",      val:`${fmtN(pCur.cacauKg)} kg`,                  cor:"#2d6a4f" },
              { lbl:"Receita/ha estimada",  val:fmt(recCacau/80),                             cor:"#457b9d" },
            ].map((k,i)=>(
              <div key={i} style={{ padding:14, background:"#f8faf9", borderRadius:8, borderLeft:`3px solid ${k.cor}` }}>
                <div style={{ fontSize:11, color:"#6b7280" }}>{k.lbl}</div>
                <div style={{ fontSize:18, fontWeight:700, color:k.cor, marginTop:4 }}>{k.val}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // ── Aba LEITE ──────────────────────────────────────────
  const TabLeite = () => {
    const recMes = PRODUCAO.map(p=>({ mes:p.mes, receita:Math.round(p.leiteL*PL), custo:7400, lucro:Math.round(p.leiteL*PL)-7400 }));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
          <KpiCard label="Receita Mar/25" value={fmt(recLeite)} color="#2d6a4f" icon="🥛" trend={1}/>
          <KpiCard label="Custo Mar/25"   value={fmt(cstLeite)} color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro Mar/25"   value={fmt(lucLeite)} color="#d4a017" icon="📈" trend={lucLeite>0?1:-1}/>
          <KpiCard label="Custo/Litro"    value={`R$ ${(cstLeite/pCur.leiteL).toFixed(2)}`} color="#457b9d" icon="📊" trend={0}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>🥛 Receita × Custo × Lucro — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#2d6a4f" radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Producao (L) — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={PRODUCAO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Line type="monotone" dataKey="leiteL" name="Litros" stroke="#2d6a4f" strokeWidth={2} dot={{fill:"#2d6a4f",r:4}}/>
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </div>
        <Card style={{ marginTop:14 }}>
          <CardTitle>Indicadores de Custo — Leite</CardTitle>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { lbl:"Custo/litro",         val:`R$ ${(cstLeite/pCur.leiteL).toFixed(2)}`,   cor:"#e76f51" },
              { lbl:"Preco pago/litro",    val:"R$ 2,80",                                    cor:"#2d6a4f" },
              { lbl:"Litros Mar/25",       val:`${fmtN(pCur.leiteL)} L`,                     cor:"#2d6a4f" },
              { lbl:"Media litros/vaca",   val:`${(pCur.leiteL/22/30).toFixed(1)} L/dia`,    cor:"#457b9d" },
            ].map((k,i)=>(
              <div key={i} style={{ padding:14, background:"#f8faf9", borderRadius:8, borderLeft:`3px solid ${k.cor}` }}>
                <div style={{ fontSize:11, color:"#6b7280" }}>{k.lbl}</div>
                <div style={{ fontSize:18, fontWeight:700, color:k.cor, marginTop:4 }}>{k.val}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  // ── Aba COCO ──────────────────────────────────────────
  const TabCoco = () => {
    const recMes = PRODUCAO.map(p=>({ mes:p.mes, receita:Math.round(p.cocoUn*PCO), custo:4100, lucro:Math.round(p.cocoUn*PCO)-4100 }));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
          <KpiCard label="Receita Mar/25" value={fmt(recCoco)} color="#52b788" icon="🥥" trend={1}/>
          <KpiCard label="Custo Mar/25"   value={fmt(cstCoco)} color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro Mar/25"   value={fmt(lucCoco)} color="#d4a017" icon="📈" trend={lucCoco>0?1:-1}/>
          <KpiCard label="Custo/coco"     value={`R$ ${(cstCoco/pCur.cocoUn).toFixed(2)}`} color="#457b9d" icon="📊" trend={0}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>🥥 Receita × Custo × Lucro — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#52b788" radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#d4a017" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Producao (un) — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={PRODUCAO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="cocoUn" name="Unidades" fill="#52b788" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  };

  // ── Aba GADO ──────────────────────────────────────────
  const TabGado = () => {
    const recMes = VENDAS_GADO.map((v,i)=>({ mes:v.mes, receita:v.total, custo: CUSTOS_CORTE[i].racaoSupl+CUSTOS_CORTE[i].medicamentos+CUSTOS_CORTE[i].maoDeObra+CUSTOS_CORTE[i].outros, lucro:v.total-(CUSTOS_CORTE[i].racaoSupl+CUSTOS_CORTE[i].medicamentos+CUSTOS_CORTE[i].maoDeObra+CUSTOS_CORTE[i].outros) }));
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:18 }}>
          <KpiCard label="Receita Mar/25" value={fmt(recGado)} sub={`vs ${fmt(prvG.total)} ant.`} color="#457b9d" icon="🐂" trend={recGado-prvG.total}/>
          <KpiCard label="Custo Mar/25"   value={fmt(cstCorte)} color="#e76f51" icon="📋" trend={0}/>
          <KpiCard label="Lucro Mar/25"   value={fmt(lucGado)} color="#d4a017" icon="📈" trend={lucGado>0?1:-1}/>
          <KpiCard label="R$/Arroba"      value={fmt(vGado.valorArroba)} sub="preco mercado" color="#2d6a4f" icon="📊" trend={0}/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>🐂 Receita × Custo × Lucro — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={recMes}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="receita" name="Receita" fill="#457b9d" radius={[3,3,0,0]}/>
                <Bar dataKey="custo"   name="Custo"   fill="#e76f51" radius={[3,3,0,0]}/>
                <Bar dataKey="lucro"   name="Lucro"   fill="#2d6a4f" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <CardTitle>Arrobas vendidas — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={VENDAS_GADO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}}/>
                <Tooltip/>
                <Bar dataKey="arrobas" name="Arrobas" fill="#457b9d" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>
      </div>
    );
  };

  const ABAS = [
    { id:"geral",  label:"🏠 Geral",         Comp: TabGeral },
    { id:"cacau",  label:"🍫 Cacau",          Comp: TabCacau },
    { id:"leite",  label:"🥛 Leite",          Comp: TabLeite },
    { id:"coco",   label:"🥥 Coco",           Comp: TabCoco  },
    { id:"gado",   label:"🐂 Gado de Corte",  Comp: TabGado  },
  ];

  const AbaAtiva = ABAS.find(a=>a.id===aba)?.Comp || TabGeral;

  return (
    <div>
      <SectionHeader title="Dashboard" sub="Analise financeira e produtiva por atividade"/>

      {/* Seletor de abas */}
      <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
        {ABAS.map(a=>(
          <button key={a.id} onClick={()=>setAba(a.id)} style={{
            padding:"9px 18px", border:"none", borderRadius:20, cursor:"pointer", fontSize:13, fontWeight:600,
            background: aba===a.id ? "#1b4332" : "white",
            color:      aba===a.id ? "white"   : "#6b7280",
            boxShadow:  aba===a.id ? "0 2px 8px rgba(27,67,50,0.3)" : "0 1px 3px rgba(0,0,0,0.08)",
            transition:"all .15s"
          }}>{a.label}</button>
        ))}
      </div>

      <AbaAtiva/>
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


// ── GADO DE CORTE ─────────────────────────────────────────
function GadoCorteView() {
  const [tab, setTab]     = useState("rebanho");
  const [rebanho, setRebanho] = useState(REBANHO_CORTE_INIT);
  const [showAdd, setShowAdd] = useState(false);
  const [novoAnimal, setNovoAnimal] = useState({ brinco:"", categoria:"Garrote", pesoPrev:"", pesoAtual:"", dtEntrada:"", previsaoAbate:"", pasto:"", status:"Em engorda" });

  const curVenda  = VENDAS_GADO[VENDAS_GADO.length-1];
  const prvVenda  = VENDAS_GADO[VENDAS_GADO.length-2];
  const curCusto  = CUSTOS_CORTE[CUSTOS_CORTE.length-1];
  const totalCustoMes = curCusto.racaoSupl + curCusto.medicamentos + curCusto.maoDeObra + curCusto.outros;
  const lucroCorte = curVenda.total - totalCustoMes;
  const prontos   = rebanho.filter(a => a.status === "Pronto p/ Abate").length;
  const curGM     = GANHO_PESO[GANHO_PESO.length-1].gmDiario;

  const thS = { padding:"9px 12px", textAlign:"left", fontSize:11, color:"#6b7280", fontWeight:600, borderBottom:"1px solid #e5e7eb", background:"#f8faf9" };
  const tdS = { padding:"10px 12px", fontSize:12, borderBottom:"1px solid #f3f4f6" };

  const statusCor = s => s === "Pronto p/ Abate" ? { bg:"#fee2e2", tx:"#dc2626" }
                       : s === "Em engorda"       ? { bg:"#fef3c7", tx:"#b45309" }
                       : s === "Recria"           ? { bg:"#dbeafe", tx:"#1d4ed8" }
                       : { bg:"#f3f4f6", tx:"#6b7280" };

  const addAnimal = () => {
    if (!novoAnimal.brinco || !novoAnimal.pesoAtual) return;
    setRebanho([...rebanho, { id: Date.now(), ...novoAnimal, pesoPrev: Number(novoAnimal.pesoPrev), pesoAtual: Number(novoAnimal.pesoAtual) }]);
    setNovoAnimal({ brinco:"", categoria:"Garrote", pesoPrev:"", pesoAtual:"", dtEntrada:"", previsaoAbate:"", pasto:"", status:"Em engorda" });
    setShowAdd(false);
  };

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:6 }}>
        <span style={{ fontSize:28 }}>🐂</span>
        <div>
          <h1 style={{ fontSize:20, fontWeight:800, color:"#1b4332", margin:0 }}>Gado de Corte</h1>
          <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>Rebanho, engorda, venda e manejo sanitario</p>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, margin:"18px 0" }}>
        <KpiCard label="Receita Venda Mar/25" value={fmt(curVenda.total)}   sub={`vs ${fmt(prvVenda.total)} mes ant.`} color="#2d6a4f" icon="💰" trend={curVenda.total - prvVenda.total}/>
        <KpiCard label="Custo Corte Mar/25"   value={fmt(totalCustoMes)}    color="#e76f51" icon="📋" trend={0}/>
        <KpiCard label="Lucro Corte Mar/25"   value={fmt(lucroCorte)}       color="#d4a017" icon="📈" trend={lucroCorte > 0 ? 1 : -1}/>
        <KpiCard label="Prontos p/ Abate"     value={`${prontos} animais`}  sub={`GM: ${curGM} kg/dia`} color="#457b9d" icon="🐂" trend={0}/>
      </div>

      <TabBar tabs={[
        {id:"rebanho",  label:"Rebanho"},
        {id:"financeiro",label:"Financeiro"},
        {id:"sanitario",label:"Agenda Sanitaria"},
        {id:"engorda",  label:"Desempenho"},
      ]} active={tab} onChange={setTab}/>

      {/* ── REBANHO ── */}
      {tab === "rebanho" && (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ display:"flex", gap:14 }}>
              {[
                { lbl:"Total", val:rebanho.length,                                     cor:"#1b4332" },
                { lbl:"Prontos p/ Abate", val:rebanho.filter(a=>a.status==="Pronto p/ Abate").length, cor:"#dc2626" },
                { lbl:"Em engorda",       val:rebanho.filter(a=>a.status==="Em engorda").length,       cor:"#b45309" },
                { lbl:"Recria",           val:rebanho.filter(a=>a.status==="Recria").length,           cor:"#1d4ed8" },
              ].map((s,i) => (
                <div key={i} style={{ padding:"6px 14px", background:"white", borderRadius:8, boxShadow:"0 1px 3px rgba(0,0,0,0.08)", borderLeft:`3px solid ${s.cor}` }}>
                  <span style={{ fontSize:11, color:"#6b7280" }}>{s.lbl}: </span>
                  <span style={{ fontSize:14, fontWeight:700, color:s.cor }}>{s.val}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAdd(!showAdd)} style={{ padding:"8px 16px", background:"#1b4332", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>
              + Animal
            </button>
          </div>

          {showAdd && (
            <div style={{ background:"#f0faf4", border:"1px solid #b7e4c7", borderRadius:10, padding:14, marginBottom:14 }}>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:10 }}>
                {[["Brinco","brinco","text"],["Peso Prev.(kg)","pesoPrev","number"],["Peso Atual(kg)","pesoAtual","number"],["Pasto/Local","pasto","text"],["Dt. Entrada","dtEntrada","text"],["Prev. Abate","previsaoAbate","text"]].map(([lbl,key,type])=>(
                  <div key={key}>
                    <label style={{ fontSize:11, color:"#374151", display:"block", marginBottom:3 }}>{lbl}</label>
                    <input type={type} value={novoAnimal[key]} onChange={e=>setNovoAnimal({...novoAnimal,[key]:e.target.value})}
                      style={{ width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }}/>
                  </div>
                ))}
                <div>
                  <label style={{ fontSize:11, color:"#374151", display:"block", marginBottom:3 }}>Categoria</label>
                  <select value={novoAnimal.categoria} onChange={e=>setNovoAnimal({...novoAnimal,categoria:e.target.value})}
                    style={{ width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }}>
                    {["Boi Gordo","Garrote","Novilha","Bezerro Rec."].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:11, color:"#374151", display:"block", marginBottom:3 }}>Status</label>
                  <select value={novoAnimal.status} onChange={e=>setNovoAnimal({...novoAnimal,status:e.target.value})}
                    style={{ width:"100%", padding:"7px 10px", border:"1px solid #d1d5db", borderRadius:6, fontSize:12, boxSizing:"border-box" }}>
                    {["Em engorda","Pronto p/ Abate","Recria"].map(s=><option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={addAnimal} style={{ padding:"8px 18px", background:"#1b4332", color:"white", border:"none", borderRadius:6, cursor:"pointer", fontWeight:600 }}>Salvar</button>
                <button onClick={()=>setShowAdd(false)} style={{ padding:"8px 14px", background:"#e5e7eb", border:"none", borderRadius:6, cursor:"pointer" }}>Cancelar</button>
              </div>
            </div>
          )}

          <div style={{ background:"white", borderRadius:12, overflow:"hidden", boxShadow:"0 1px 4px rgba(0,0,0,0.08)" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead><tr>
                {["Brinco","Categoria","Peso Prev.(kg)","Peso Atual(kg)","GMD est.(kg)","Arroba est.","Entrada","Prev. Abate","Local","Status",""].map((h,i)=>(
                  <th key={i} style={thS}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {rebanho.map((a,i) => {
                  const gmd  = a.pesoPrev ? ((a.pesoAtual - a.pesoPrev) / 90).toFixed(2) : "-";
                  const arrs = (a.pesoAtual / 15).toFixed(1);
                  const sc   = statusCor(a.status);
                  return (
                    <tr key={a.id} style={{ background: i%2 ? "#fafafa" : "white" }}>
                      <td style={{...tdS, fontWeight:700, color:"#1a1a2e"}}>{a.brinco}</td>
                      <td style={tdS}>{a.categoria}</td>
                      <td style={tdS}>{a.pesoPrev} kg</td>
                      <td style={{...tdS, fontWeight:600, color:"#1b4332"}}>{a.pesoAtual} kg</td>
                      <td style={tdS}>{gmd} kg</td>
                      <td style={{...tdS, color:"#d4a017", fontWeight:600}}>{arrs} @</td>
                      <td style={{...tdS, color:"#6b7280"}}>{a.dtEntrada}</td>
                      <td style={{...tdS, color:"#374151"}}>{a.previsaoAbate}</td>
                      <td style={{...tdS, color:"#6b7280"}}>{a.pasto}</td>
                      <td style={tdS}><span style={{ padding:"3px 9px", borderRadius:10, fontSize:11, fontWeight:600, background:sc.bg, color:sc.tx }}>{a.status}</span></td>
                      <td style={tdS}><button onClick={()=>setRebanho(rebanho.filter(x=>x.id!==a.id))} style={{ background:"none", border:"none", color:"#e76f51", cursor:"pointer" }}>x</button></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background:"#1b4332" }}>
                  <td colSpan={3} style={{ padding:"10px 12px", color:"white", fontWeight:700, fontSize:13 }}>TOTAIS — {rebanho.length} animais</td>
                  <td style={{ padding:"10px 12px", color:"#95d5b2", fontWeight:700 }}>{rebanho.reduce((s,a)=>s+a.pesoAtual,0).toLocaleString("pt-BR")} kg</td>
                  <td colSpan={2} style={{ padding:"10px 12px", color:"#95d5b2", fontWeight:700 }}>{(rebanho.reduce((s,a)=>s+a.pesoAtual,0)/15).toFixed(1)} @ totais</td>
                  <td colSpan={5}/>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* ── FINANCEIRO CORTE ── */}
      {tab === "financeiro" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>Receita de Venda de Gado — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={VENDAS_GADO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend/>
                <Bar dataKey="total" name="Receita Total" fill="#1b4332" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:14, overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead><tr>{["Mes","Cabecas","Arrobas","R$/Arroba","Total"].map((h,i)=><th key={i} style={{ padding:"7px 10px", textAlign:"left", color:"#6b7280", borderBottom:"1px solid #e5e7eb" }}>{h}</th>)}</tr></thead>
                <tbody>{VENDAS_GADO.map((v,i)=>(
                  <tr key={i} style={{ background:i%2?"#fafafa":"white" }}>
                    <td style={{ padding:"7px 10px", fontWeight:600 }}>{v.mes}</td>
                    <td style={{ padding:"7px 10px" }}>{v.cabecas} cab.</td>
                    <td style={{ padding:"7px 10px" }}>{v.arrobas} @</td>
                    <td style={{ padding:"7px 10px", color:"#d4a017", fontWeight:600 }}>{fmt(v.valorArroba)}</td>
                    <td style={{ padding:"7px 10px", fontWeight:700, color:"#1b4332" }}>{fmt(v.total)}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr style={{ background:"#1b4332" }}>
                  <td colSpan={4} style={{ padding:"8px 10px", color:"#95d5b2", fontWeight:700 }}>Total 6 meses</td>
                  <td style={{ padding:"8px 10px", color:"white", fontWeight:800 }}>{fmt(VENDAS_GADO.reduce((s,v)=>s+v.total,0))}</td>
                </tr></tfoot>
              </table>
            </div>
          </Card>

          <Card>
            <CardTitle>Custos de Producao — 6 meses</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CUSTOS_CORTE}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:10}} tickFormatter={v=>`R$${(v/1000).toFixed(0)}k`}/>
                <Tooltip formatter={v=>fmt(v)}/><Legend/>
                <Bar dataKey="racaoSupl"    name="Racao/Supl."   stackId="a" fill="#2d6a4f" radius={[0,0,0,0]}/>
                <Bar dataKey="medicamentos" name="Medicamentos"   stackId="a" fill="#d4a017"/>
                <Bar dataKey="maoDeObra"    name="Mao de Obra"    stackId="a" fill="#457b9d"/>
                <Bar dataKey="outros"       name="Outros"         stackId="a" fill="#e76f51" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:14, padding:14, background:"#f8faf9", borderRadius:8 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#1b4332", marginBottom:10 }}>Breakdown Mar/25</div>
              {[
                { lbl:"Racao e Suplementos", val:curCusto.racaoSupl,    cor:"#2d6a4f" },
                { lbl:"Medicamentos/Vet.",   val:curCusto.medicamentos, cor:"#d4a017" },
                { lbl:"Mao de Obra",         val:curCusto.maoDeObra,    cor:"#457b9d" },
                { lbl:"Outros",              val:curCusto.outros,       cor:"#e76f51" },
              ].map((c,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #e5e7eb" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:c.cor }}/>
                    <span style={{ fontSize:12, color:"#374151" }}>{c.lbl}</span>
                  </div>
                  <span style={{ fontSize:12, fontWeight:600 }}>{fmt(c.val)}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", marginTop:10 }}>
                <span style={{ fontWeight:700, color:"#1b4332" }}>Custo Total</span>
                <span style={{ fontWeight:800, color:"#e76f51" }}>{fmt(totalCustoMes)}</span>
              </div>
              <div style={{ marginTop:8, padding:10, background: lucroCorte>0?"#d8f3dc":"#fee2e2", borderRadius:6 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontWeight:700, color: lucroCorte>0?"#1b4332":"#dc2626" }}>Lucro Corte Mar/25</span>
                  <span style={{ fontWeight:800, color: lucroCorte>0?"#1b4332":"#dc2626" }}>{fmt(lucroCorte)}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* ── SANITARIO ── */}
      {tab === "sanitario" && (
        <Card style={{ padding:0, overflow:"hidden" }}>
          <table style={{ width:"100%", borderCollapse:"collapse" }}>
            <thead><tr>{["Data","Lote/Grupo","Vacina/Procedimento","Qtd","Status"].map((h,i)=>(
              <th key={i} style={thS}>{h}</th>
            ))}</tr></thead>
            <tbody>{VACINAS_CORTE.map((v,i)=>{
              const pend = v.status === "Pendente";
              return (
                <tr key={i} style={{ background: i%2?"#fafafa":"white" }}>
                  <td style={{...tdS, fontWeight:700, color: pend?"#e76f51":"#6b7280"}}>{v.data}</td>
                  <td style={tdS}>{v.lote}</td>
                  <td style={tdS}>{v.vacina}</td>
                  <td style={tdS}>{v.qtd} cab.</td>
                  <td style={tdS}><span style={{ padding:"3px 10px", borderRadius:10, fontSize:11, fontWeight:600, background:pend?"#fee2e2":"#d8f3dc", color:pend?"#dc2626":"#2d6a4f" }}>{v.status}</span></td>
                </tr>
              );
            })}</tbody>
          </table>
          <div style={{ padding:16, background:"#fffbeb", borderTop:"1px solid #fcd34d" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#b45309", marginBottom:8 }}>Protocolo Sanitario Recomendado</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { ev:"Vermifugacao",         freq:"A cada 90 dias",        obs:"Ivermectina ou Doramectina" },
                { ev:"Febre Aftosa",         freq:"Maio e Novembro",        obs:"Obrigatoria por lei" },
                { ev:"Raiva/Carbunculo",     freq:"Anual",                  obs:"Regioes endemicas" },
                { ev:"Pesagem",              freq:"Mensal",                  obs:"Controle de GMD" },
                { ev:"Suplementacao Mineral",freq:"Continua (cochos)",      obs:"Sal mineralizado 80g/cab/dia" },
                { ev:"Casqueamento",         freq:"A cada 6 meses",         obs:"Prevencao de claudicacao" },
              ].map((p,i)=>(
                <div key={i} style={{ padding:10, background:"white", borderRadius:6, borderLeft:"2px solid #d4a017" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{p.ev}</div>
                  <div style={{ fontSize:11, color:"#2d6a4f", marginTop:2 }}>{p.freq}</div>
                  <div style={{ fontSize:10, color:"#9ca3af", marginTop:3 }}>{p.obs}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ── DESEMPENHO ── */}
      {tab === "engorda" && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
          <Card>
            <CardTitle>Ganho de Peso Medio Diario (GMD) — kg/dia</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={GANHO_PESO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/>
                <YAxis domain={[0.6,1.1]} tick={{fontSize:11}} tickFormatter={v=>`${v} kg`}/>
                <Tooltip formatter={v=>`${v} kg/dia`}/>
                <Line type="monotone" dataKey="gmDiario" name="GMD" stroke="#1b4332" strokeWidth={2} dot={{fill:"#1b4332",r:5}}/>
              </LineChart>
            </ResponsiveContainer>
            <div style={{ marginTop:12, padding:12, background:"#f0faf4", borderRadius:8 }}>
              <div style={{ fontSize:12, color:"#6b7280" }}>Meta: <strong>0,9 kg/dia</strong> (sistema semi-confinado)</div>
              <div style={{ fontSize:12, color: curGM >= 0.9 ? "#1b4332" : "#e76f51", marginTop:4, fontWeight:600 }}>
                Atual: {curGM} kg/dia {curGM >= 0.9 ? "✅ Acima da meta" : "⚠️ Abaixo da meta"}
              </div>
            </div>
          </Card>

          <Card>
            <CardTitle>Resumo de Arrobas Produzidas</CardTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={VENDAS_GADO}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                <XAxis dataKey="mes" tick={{fontSize:11}}/><YAxis tick={{fontSize:11}}/>
                <Tooltip/><Legend/>
                <Bar dataKey="arrobas" name="Arrobas vendidas (@)" fill="#d4a017" radius={[4,4,0,0]}/>
                <Bar dataKey="cabecas" name="Cabecas vendidas" fill="#2d6a4f" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1b4332", marginBottom:8 }}>Indicadores Mar/25</div>
              {[
                { lbl:"Cabecas vendidas",   val:`${curVenda.cabecas} cab.`,                                 cor:"#2d6a4f" },
                { lbl:"Arrobas vendidas",   val:`${curVenda.arrobas} @`,                                    cor:"#d4a017" },
                { lbl:"Preco medio/@",      val:fmt(curVenda.valorArroba),                                   cor:"#457b9d" },
                { lbl:"Arrobas em estoque", val:`${(rebanho.reduce((s,a)=>s+a.pesoAtual,0)/15).toFixed(0)} @`, cor:"#1b4332" },
              ].map((ind,i)=>(
                <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #f3f4f6" }}>
                  <span style={{ fontSize:12, color:"#6b7280" }}>{ind.lbl}</span>
                  <span style={{ fontSize:13, fontWeight:700, color:ind.cor }}>{ind.val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ── USUÁRIOS PERMITIDOS ───────────────────────────────────
const USUARIOS = [
  { usuario: "admin",   senha: "fazenda2025", nome: "Administrador",  perfil: "Administrador" },
  { usuario: "gerente", senha: "gerente123",  nome: "Gerente de Campo",perfil: "Gerente"       },
  { usuario: "contador",senha: "contabil@1",  nome: "Contador",        perfil: "Financeiro"    },
];

// ── TELA DE LOGIN ─────────────────────────────────────────
function LoginView({ onLogin }) {
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha]     = useState("");
  const [erro, setErro]       = useState("");
  const [showSenha, setShowSenha] = useState(false);

  const handleLogin = () => {
    const user = USUARIOS.find(u => u.usuario === usuario.trim() && u.senha === senha);
    if (user) { setErro(""); onLogin(user); }
    else setErro("Usuário ou senha incorretos.");
  };

  const handleKey = e => { if (e.key === "Enter") handleLogin(); };

  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#1b4332 0%,#2d6a4f 60%,#52b788 100%)",
      display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>

      {/* Card */}
      <div style={{ background:"white", borderRadius:20, padding:"44px 40px", width:360,
        boxShadow:"0 20px 60px rgba(0,0,0,0.35)" }}>

        {/* Logo */}
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ fontSize:52, marginBottom:8 }}>🌱</div>
          <div style={{ fontSize:24, fontWeight:800, color:"#1b4332" }}>FazendaGest</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:4 }}>Cacau · Leite · Coco</div>
        </div>

        {/* Campos */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Usuário</label>
          <input
            value={usuario} onChange={e => setUsuario(e.target.value)} onKeyDown={handleKey}
            placeholder="Digite seu usuário"
            style={{ width:"100%", padding:"11px 14px", border:"1px solid #d1d5db", borderRadius:8,
              fontSize:14, boxSizing:"border-box", outline:"none",
              borderColor: erro ? "#ef4444" : "#d1d5db" }}
          />
        </div>

        <div style={{ marginBottom:10 }}>
          <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Senha</label>
          <div style={{ position:"relative" }}>
            <input
              type={showSenha ? "text" : "password"}
              value={senha} onChange={e => setSenha(e.target.value)} onKeyDown={handleKey}
              placeholder="Digite sua senha"
              style={{ width:"100%", padding:"11px 40px 11px 14px", border:"1px solid #d1d5db", borderRadius:8,
                fontSize:14, boxSizing:"border-box", outline:"none",
                borderColor: erro ? "#ef4444" : "#d1d5db" }}
            />
            <button onClick={() => setShowSenha(!showSenha)}
              style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
                background:"none", border:"none", cursor:"pointer", fontSize:16, color:"#9ca3af" }}>
              {showSenha ? "🙈" : "👁"}
            </button>
          </div>
        </div>

        {erro && (
          <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:6,
            padding:"8px 12px", fontSize:12, color:"#dc2626", marginBottom:12 }}>
            ⚠️ {erro}
          </div>
        )}

        <button onClick={handleLogin}
          style={{ width:"100%", padding:"13px", background:"#1b4332", color:"white", border:"none",
            borderRadius:8, fontSize:15, fontWeight:700, cursor:"pointer", marginTop:8,
            transition:"background .2s" }}
          onMouseOver={e => e.target.style.background="#2d6a4f"}
          onMouseOut={e  => e.target.style.background="#1b4332"}>
          Entrar
        </button>

        {/* Dica de acesso */}
        <div style={{ marginTop:24, background:"#f0faf4", borderRadius:8, padding:12 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#2d6a4f", marginBottom:6 }}>👤 Acessos de demonstração:</div>
          {USUARIOS.map((u,i) => (
            <div key={i} style={{ fontSize:11, color:"#6b7280", marginBottom:2 }}>
              <strong>{u.usuario}</strong> / {u.senha} — <span style={{ color:"#9ca3af" }}>{u.perfil}</span>
            </div>
          ))}
        </div>

        <div style={{ textAlign:"center", marginTop:16, fontSize:11, color:"#9ca3af" }}>
          v1.0 · FazendaGest © 2025
        </div>
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────
export default function App() {
  const [logado, setLogado]       = useState(null);
  const [menu, setMenu]           = useState("dashboard");
  const [funcionarios, setFuncionarios] = useState(FUNCIONARIOS_INIT);

  if (!logado) return <LoginView onLogin={user => setLogado(user)} />;

  const items = [
    { id:"dashboard", label:"Dashboard",         icon:"🏠" },
    { id:"financeiro",label:"Financeiro",         icon:"💰" },
    { id:"producao",  label:"Produção",           icon:"📊" },
    { id:"manejo",    label:"Manejo Pecuário",    icon:"🐄" },
    { id:"gadocorte", label:"Gado de Corte",       icon:"🐂" },
    { id:"importar",  label:"Integração Sheets",  icon:"📁" },
  ];

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"'Segoe UI',system-ui,sans-serif", background:"#f0f4f1", fontSize:14 }}>
      {/* SIDEBAR */}
      <div style={{ width:210, background:"#1b4332", color:"white", display:"flex", flexDirection:"column", flexShrink:0 }}>
        <div style={{ padding:"18px 18px 14px", borderBottom:"1px solid #2d6a4f" }}>
          <div style={{ fontSize:15, fontWeight:800, color:"#95d5b2" }}>🌱 FazendaGest</div>
          <div style={{ fontSize:10, color:"#74c69d", marginTop:2 }}>Cacau · Leite · Coco · Gado</div>
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
        <div style={{ padding:"12px 18px", borderTop:"1px solid #2d6a4f" }}>
          <div style={{ fontSize:11, color:"#95d5b2", fontWeight:700 }}>👤 {logado.nome}</div>
          <div style={{ fontSize:10, color:"#74c69d", marginTop:2 }}>{logado.perfil}</div>
          <button onClick={() => setLogado(null)}
            style={{ marginTop:10, width:"100%", padding:"7px", background:"rgba(255,255,255,0.1)",
              border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, color:"#b7e4c7",
              fontSize:11, cursor:"pointer", fontWeight:600 }}>
            🚪 Sair
          </button>
          <div style={{ fontSize:9, color:"#52b788", marginTop:8 }}>v1.0 · Mar/2025</div>
        </div>
      </div>

      {/* CONTENT */}
      <div style={{ flex:1, overflow:"auto", padding:22 }}>
        {menu==="dashboard" && <DashboardView funcionarios={funcionarios}/>}
        {menu==="financeiro" && <FinanceiroView funcionarios={funcionarios} setFuncionarios={setFuncionarios}/>}
        {menu==="producao"   && <ProducaoView/>}
        {menu==="manejo"     && <ManejoView/>}
        {menu==="gadocorte" && <GadoCorteView/>}
        {menu==="importar"   && <ImportarView/>}
      </div>
    </div>
  );
}
