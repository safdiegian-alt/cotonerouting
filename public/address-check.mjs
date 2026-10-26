const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const words=s=>norm(s).split(' ').filter(Boolean);
function similar(a,b){if(a===b)return true;if(Math.min(a.length,b.length)<5)return false;const dp=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)dp[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return dp[a.length][b.length]<=(Math.min(a.length,b.length)>=7?2:1);}
export function addressMismatch(candidate,address,city){
 if(candidate.countryCode!=='AR')return 'El resultado no corresponde a Argentina';
 const clean=norm(address).split(/\b(?:piso|depto|departamento|nave|alt|altura)\b/)[0];const number=clean.match(/\b\d{2,6}\b/);if(!number)return 'Falta una altura identificable en la dirección';
 if(String(candidate.streetNumber)!==number[0])return `La altura devuelta por Google (${candidate.streetNumber||'sin altura'}) no coincide con ${number[0]}`;
 const requestedStreet=words(clean.slice(0,number.index)).filter(w=>!['av','avda','avenida','calle','dr','doctor','gral','general','del','de','la','el','los','las'].includes(w));const actualStreet=words(candidate.streetName);
 if(requestedStreet.length&&!requestedStreet.every(w=>actualStreet.some(a=>similar(w,a))))return 'La calle devuelta por Google no coincide con la escrita';
 let requested=norm(city||'');if(!requested&&/\bcaba\b|ciudad autonoma|cdad autonoma/.test(norm(address)))requested='caba';
 const areas=norm((candidate.localities||[]).join(' '));const caba=/\bcaba\b|capital federal|ciudad autonoma|cdad autonoma/.test(requested);
 if(caba&&!/ciudad autonoma|caba|buenos aires autonomous/.test(areas))return 'La dirección indica CABA, pero Google devolvió otra localidad';
 if(requested&&!caba){const significant=words(requested).filter(w=>!['buenos','aires','aire','argentina','de','del','la','el','c'].includes(w));const available=words(areas);if(significant.some(w=>!available.some(a=>similar(w,a))))return `Google no encontró la dirección en ${city}`;}
 if(candidate.locationType==='APPROXIMATE'||!candidate.streetName)return 'Google no pudo identificar una dirección con precisión suficiente';
 return '';
}
