import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "./lib/supabase";

/* ──────────── image map ──────────── */
const IMG = {
  encourage: "/images/1.jpg",   // 拳握り・応援
  think:     "/images/2.jpg",   // 考え中
  point:     "/images/3.jpg",   // 指さし・解説
  peace:     "/images/5.jpg",   // ピース・喜び
  fist:      "/images/6.jpg",   // ガッツポーズ
  guide:     "/images/7.jpg",   // 指さし・案内
  sit:       "/images/9.jpg",   // しゃがみ・寂しげ
  dejected:  "/images/10.jpg",  // がっくり
  shock:     "/images/11.jpg",  // 驚き
  blush:     "/images/12.jpg",  // 照れ・嬉しい
  shy:       "/images/13.jpg",  // 照れ
  secret:    "/images/14.jpg",  // 秘密
  chibiUp:   "/images/15.jpg",  // ちびキャラ指さし
  chibiJoy:  "/images/16.jpg",  // ちびキャラ万歳
  walk:      "/images/17.jpg",  // 歩く
  gentle:    "/images/18.jpg",  // 優しい微笑み
};

/* character images to show per question index */
const Q_CHARS = [
  IMG.gentle,   // Q1 性別
  IMG.think,    // Q2 年齢
  IMG.think,    // Q3 年収
  IMG.think,    // Q4 学歴
  IMG.blush,    // Q5 見た目
  IMG.peace,    // Q6 休日
  IMG.shy,      // Q7 コミュニケーション
  IMG.secret,   // Q8 条件
  IMG.point,    // Q9 柔軟性
  IMG.encourage,// Q10 本気度
  IMG.guide,    // Q11 経験
  IMG.gentle,   // Q12 満足度
];

/* character speech bubbles per question */
const Q_SPEECH = [
  "まずは性別を教えてね！",
  "年齢は正直に…！",
  "ちょっと聞きにくいけど…💦",
  "学歴もチェック！",
  "自分磨き、してる？✨",
  "お休みの日は何してる？",
  "初対面の会話、得意？",
  "お相手に一番求めるものは？",
  "条件に合わない人、どうする？",
  "結婚への本気度は…！🔥",
  "婚活の経験を教えてね",
  "最後の質問だよ！",
];

