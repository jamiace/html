
window.addEventListener('DOMContentLoaded',()=>{
  const links=document.querySelectorAll('.nav a');
  const here=(location.pathname.split('/').pop()||'index.html');
  links.forEach(a=>{ if(a.getAttribute('href')===here) a.classList.add('active'); });
});
