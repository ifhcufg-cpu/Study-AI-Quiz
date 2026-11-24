
export default async function handler(req,res){
if(req.method!=="POST")return res.status(405).json({error:"POST 요청만 지원합니다."});
if(!process.env.OPENAI_API_KEY)return res.status(500).json({error:"Vercel 환경변수 OPENAI_API_KEY를 설정해야 실제 AI 기능이 작동합니다."});
try{
const {images,count=10,level="adaptive",type="mixed",subject=""}=req.body||{};
if(!Array.isArray(images)||!images.length||images.length>8)return res.status(400).json({error:"사진을 1~8장 올려 주세요."});
const n=Math.min(20,Math.max(1,Number(count)||10));
const content=[{type:"input_text",text:`고등학교 학습 퀴즈 출제자 역할. 첨부 사진을 정확히 읽고 자료에 실제로 있는 내용만으로 ${n}개 문제를 만들어라. 과목:${subject||"자료에서 판단"}. 난이도:${level}. 유형:${type}. 객관식은 보기 4개와 단일정답, OX는 O/X, 단답형은 짧은 정답. 자료에 없는 정보 추측 금지. 개념을 골고루 출제하고 해설 포함. JSON만 출력: {"questions":[{"type":"choice|ox|short","question":"문제","options":[{"label":"보기","value":"A"}],"answer":"A","answerLabel":"정답","explanation":"해설"}]}. OX 보기는 O/X, 단답형 options는 []. answer는 선택지 value와 정확히 일치.`}];
for(const im of images)content.push({type:"input_image",image_url:im,detail:"high"});
const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",input:[{role:"user",content}],text:{format:{type:"json_object"}},max_output_tokens:7000})});
const p=await r.json();if(!r.ok)throw Error(p.error?.message||"AI 요청 실패");
const raw=(p.output||[]).flatMap(x=>x.content||[]).find(x=>x.type==="output_text")?.text;if(!raw)throw Error("문제를 생성하지 못했습니다. 사진을 더 선명하게 올려 주세요.");
const data=JSON.parse(raw),questions=(data.questions||[]).slice(0,n).filter(q=>["choice","ox","short"].includes(q.type)&&typeof q.question==="string"&&typeof q.answer==="string");
if(!questions.length)throw Error("유효한 문제가 생성되지 않았습니다.");return res.status(200).json({questions});
}catch(e){return res.status(500).json({error:e.message||"오류가 발생했습니다."})}}