/* ──────────── questions ──────────── */
const QUESTIONS = [
  { id:"gender", axis:null, text:"あなたの性別は？",
    options:[{label:"男性",value:"male"},{label:"女性",value:"female"}]},
  { id:"age", axis:["SPEC","TIMING"], text:"あなたの年齢は？",
    options:[
      {label:"20〜25歳",sM:[5,5],sF:[7,7]},{label:"26〜29歳",sM:[6,6],sF:[8,8]},
      {label:"30〜33歳",sM:[8,8],sF:[6,6]},{label:"34〜37歳",sM:[8,7],sF:[4,4]},
      {label:"38〜42歳",sM:[6,5],sF:[3,3]},{label:"43歳以上",sM:[4,4],sF:[2,2]}]},
  { id:"income", axis:["SPEC"], text:"あなたの年収は？",
    options:[
      {label:"〜300万円",sM:[2],sF:[4]},{label:"300〜400万円",sM:[4],sF:[5]},
      {label:"400〜500万円",sM:[5],sF:[5]},{label:"500〜700万円",sM:[6],sF:[6]},
      {label:"700〜1,000万円",sM:[8],sF:[6]},{label:"1,000万円以上",sM:[10],sF:[6]}]},
  { id:"edu", axis:["SPEC"], text:"最終学歴は？",
    options:[
      {label:"高校卒",sM:[2],sF:[3]},{label:"専門・短大卒",sM:[3],sF:[4]},
      {label:"大学卒",sM:[4],sF:[4]},{label:"難関大卒",sM:[5],sF:[5]},
      {label:"大学院卒",sM:[5],sF:[4]}]},
  { id:"looks", axis:["LIFE"], text:"見た目への自己投資はどの程度？",
    options:[
      {label:"特に何もしていない",s:[2]},{label:"最低限の身だしなみは整えている",s:[4]},
      {label:"定期的に美容院に通い、服装にも気を遣う",s:[7]},
      {label:"プロのスタイリングや診断を受けたことがある",s:[9]}]},
  { id:"hobby", axis:["LIFE","HUMAN"], text:"休日の過ごし方で最も多いのは？",
    options:[
      {label:"家でゴロゴロ・動画視聴",s:[2,2]},{label:"趣味や習い事に没頭",s:[6,4]},
      {label:"友人との外出やイベント",s:[5,7]},{label:"自己啓発や資格勉強",s:[7,4]}]},
  { id:"comm", axis:["HUMAN"], text:"初対面の異性との会話、最も近いのは？",
    options:[
      {label:"正直苦手で、沈黙が多くなりがち",s:[2]},
      {label:"相手に合わせられるが、自分から話題を振れない",s:[5]},
      {label:"自然に楽しめるが、深い話は難しい",s:[7]},
      {label:"どんな相手とも打ち解けられる",s:[10]}]},
  { id:"pri", axis:["LITERACY"], text:"結婚相手に最も求めることは？",
    options:[
      {label:"年収・職業などの経済力",s:[5]},{label:"見た目・清潔感",s:[5]},
      {label:"性格の相性・価値観の一致",s:[8]},{label:"家事育児への協力姿勢",s:[6]}]},
  { id:"flex", axis:["LITERACY"], text:"理想の条件に合わない相手とのお見合い、どうする？",
    options:[
      {label:"お断りする。条件は譲れない",s:[3]},{label:"大きく外れていたらお断り",s:[5]},
      {label:"一度会ってみて、人柄で判断する",s:[8]},
      {label:"条件はあくまで目安。会ってみないと",s:[10]}]},
  { id:"time", axis:["LITERACY","TIMING"], text:"結婚したい時期は？",
    options:[
      {label:"良い人がいればいつでも",s:[5,5]},{label:"1年以内に結婚したい",s:[8,9]},
      {label:"2〜3年以内に結婚したい",s:[6,6]},{label:"まだ具体的には考えていない",s:[3,3]}]},
  { id:"exp", axis:["LITERACY"], text:"これまでの婚活経験は？",
    options:[
      {label:"婚活は初めて（アプリも未経験）",s:[3]},{label:"マッチングアプリの経験あり",s:[6]},
      {label:"婚活パーティーや合コンの経験あり",s:[5]},{label:"結婚相談所の経験あり",s:[5]}]},
  { id:"sat", axis:["HUMAN","LIFE"], text:"今の生活に対する満足度は？",
    options:[
      {label:"不満が多く、変えたいことだらけ",s:[3,3]},
      {label:"まあまあだが、パートナーがいれば…",s:[5,5]},
      {label:"概ね満足。でもパートナーが欲しい",s:[8,8]},
      {label:"かなり満足。一緒に楽しめる人がいたら最高",s:[7,7]}]},
];

const AX = ["SPEC","HUMAN","LITERACY","LIFE","TIMING"];
const AX_NAME = {SPEC:"ステータス",HUMAN:"人間力",LITERACY:"婚活リテラシー",LIFE:"ライフスタイル",TIMING:"婚活タイミング"};
const AX_MAX = 20;

function calc(answers){
  const r={SPEC:0,HUMAN:0,LITERACY:0,LIFE:0,TIMING:0};
  const g=answers[0];
  for(let i=1;i<QUESTIONS.length;i++){
    const q=QUESTIONS[i],c=answers[i];
    if(c==null)continue;
    const o=q.options[c];
    let sc = o.sM&&g===0?o.sM : o.sF&&g===1?o.sF : o.s;
    if(!sc)continue;
    q.axis.forEach((a,j)=>{r[a]=Math.min(AX_MAX,r[a]+(sc[j]||0));});
  }
  return r;
}

