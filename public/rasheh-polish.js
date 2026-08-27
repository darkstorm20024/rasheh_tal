/* Rasheh UI polish: light theme, language switcher, animated fields, correct navigation */
(() => {
  const style = document.createElement('style');
  style.textContent = `
    :root{--b:#f7fafc;--p:#fff;--l:#d7e3ed;--g:#d49a12;--m:#526579;--w:#163451}
    body{background:linear-gradient(180deg,#fff 0%,#f5f9fc 60%,#edf5fa 100%)!important;color:var(--w)!important}
    .auth{background:linear-gradient(135deg,#fff,#eff7fb)!important}.box,.card{background:#fff!important;border-color:#d7e3ed!important;box-shadow:0 10px 30px rgba(20,55,85,.07)!important}
    input,textarea,select{background:#fff!important;color:#163451!important;border:1px solid #cbdbe7!important;transition:transform .2s,border-color .2s,box-shadow .2s!important}
    input:hover,textarea:hover,select:hover{border-color:#d49a12!important;transform:translateY(-1px)}
    input:focus,textarea:focus,select:focus{border-color:#d49a12!important;box-shadow:0 0 0 4px rgba(212,154,18,.16)!important;outline:0!important}
    .tabs button,.nav button,.adminnav button{background:#edf4f8!important;color:#425f78!important}.tabs .on,.nav .on{background:linear-gradient(135deg,#ffe883,#d49a12)!important;color:#26394a!important}
    .dark{background:#eaf3f8!important;color:#163451!important;border:1px solid #cbdbe7!important}.hero{background:radial-gradient(circle at 50% 0,#fff8e3,#f7fbfd 67%)!important}
    .trust,.footer,.head{border-color:#dce7ef!important}.trust,.logos,.footer,.muted{color:#526579!important}.video{background:linear-gradient(135deg,#edf8fb,#fff8df)!important;border-color:#d6e4eb!important}
    .pill,.match{background:#fff8e4!important;border-color:#ead18a!important;color:#87600a!important}.featured{border-color:#dbad34!important}.price{color:#b47d09!important}
    .brand:before{content:'ر';display:inline-grid;place-items:center;width:34px;height:34px;margin-left:8px;vertical-align:middle;border-radius:11px;background:linear-gradient(135deg,#ffec8d,#d99a12);color:#26394a;font-size:21px;font-weight:900;box-shadow:0 4px 12px rgba(214,154,18,.26)}
    .lang-switch{background:#fff;border:1px solid #d6e3ec;color:#294965;border-radius:9px;padding:8px 10px;font-weight:700;margin-inline:8px}.lang-switch:hover{background:#fff7df}
    .match{font-weight:800}.score-high{color:#087a58!important;background:#e3faef!important;border-color:#94dfbd!important}.score-mid{color:#87600a!important}.score-low{color:#315c88!important;background:#eaf3ff!important;border-color:#b9d5ef!important}
  `;
  document.head.appendChild(style);

  const translations = {
    'الرئيسية':'Home','المطابقة والترشيح':'Candidate Matching','الباقات':'Plans','لوحة الإدارة':'Admin Dashboard','تسجيل الدخول':'Log in','حساب جديد +2 CV':'New account +2 CV','دخول':'Log in','إنشاء الحساب':'Create account','ابدأ البحث والمطابقة ←':'Start candidate matching ←','المطابقة والترشيح الذكي':'Smart candidate matching','بحث فوري 🚀':'Search now 🚀','المرشحون المطابقون:':'Matching candidates:','باقات شحن رصيد السير الذاتية':'CV credit plans','اختر الباقة المناسبة لشركتك':'Choose the right plan','لوحة إدارة منصة رَشّح':'Rasheh Admin Dashboard','الإحصاءات':'Statistics','الصفحة الرئيسية والمقالات':'Homepage & articles','روابط التواصل والبنك':'Social links & bank','الشركات':'Companies','طلبات CV':'CV requests','المرشحون':'Candidates','السير المفتوحة':'Unlocked CVs','المدينة':'City','الخبرة':'Experience','المهارات':'Skills','المسمى الوظيفي':'Job title','فتح بيانات التواصل — 1 CV':'Unlock contact details — 1 CV'
  };
  function walk(node, reverse=false){
    for(const child of [...node.childNodes]){
      if(child.nodeType===3){const v=child.nodeValue.trim();if(v){const map=reverse?Object.fromEntries(Object.entries(translations).map(([a,b])=>[b,a])):translations;if(map[v])child.nodeValue=child.nodeValue.replace(v,map[v]);}}
      else if(child.nodeType===1 && !['SCRIPT','STYLE','TEXTAREA'].includes(child.tagName))walk(child,reverse);
    }
  }
  let english=false;
  function setLanguage(){
    walk(document.body,english); english=!english;
    document.documentElement.lang=english?'en':'ar';document.documentElement.dir=english?'ltr':'rtl';
    const b=document.querySelector('.lang-switch');if(b)b.textContent=english?'العربية':'English';
  }
  function addSwitcher(){
    const head=document.querySelector('.head');if(!head)return;
    const b=document.createElement('button');b.className='lang-switch';b.textContent='English';b.type='button';b.onclick=setLanguage;
    const credit=document.getElementById('credit');if(credit)credit.parentNode.insertBefore(b,credit);else head.appendChild(b);
  }
  function navFor(page){
    const nav=[...document.querySelectorAll('.nav button')];
    const ar={home:'الرئيسية',search:'المطابقة والترشيح',plans:'الباقات',admin:'لوحة الإدارة'};
    return nav.find(x=>x.textContent.trim()===ar[page] || x.textContent.trim()===translations[ar[page]]);
  }
  const originalGo=window.go;
  window.go=function(page,button){
    if(typeof originalGo==='function') originalGo(page,button||navFor(page));
    document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('on'));
    const target=button||navFor(page);if(target)target.classList.add('on');
    window.scrollTo({top:0,behavior:'smooth'});
    if(page==='search')setTimeout(()=>document.getElementById('job')?.focus(),250);
  };
  const oldSearch=window.search;
  window.search=async function(){
    await oldSearch();
    document.querySelectorAll('.match').forEach(el=>{
      const n=parseInt(el.textContent,10);if(!Number.isNaN(n)){el.classList.remove('score-high','score-mid','score-low');el.classList.add(n>=85?'score-high':n>=70?'score-mid':'score-low');}
    });
  };
  document.addEventListener('DOMContentLoaded',addSwitcher);
  if(document.readyState!=='loading')addSwitcher();
})();