/* ── 偏差値変換 ── */
/* 想定母集団パラメータ（素点の平均・標準偏差）
   中間的な回答を選んだ場合の素点合計が約58〜62になる設計のため、
   平均60・SD13 で正規分布に変換する。軸別は平均11・SD3.5。 */
const POP_MEAN = 72;
const POP_SD   = 14;
const AX_POP_MEAN = 14;
const AX_POP_SD   = 3.5;

function toHensachi(raw, mean, sd) {
  const h = 50 + 10 * (raw - mean) / sd;
  return Math.round(Math.max(25, Math.min(75, h)));
}

function calcHensachi(scores) {
  const rawTotal = AX.reduce((s, k) => s + scores[k], 0);
  const total = toHensachi(rawTotal, POP_MEAN, POP_SD);
  const axes = {};
  AX.forEach(k => { axes[k] = toHensachi(scores[k], AX_POP_MEAN, AX_POP_SD); });
  return { total, axes, rawTotal };
}

function getRank(hensachi){
  if(hensachi>=65)return{rank:"S",name:"プラチナ婚活者",color:"#C4167A",emoji:"👑",img:IMG.chibiJoy};
  if(hensachi>=57)return{rank:"A",name:"ゴールド婚活者",color:"#D4527A",emoji:"✨",img:IMG.peace};
  if(hensachi>=50)return{rank:"B",name:"シルバー婚活者",color:"#B0607A",emoji:"💎",img:IMG.encourage};
  if(hensachi>=43)return{rank:"C",name:"ブロンズ婚活者",color:"#9A7080",emoji:"🌸",img:IMG.fist};
  return{rank:"D",name:"スタート婚活者",color:"#8B7D8B",emoji:"🌱",img:IMG.sit};
}

function getInsight(axHensachi){
  const e=AX.map(k=>[k,axHensachi[k]]);e.sort((a,b)=>b[1]-a[1]);
  return{best:e[0][0],bestV:e[0][1],worst:e[e.length-1][0],worstV:e[e.length-1][1]};
}

/* ──── Sakura petals animation ──── */
function SakuraPetals(){
  const petals = useMemo(()=>Array.from({length:18},(_,i)=>({
    id:i, left:Math.random()*100, delay:Math.random()*8, dur:6+Math.random()*6,
    size:8+Math.random()*10, drift:Math.random()*40-20,
  })),[]);
  return(
    <div style={{position:"fixed",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"hidden",zIndex:0}}>
      <style>{`
        @keyframes sakuraFall{
          0%{transform:translateY(-20px) translateX(0px) rotate(0deg);opacity:0.9}
          50%{opacity:0.7}
          100%{transform:translateY(105vh) translateX(var(--drift)) rotate(360deg);opacity:0}
        }
      `}</style>
      {petals.map(p=>(
        <div key={p.id} style={{
          position:"absolute",left:`${p.left}%`,top:"-20px",
          width:p.size,height:p.size,borderRadius:"50% 0 50% 50%",
          background:"linear-gradient(135deg, #FFB7C5 30%, #FF8FAB)",
          opacity:0.7,
          animation:`sakuraFall ${p.dur}s ${p.delay}s linear infinite`,
          "--drift":`${p.drift}px`,
        }}/>
      ))}
    </div>
  );
}

/* ──── Radar Chart ──── */
function Radar({scores,size=250}){
  const cx=size/2,cy=size/2,r=size*0.36,n=AX.length;
  const pt=(k,i,ratio)=>{
    const a=(Math.PI*2*i)/n-Math.PI/2;
    return[cx+r*ratio*Math.cos(a),cy+r*ratio*Math.sin(a)];
  };
  const dp=AX.map((k,i)=>pt(k,i,scores[k]/AX_MAX));
  const poly=dp.map(p=>p.join(",")).join(" ");
  return(
    <svg viewBox={`0 0 ${size} ${size}`} style={{width:"100%",maxWidth:size}}>
      {[.25,.5,.75,1].map((lv,li)=>(
        <polygon key={li} points={AX.map((_,i)=>pt(_,i,lv).join(",")).join(" ")}
          fill="none" stroke="rgba(196,22,122,0.1)" strokeWidth="1"/>
      ))}
      {AX.map((_,i)=>{const p=pt(_,i,1);return<line key={i} x1={cx} y1={cy} x2={p[0]} y2={p[1]} stroke="rgba(196,22,122,0.08)" strokeWidth="1"/>;
      })}
      <polygon points={poly} fill="rgba(255,143,171,0.2)" stroke="#E84B8A" strokeWidth="2.5"/>
      {dp.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="4" fill="#E84B8A"/>)}
      {AX.map((k,i)=>{
        const a=(Math.PI*2*i)/n-Math.PI/2;
        const lx=cx+(r+26)*Math.cos(a),ly=cy+(r+26)*Math.sin(a);
        return<text key={k} x={lx} y={ly} textAnchor="middle" dominantBaseline="central"
          style={{fontSize:10,fill:"#8B5070",fontFamily:"'Noto Sans JP',sans-serif",fontWeight:700}}>{AX_NAME[k]}</text>;
      })}
    </svg>
  );
}

/* ──── Speech bubble ──── */
function Bubble({text,dir="left"}){
  return(
    <div style={{
      position:"relative",background:"rgba(255,255,255,0.92)",
      borderRadius:16,padding:"10px 14px",fontSize:13,color:"#5A3050",
      fontWeight:600,lineHeight:1.5,maxWidth:220,
      boxShadow:"0 2px 12px rgba(196,22,122,0.08)",
      border:"1.5px solid rgba(255,183,197,0.4)",
    }}>
      {text}
      <div style={{
        position:"absolute",bottom:-8,[dir]:20,
        width:0,height:0,
        borderLeft:"8px solid transparent",borderRight:"8px solid transparent",
        borderTop:"8px solid rgba(255,255,255,0.92)",
      }}/>
    </div>
  );
}

/* ──────────── Main App ──────────── */
export default function App(){
  const[step,setStep]=useState(0);
  const[answers,setAnswers]=useState({});
  const[nickname,setNickname]=useState("");
  const[sel,setSel]=useState(null);
  const[anim,setAnim]=useState(false);
  const[fadeIn,setFadeIn]=useState(true);
  const[recordId,setRecordId]=useState(null);

  useEffect(()=>{setFadeIn(false);const t=setTimeout(()=>setFadeIn(true),60);return()=>clearTimeout(t);},[step]);

  const totalQ=QUESTIONS.length;
  const pick=useCallback((idx)=>{
    if(anim)return;setSel(idx);setAnim(true);
    setTimeout(()=>{
      setAnswers(p=>({...p,[step-1]:idx}));setSel(null);setAnim(false);setStep(s=>s+1);
    },350);
  },[anim,step]);

  const scores=step>totalQ?calc(Object.values(answers)):null;
  const hen=scores?calcHensachi(scores):null;
  const rankInfo=hen?getRank(hen.total):null;
  const insight=hen?getInsight(hen.axes):null;

  /* ── Supabase: 結果保存 ── */
  const saveResult=useCallback(async()=>{
    if(!supabase||!scores||!hen||!rankInfo)return;
    try{
      const ans=Object.values(answers);
      const clientId=crypto.randomUUID();
      const{error}=await supabase.from('diagnosis_results').insert({
        id:clientId,
        nickname, gender:ans[0],
        q_age:ans[1], q_income:ans[2], q_education:ans[3], q_appearance:ans[4],
        q_hobby:ans[5], q_communication:ans[6], q_priority:ans[7], q_flexibility:ans[8],
        q_timeline:ans[9], q_experience:ans[10], q_satisfaction:ans[11],
        raw_total:hen.rawTotal,
        score_spec:scores.SPEC, score_human:scores.HUMAN, score_literacy:scores.LITERACY,
        score_life:scores.LIFE, score_timing:scores.TIMING,
        hensachi:hen.total,
        hensachi_spec:hen.axes.SPEC, hensachi_human:hen.axes.HUMAN,
        hensachi_literacy:hen.axes.LITERACY, hensachi_life:hen.axes.LIFE, hensachi_timing:hen.axes.TIMING,
        rank:rankInfo.rank,
        user_agent:navigator.userAgent, referrer:document.referrer||null,
      });
      if(!error)setRecordId(clientId);
      else console.error('Supabase insert error:',error);
    }catch(e){console.error('Supabase exception:',e);}
  },[answers,scores,hen,rankInfo,nickname]);

  /* ── Supabase: CTAクリック記録 ── */
  const trackCta=useCallback(async(field)=>{
    if(!supabase||!recordId)return;
    await supabase.from('diagnosis_results').update({[field]:true}).eq('id',recordId);
  },[recordId]);

  /* ── 結果画面遷移時にDB保存 ── */
  useEffect(()=>{
    if(step===totalQ+2&&scores&&hen&&rankInfo&&!recordId){saveResult();}
  },[step,scores,hen,rankInfo,recordId,saveResult,totalQ]);

  /* ── styles ── */
  const wrap={
    minHeight:"100vh",
    background:"linear-gradient(175deg, #FFF5F7 0%, #FFE8EE 30%, #FFF0F3 60%, #FFEAF0 100%)",
    fontFamily:"'Noto Sans JP','Hiragino Sans',sans-serif",
    display:"flex",justifyContent:"center",alignItems:"flex-start",
    padding:"20px 16px",position:"relative",overflow:"hidden",
  };
  const card={
    width:"100%",maxWidth:420,position:"relative",zIndex:1,
    background:"rgba(255,255,255,0.75)",backdropFilter:"blur(16px)",
    borderRadius:24,padding:"28px 22px",
    boxShadow:"0 8px 40px rgba(196,22,122,0.06),0 1px 3px rgba(196,22,122,0.04)",
    border:"1px solid rgba(255,183,197,0.3)",
    opacity:fadeIn?1:0,transform:fadeIn?"translateY(0)":"translateY(14px)",
    transition:"opacity 0.4s ease,transform 0.4s ease",
  };
  const btn=(active)=>({
    width:"100%",padding:"13px 14px",borderRadius:14,
    border:active?"2px solid #E84B8A":"2px solid rgba(255,183,197,0.35)",
    background:active?"rgba(232,75,138,0.06)":"rgba(255,255,255,0.7)",
    color:active?"#C4167A":"#5A3050",fontSize:14,fontWeight:600,
    cursor:"pointer",textAlign:"left",transition:"all 0.2s ease",
    marginBottom:9,fontFamily:"inherit",
    transform:active?"scale(1.02)":"scale(1)",
  });
  const cta={
    width:"100%",padding:"15px",borderRadius:16,border:"none",
    background:"linear-gradient(135deg, #E84B8A, #C4167A)",
    color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",
    fontFamily:"inherit",boxShadow:"0 4px 20px rgba(232,75,138,0.25)",
    letterSpacing:1,
  };
  const sub={fontSize:11,color:"#B08090",textAlign:"center",marginTop:12};

  /* ──── Intro ──── */
  if(step===0){
    return(
      <div style={wrap}>
        <SakuraPetals/>
        <div style={card}>
          {/* torii gate decoration */}
          <div style={{textAlign:"center",marginBottom:4}}>
            <span style={{fontSize:11,color:"#D4527A",letterSpacing:4,fontWeight:700}}>⛩ 縁結び神社 ⛩</span>
          </div>

          <div style={{display:"flex",justifyContent:"center",marginBottom:8}}>
            <img src={IMG.encourage} alt="" style={{width:130,height:130,objectFit:"contain"}}/>
          </div>

          <div style={{textAlign:"center",marginBottom:6}}>
            <Bubble text="あなたの婚活力、診断しちゃうよ！🌸" dir="left"/>
          </div>

          <h1 style={{textAlign:"center",fontSize:21,fontWeight:800,color:"#8B2252",margin:"16px 0 6px",lineHeight:1.4}}>
            結婚市場価値診断
          </h1>
          <p style={{textAlign:"center",fontSize:13,color:"#B0607A",margin:"0 0 18px"}}>
            〜 あなたの"婚活偏差値"を算出 〜
          </p>

          <div style={{background:"rgba(255,183,197,0.12)",borderRadius:14,padding:"14px 16px",marginBottom:18,border:"1px solid rgba(255,183,197,0.2)"}}>
            <p style={{fontSize:13,color:"#6B3050",margin:0,lineHeight:1.8}}>
              かんたんな質問に答えるだけで、<br/>
              あなたの婚活力を可視化して、<br/>
              強み・課題・出会いの可能性をお伝えします✨
            </p>
          </div>

          <button style={cta} onClick={()=>setStep(1)}>
            🌸 診断をはじめる
          </button>
          <p style={sub}>※入会申し込みではありません。無理な勧誘は一切いたしません。</p>
        </div>
      </div>
    );
  }

  /* ──── Questions ──── */
  if(step>=1&&step<=totalQ){
    const qi=step-1;
    const q=QUESTIONS[qi];
    const charImg=Q_CHARS[qi];
    const speech=Q_SPEECH[qi];
    const pct=(step/totalQ)*100;

    return(
      <div style={wrap}>
        <SakuraPetals/>
        <div style={card}>
          {/* progress */}
          <div style={{width:"100%",height:5,background:"rgba(255,183,197,0.2)",borderRadius:3,overflow:"hidden",marginBottom:16}}>
            <div style={{width:`${pct}%`,height:"100%",background:"linear-gradient(90deg,#FFB7C5,#E84B8A)",borderRadius:3,transition:"width 0.4s ease"}}/>
          </div>

          <div style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:14}}>
            <img src={charImg} alt="" style={{width:80,height:80,objectFit:"contain",flexShrink:0}}/>
            <Bubble text={speech} dir="left"/>
          </div>

          <div style={{fontSize:11,color:"#B08090",marginBottom:6,fontWeight:700}}>
            Q{step} / {totalQ}
          </div>
          <h2 style={{fontSize:16,fontWeight:700,color:"#6B2040",margin:"0 0 16px",lineHeight:1.5}}>
            {q.text}
          </h2>

          <div>
            {q.options.map((o,i)=>(
              <button key={i} style={btn(sel===i)} onClick={()=>pick(i)}>
                {o.label}
              </button>
            ))}
          </div>

          {step>1&&(
            <button onClick={()=>setStep(step-1)}
              style={{marginTop:6,background:"none",border:"none",color:"#B08090",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>
              ← 前の質問に戻る
            </button>
          )}
        </div>
      </div>
    );
  }

  /* ──── Nickname ──── */
  if(step===totalQ+1){
    return(
      <div style={wrap}>
        <SakuraPetals/>
        <div style={card}>
          <div style={{display:"flex",justifyContent:"center",marginBottom:10}}>
            <img src={IMG.chibiUp} alt="" style={{width:100,height:100,objectFit:"contain"}}/>
          </div>
          <div style={{textAlign:"center",marginBottom:16}}>
            <Bubble text="全問回答おつかれさま！結果を見てみよう🎀" dir="left"/>
          </div>
          <h2 style={{textAlign:"center",fontSize:17,fontWeight:700,color:"#6B2040",margin:"0 0 6px"}}>
            診断結果を表示します
          </h2>
          <p style={{textAlign:"center",fontSize:13,color:"#B0607A",marginBottom:16}}>
            ニックネームを入力してね
          </p>
          <input type="text" placeholder="例：はな" value={nickname}
            onChange={e=>setNickname(e.target.value)}
            style={{
              width:"100%",boxSizing:"border-box",padding:"13px 14px",borderRadius:14,
              border:"2px solid rgba(255,183,197,0.35)",fontSize:15,fontFamily:"inherit",
              outline:"none",marginBottom:18,background:"rgba(255,255,255,0.8)",
            }}
            onFocus={e=>e.target.style.borderColor="#E84B8A"}
            onBlur={e=>e.target.style.borderColor="rgba(255,183,197,0.35)"}
          />
          <button style={{...cta,opacity:nickname.trim()?1:0.4}}
            disabled={!nickname.trim()}
            onClick={()=>{if(nickname.trim()){setStep(totalQ+2);}}}>
            🌸 結果を見る
          </button>
        </div>
      </div>
    );
  }

  /* ──── Result ──── */
  if(step===totalQ+2&&hen){
    const h=hen.total;
    const stars=h>=65?"★★★★★":h>=57?"★★★★☆":h>=50?"★★★☆☆":h>=43?"★★☆☆☆":"★☆☆☆☆";
    return(
      <div style={wrap}>
        <SakuraPetals/>
        <div style={{...card,padding:"32px 22px"}}>
          {/* header */}
          <div style={{textAlign:"center",marginBottom:4}}>
            <span style={{fontSize:11,color:"#D4527A",letterSpacing:3,fontWeight:700}}>⛩ 診断結果 ⛩</span>
          </div>
          <p style={{textAlign:"center",fontSize:13,color:"#B0607A",margin:"8px 0 4px"}}>{nickname}さんの婚活偏差値</p>

          <div style={{textAlign:"center",position:"relative",margin:"8px 0 16px"}}>
            <div style={{fontSize:60,fontWeight:900,color:rankInfo.color,lineHeight:1,fontFamily:"'Noto Sans JP',sans-serif"}}>
              {hen.total}
            </div>
            <div style={{
              display:"inline-block",background:`${rankInfo.color}12`,color:rankInfo.color,
              padding:"5px 16px",borderRadius:20,fontSize:13,fontWeight:700,letterSpacing:1,
              border:`1.5px solid ${rankInfo.color}25`,marginTop:6,
            }}>
              {rankInfo.emoji} {rankInfo.rank}ランク：{rankInfo.name}
            </div>
          </div>

          {/* character + comment */}
          <div style={{display:"flex",alignItems:"flex-end",gap:10,marginBottom:16,justifyContent:"center"}}>
            <img src={rankInfo.img} alt="" style={{width:90,height:90,objectFit:"contain"}}/>
            <Bubble text={
              h>=65?"すごい！婚活力バッチリだね！✨":
              h>=57?"いい感じ！もう少しで上のランクだよ💪":
              h>=50?"伸びしろたっぷり！一緒に頑張ろう🌸":
              "ここからがスタート！応援してるよ🌱"
            } dir="left"/>
          </div>

          {/* radar */}
          <div style={{display:"flex",justifyContent:"center",margin:"8px 0 16px"}}>
            <Radar scores={scores}/>
          </div>

          {/* bars */}
          <div style={{marginBottom:18}}>
            {AX.map(k=>(
              <div key={k} style={{display:"flex",alignItems:"center",marginBottom:7,gap:7}}>
                <span style={{fontSize:11,color:"#6B3050",width:86,flexShrink:0,fontWeight:700}}>{AX_NAME[k]}</span>
                <div style={{flex:1,height:8,background:"rgba(255,183,197,0.15)",borderRadius:4,overflow:"hidden"}}>
                  <div style={{
                    width:`${Math.max(0,Math.min(100,(hen.axes[k]-25)/50*100))}%`,height:"100%",borderRadius:4,
                    background:k===insight.best?"linear-gradient(90deg,#FFB7C5,#E84B8A)":"rgba(196,22,122,0.2)",
                    transition:"width 0.8s ease",
                  }}/>
                </div>
                <span style={{fontSize:11,color:"#8B5070",fontWeight:700,width:28,textAlign:"right"}}>{hen.axes[k]}</span>
              </div>
            ))}
          </div>

          {/* strength */}
          <div style={{background:"rgba(255,183,197,0.1)",borderRadius:14,padding:"16px 14px",marginBottom:12,border:"1px solid rgba(255,183,197,0.2)"}}>
            <p style={{fontSize:12,fontWeight:700,color:"#C4167A",margin:"0 0 4px"}}>🌸 あなたの強み</p>
            <p style={{fontSize:13,color:"#5A3050",margin:0,lineHeight:1.7}}>
              {AX_NAME[insight.best]}が{insight.bestV>=60?"非常に高く":"高く"}、婚活市場で大きなアドバンテージになります。この強みを活かした戦略が成婚への近道です。
            </p>
          </div>

          {/* weakness */}
          <div style={{background:"rgba(139,80,112,0.05)",borderRadius:14,padding:"16px 14px",marginBottom:12,border:"1px solid rgba(139,80,112,0.08)"}}>
            <p style={{fontSize:12,fontWeight:700,color:"#8B5070",margin:"0 0 4px"}}>💡 あなたの課題</p>
            <p style={{fontSize:13,color:"#5A3050",margin:0,lineHeight:1.7}}>
              {AX_NAME[insight.worst]}に改善の余地があります。{insight.worstV<=45?"ここを強化するだけで、出会いの可能性が大きく広がります":"少し意識するだけで、さらに上のランクが見えてきます"}。
            </p>
          </div>

          {/* match estimate */}
          <div style={{background:"rgba(107,144,128,0.06)",borderRadius:14,padding:"16px 14px",marginBottom:22,border:"1px solid rgba(107,144,128,0.1)"}}>
            <p style={{fontSize:12,fontWeight:700,color:"#4A7A64",margin:"0 0 4px"}}>💕 相性の良い異性の推定人数</p>
            <p style={{fontSize:20,color:"#6B2040",margin:"0 0 3px",letterSpacing:3}}>{stars}</p>
            <p style={{fontSize:11,color:"#B08090",margin:0}}>※具体的な人数は無料相談で詳しくお伝えします</p>
          </div>

          {/* CTA */}
          <div style={{display:"flex",alignItems:"flex-end",gap:8,marginBottom:12,justifyContent:"center"}}>
            <img src={IMG.guide} alt="" style={{width:60,height:60,objectFit:"contain"}}/>
            <Bubble text="あなたに合った婚活プラン、一緒に考えよう！" dir="left"/>
          </div>

          <button style={cta} onClick={()=>trackCta('clicked_cta')}>
            🌸 アドバイザーに相談してみる
          </button>
          <p style={sub}>※無理な勧誘は一切いたしません</p>

          <button onClick={()=>trackCta('clicked_line')} style={{
            width:"100%",padding:"14px",borderRadius:16,border:"none",marginTop:14,
            background:"#06C755",color:"#fff",fontSize:15,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",
            boxShadow:"0 4px 16px rgba(6,199,85,0.25)",letterSpacing:0.5,
            display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.271.173-.508.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>
            LINE 友だち追加
          </button>

          <div style={{marginTop:18,textAlign:"center"}}>
            <button onClick={()=>{setStep(0);setAnswers({});setNickname("");setRecordId(null);}}
              style={{background:"none",border:"none",color:"#B08090",fontSize:12,cursor:"pointer",fontFamily:"inherit",textDecoration:"underline"}}>
              もう一度診断する
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
