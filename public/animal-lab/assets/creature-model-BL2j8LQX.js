const dS="181",Qr={ROTATE:0,DOLLY:1,PAN:2},jr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Ap=0,Tu=1,Rp=2,wf=1,Cp=2,Es=3,er=0,xi=1,As=2,Ls=0,Jr=1,Au=2,Ru=3,Cu=4,Lp=5,pr=100,Pp=101,Dp=102,Ip=103,Up=104,Np=200,Op=201,Fp=202,kp=203,Bl=204,Vl=205,zp=206,Bp=207,Vp=208,Hp=209,Gp=210,Wp=211,Xp=212,qp=213,Yp=214,Hl=0,Gl=1,Wl=2,ao=3,Xl=4,ql=5,Yl=6,jl=7,Tf=0,jp=1,$p=2,tr=0,Kp=1,Zp=2,Qp=3,Jp=4,tm=5,em=6,nm=7,Lu="attached",im="detached",Af=300,co=301,lo=302,$l=303,Kl=304,Rc=306,Zl=1e3,Rs=1001,Ql=1002,Ai=1003,sm=1004,ya=1005,Bi=1006,Wc=1007,gr=1008,hs=1009,Rf=1010,Cf=1011,ia=1012,Hh=1013,br=1014,zi=1015,_o=1016,Gh=1017,Wh=1018,to=1020,Lf=35902,Pf=35899,Df=1021,If=1022,Vi=1023,ho=1026,eo=1027,Xh=1028,qh=1029,Yh=1030,jh=1031,$h=1033,ac=33776,cc=33777,lc=33778,hc=33779,Jl=35840,th=35841,eh=35842,nh=35843,ih=36196,sh=37492,rh=37496,oh=37808,ah=37809,ch=37810,lh=37811,hh=37812,uh=37813,dh=37814,fh=37815,ph=37816,mh=37817,gh=37818,xh=37819,_h=37820,bh=37821,Mh=36492,vh=36494,yh=36495,Sh=36283,Eh=36284,wh=36285,Th=36286,rm=3200,om=3201,Uf=0,am=1,Ks="",ki="srgb",uo="srgb-linear",gc="linear",un="srgb",Rr=7680,Pu=519,cm=512,lm=513,hm=514,Nf=515,um=516,dm=517,fm=518,pm=519,Du=35044,fS=35048,Iu="300 es",ls=2e3,xc=2001;function Of(n){for(let t=n.length-1;t>=0;--t)if(n[t]>=65535)return!0;return!1}function _c(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function mm(){const n=_c("canvas");return n.style.display="block",n}const Uu={};function Nu(...n){const t="THREE."+n.shift();console.log(t,...n)}function ve(...n){const t="THREE."+n.shift();console.warn(t,...n)}function Cn(...n){const t="THREE."+n.shift();console.error(t,...n)}function sa(...n){const t=n.join(" ");t in Uu||(Uu[t]=!0,ve(...n))}function gm(n,t,e){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(t,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,e);break;default:i()}}setTimeout(r,e)})}class vr{addEventListener(t,e){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[t]===void 0&&(i[t]=[]),i[t].indexOf(e)===-1&&i[t].push(e)}hasEventListener(t,e){const i=this._listeners;return i===void 0?!1:i[t]!==void 0&&i[t].indexOf(e)!==-1}removeEventListener(t,e){const i=this._listeners;if(i===void 0)return;const s=i[t];if(s!==void 0){const r=s.indexOf(e);r!==-1&&s.splice(r,1)}}dispatchEvent(t){const e=this._listeners;if(e===void 0)return;const i=e[t.type];if(i!==void 0){t.target=this;const s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,t);t.target=null}}}const Qn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Ou=1234567;const $o=Math.PI/180,ra=180/Math.PI;function yr(){const n=Math.random()*4294967295|0,t=Math.random()*4294967295|0,e=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Qn[n&255]+Qn[n>>8&255]+Qn[n>>16&255]+Qn[n>>24&255]+"-"+Qn[t&255]+Qn[t>>8&255]+"-"+Qn[t>>16&15|64]+Qn[t>>24&255]+"-"+Qn[e&63|128]+Qn[e>>8&255]+"-"+Qn[e>>16&255]+Qn[e>>24&255]+Qn[i&255]+Qn[i>>8&255]+Qn[i>>16&255]+Qn[i>>24&255]).toLowerCase()}function Ve(n,t,e){return Math.max(t,Math.min(e,n))}function Kh(n,t){return(n%t+t)%t}function xm(n,t,e,i,s){return i+(n-t)*(s-i)/(e-t)}function _m(n,t,e){return n!==t?(e-n)/(t-n):0}function Ko(n,t,e){return(1-e)*n+e*t}function bm(n,t,e,i){return Ko(n,t,1-Math.exp(-e*i))}function Mm(n,t=1){return t-Math.abs(Kh(n,t*2)-t)}function vm(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*(3-2*n))}function ym(n,t,e){return n<=t?0:n>=e?1:(n=(n-t)/(e-t),n*n*n*(n*(n*6-15)+10))}function Sm(n,t){return n+Math.floor(Math.random()*(t-n+1))}function Em(n,t){return n+Math.random()*(t-n)}function wm(n){return n*(.5-Math.random())}function Tm(n){n!==void 0&&(Ou=n);let t=Ou+=1831565813;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}function Am(n){return n*$o}function Rm(n){return n*ra}function Cm(n){return(n&n-1)===0&&n!==0}function Lm(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Pm(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Dm(n,t,e,i,s){const r=Math.cos,o=Math.sin,a=r(e/2),l=o(e/2),c=r((t+i)/2),u=o((t+i)/2),d=r((t-i)/2),p=o((t-i)/2),m=r((i-t)/2),g=o((i-t)/2);switch(s){case"XYX":n.set(a*u,l*d,l*p,a*c);break;case"YZY":n.set(l*p,a*u,l*d,a*c);break;case"ZXZ":n.set(l*d,l*p,a*u,a*c);break;case"XZX":n.set(a*u,l*g,l*m,a*c);break;case"YXY":n.set(l*m,a*u,l*g,a*c);break;case"ZYZ":n.set(l*g,l*m,a*u,a*c);break;default:ve("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Xr(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function ri(n,t){switch(t.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Im={DEG2RAD:$o,RAD2DEG:ra,generateUUID:yr,clamp:Ve,euclideanModulo:Kh,mapLinear:xm,inverseLerp:_m,lerp:Ko,damp:bm,pingpong:Mm,smoothstep:vm,smootherstep:ym,randInt:Sm,randFloat:Em,randFloatSpread:wm,seededRandom:Tm,degToRad:Am,radToDeg:Rm,isPowerOfTwo:Cm,ceilPowerOfTwo:Lm,floorPowerOfTwo:Pm,setQuaternionFromProperEuler:Dm,normalize:ri,denormalize:Xr};class Ne{constructor(t=0,e=0){Ne.prototype.isVector2=!0,this.x=t,this.y=e}get width(){return this.x}set width(t){this.x=t}get height(){return this.y}set height(t){this.y=t}set(t,e){return this.x=t,this.y=e,this}setScalar(t){return this.x=t,this.y=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y)}copy(t){return this.x=t.x,this.y=t.y,this}add(t){return this.x+=t.x,this.y+=t.y,this}addScalar(t){return this.x+=t,this.y+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this}subScalar(t){return this.x-=t,this.y-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this}multiply(t){return this.x*=t.x,this.y*=t.y,this}multiplyScalar(t){return this.x*=t,this.y*=t,this}divide(t){return this.x/=t.x,this.y/=t.y,this}divideScalar(t){return this.multiplyScalar(1/t)}applyMatrix3(t){const e=this.x,i=this.y,s=t.elements;return this.x=s[0]*e+s[3]*i+s[6],this.y=s[1]*e+s[4]*i+s[7],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this}clamp(t,e){return this.x=Ve(this.x,t.x,e.x),this.y=Ve(this.y,t.y,e.y),this}clampScalar(t,e){return this.x=Ve(this.x,t,e),this.y=Ve(this.y,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ve(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(t){return this.x*t.x+this.y*t.y}cross(t){return this.x*t.y-this.y*t.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Ve(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y;return e*e+i*i}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this}equals(t){return t.x===this.x&&t.y===this.y}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this}rotateAround(t,e){const i=Math.cos(e),s=Math.sin(e),r=this.x-t.x,o=this.y-t.y;return this.x=r*i-o*s+t.x,this.y=r*s+o*i+t.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class fn{constructor(t=0,e=0,i=0,s=1){this.isQuaternion=!0,this._x=t,this._y=e,this._z=i,this._w=s}static slerpFlat(t,e,i,s,r,o,a){let l=i[s+0],c=i[s+1],u=i[s+2],d=i[s+3],p=r[o+0],m=r[o+1],g=r[o+2],x=r[o+3];if(a<=0){t[e+0]=l,t[e+1]=c,t[e+2]=u,t[e+3]=d;return}if(a>=1){t[e+0]=p,t[e+1]=m,t[e+2]=g,t[e+3]=x;return}if(d!==x||l!==p||c!==m||u!==g){let f=l*p+c*m+u*g+d*x;f<0&&(p=-p,m=-m,g=-g,x=-x,f=-f);let h=1-a;if(f<.9995){const M=Math.acos(f),_=Math.sin(M);h=Math.sin(h*M)/_,a=Math.sin(a*M)/_,l=l*h+p*a,c=c*h+m*a,u=u*h+g*a,d=d*h+x*a}else{l=l*h+p*a,c=c*h+m*a,u=u*h+g*a,d=d*h+x*a;const M=1/Math.sqrt(l*l+c*c+u*u+d*d);l*=M,c*=M,u*=M,d*=M}}t[e]=l,t[e+1]=c,t[e+2]=u,t[e+3]=d}static multiplyQuaternionsFlat(t,e,i,s,r,o){const a=i[s],l=i[s+1],c=i[s+2],u=i[s+3],d=r[o],p=r[o+1],m=r[o+2],g=r[o+3];return t[e]=a*g+u*d+l*m-c*p,t[e+1]=l*g+u*p+c*d-a*m,t[e+2]=c*g+u*m+a*p-l*d,t[e+3]=u*g-a*d-l*p-c*m,t}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get w(){return this._w}set w(t){this._w=t,this._onChangeCallback()}set(t,e,i,s){return this._x=t,this._y=e,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(t){return this._x=t.x,this._y=t.y,this._z=t.z,this._w=t.w,this._onChangeCallback(),this}setFromEuler(t,e=!0){const i=t._x,s=t._y,r=t._z,o=t._order,a=Math.cos,l=Math.sin,c=a(i/2),u=a(s/2),d=a(r/2),p=l(i/2),m=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=p*u*d+c*m*g,this._y=c*m*d-p*u*g,this._z=c*u*g+p*m*d,this._w=c*u*d-p*m*g;break;case"YXZ":this._x=p*u*d+c*m*g,this._y=c*m*d-p*u*g,this._z=c*u*g-p*m*d,this._w=c*u*d+p*m*g;break;case"ZXY":this._x=p*u*d-c*m*g,this._y=c*m*d+p*u*g,this._z=c*u*g+p*m*d,this._w=c*u*d-p*m*g;break;case"ZYX":this._x=p*u*d-c*m*g,this._y=c*m*d+p*u*g,this._z=c*u*g-p*m*d,this._w=c*u*d+p*m*g;break;case"YZX":this._x=p*u*d+c*m*g,this._y=c*m*d+p*u*g,this._z=c*u*g-p*m*d,this._w=c*u*d-p*m*g;break;case"XZY":this._x=p*u*d-c*m*g,this._y=c*m*d-p*u*g,this._z=c*u*g+p*m*d,this._w=c*u*d+p*m*g;break;default:ve("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return e===!0&&this._onChangeCallback(),this}setFromAxisAngle(t,e){const i=e/2,s=Math.sin(i);return this._x=t.x*s,this._y=t.y*s,this._z=t.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(t){const e=t.elements,i=e[0],s=e[4],r=e[8],o=e[1],a=e[5],l=e[9],c=e[2],u=e[6],d=e[10],p=i+a+d;if(p>0){const m=.5/Math.sqrt(p+1);this._w=.25/m,this._x=(u-l)*m,this._y=(r-c)*m,this._z=(o-s)*m}else if(i>a&&i>d){const m=2*Math.sqrt(1+i-a-d);this._w=(u-l)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(r+c)/m}else if(a>d){const m=2*Math.sqrt(1+a-i-d);this._w=(r-c)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(l+u)/m}else{const m=2*Math.sqrt(1+d-i-a);this._w=(o-s)/m,this._x=(r+c)/m,this._y=(l+u)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(t,e){let i=t.dot(e)+1;return i<1e-8?(i=0,Math.abs(t.x)>Math.abs(t.z)?(this._x=-t.y,this._y=t.x,this._z=0,this._w=i):(this._x=0,this._y=-t.z,this._z=t.y,this._w=i)):(this._x=t.y*e.z-t.z*e.y,this._y=t.z*e.x-t.x*e.z,this._z=t.x*e.y-t.y*e.x,this._w=i),this.normalize()}angleTo(t){return 2*Math.acos(Math.abs(Ve(this.dot(t),-1,1)))}rotateTowards(t,e){const i=this.angleTo(t);if(i===0)return this;const s=Math.min(1,e/i);return this.slerp(t,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(t){return this._x*t._x+this._y*t._y+this._z*t._z+this._w*t._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let t=this.length();return t===0?(this._x=0,this._y=0,this._z=0,this._w=1):(t=1/t,this._x=this._x*t,this._y=this._y*t,this._z=this._z*t,this._w=this._w*t),this._onChangeCallback(),this}multiply(t){return this.multiplyQuaternions(this,t)}premultiply(t){return this.multiplyQuaternions(t,this)}multiplyQuaternions(t,e){const i=t._x,s=t._y,r=t._z,o=t._w,a=e._x,l=e._y,c=e._z,u=e._w;return this._x=i*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-i*c,this._z=r*u+o*c+i*l-s*a,this._w=o*u-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(t,e){if(e<=0)return this;if(e>=1)return this.copy(t);let i=t._x,s=t._y,r=t._z,o=t._w,a=this.dot(t);a<0&&(i=-i,s=-s,r=-r,o=-o,a=-a);let l=1-e;if(a<.9995){const c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,e=Math.sin(e*c)/u,this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this._onChangeCallback()}else this._x=this._x*l+i*e,this._y=this._y*l+s*e,this._z=this._z*l+r*e,this._w=this._w*l+o*e,this.normalize();return this}slerpQuaternions(t,e,i){return this.copy(t).slerp(e,i)}random(){const t=2*Math.PI*Math.random(),e=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(t),s*Math.cos(t),r*Math.sin(e),r*Math.cos(e))}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._w===this._w}fromArray(t,e=0){return this._x=t[e],this._y=t[e+1],this._z=t[e+2],this._w=t[e+3],this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._w,t}fromBufferAttribute(t,e){return this._x=t.getX(e),this._y=t.getY(e),this._z=t.getZ(e),this._w=t.getW(e),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class dt{constructor(t=0,e=0,i=0){dt.prototype.isVector3=!0,this.x=t,this.y=e,this.z=i}set(t,e,i){return i===void 0&&(i=this.z),this.x=t,this.y=e,this.z=i,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this}multiplyVectors(t,e){return this.x=t.x*e.x,this.y=t.y*e.y,this.z=t.z*e.z,this}applyEuler(t){return this.applyQuaternion(Fu.setFromEuler(t))}applyAxisAngle(t,e){return this.applyQuaternion(Fu.setFromAxisAngle(t,e))}applyMatrix3(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[3]*i+r[6]*s,this.y=r[1]*e+r[4]*i+r[7]*s,this.z=r[2]*e+r[5]*i+r[8]*s,this}applyNormalMatrix(t){return this.applyMatrix3(t).normalize()}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=t.elements,o=1/(r[3]*e+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*e+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*e+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*e+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(t){const e=this.x,i=this.y,s=this.z,r=t.x,o=t.y,a=t.z,l=t.w,c=2*(o*s-a*i),u=2*(a*e-r*s),d=2*(r*i-o*e);return this.x=e+l*c+o*d-a*u,this.y=i+l*u+a*c-r*d,this.z=s+l*d+r*u-o*c,this}project(t){return this.applyMatrix4(t.matrixWorldInverse).applyMatrix4(t.projectionMatrix)}unproject(t){return this.applyMatrix4(t.projectionMatrixInverse).applyMatrix4(t.matrixWorld)}transformDirection(t){const e=this.x,i=this.y,s=this.z,r=t.elements;return this.x=r[0]*e+r[4]*i+r[8]*s,this.y=r[1]*e+r[5]*i+r[9]*s,this.z=r[2]*e+r[6]*i+r[10]*s,this.normalize()}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this}divideScalar(t){return this.multiplyScalar(1/t)}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this}clamp(t,e){return this.x=Ve(this.x,t.x,e.x),this.y=Ve(this.y,t.y,e.y),this.z=Ve(this.z,t.z,e.z),this}clampScalar(t,e){return this.x=Ve(this.x,t,e),this.y=Ve(this.y,t,e),this.z=Ve(this.z,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ve(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this}cross(t){return this.crossVectors(this,t)}crossVectors(t,e){const i=t.x,s=t.y,r=t.z,o=e.x,a=e.y,l=e.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(t){const e=t.lengthSq();if(e===0)return this.set(0,0,0);const i=t.dot(this)/e;return this.copy(t).multiplyScalar(i)}projectOnPlane(t){return Xc.copy(this).projectOnVector(t),this.sub(Xc)}reflect(t){return this.sub(Xc.copy(t).multiplyScalar(2*this.dot(t)))}angleTo(t){const e=Math.sqrt(this.lengthSq()*t.lengthSq());if(e===0)return Math.PI/2;const i=this.dot(t)/e;return Math.acos(Ve(i,-1,1))}distanceTo(t){return Math.sqrt(this.distanceToSquared(t))}distanceToSquared(t){const e=this.x-t.x,i=this.y-t.y,s=this.z-t.z;return e*e+i*i+s*s}manhattanDistanceTo(t){return Math.abs(this.x-t.x)+Math.abs(this.y-t.y)+Math.abs(this.z-t.z)}setFromSpherical(t){return this.setFromSphericalCoords(t.radius,t.phi,t.theta)}setFromSphericalCoords(t,e,i){const s=Math.sin(e)*t;return this.x=s*Math.sin(i),this.y=Math.cos(e)*t,this.z=s*Math.cos(i),this}setFromCylindrical(t){return this.setFromCylindricalCoords(t.radius,t.theta,t.y)}setFromCylindricalCoords(t,e,i){return this.x=t*Math.sin(e),this.y=i,this.z=t*Math.cos(e),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this}setFromMatrixScale(t){const e=this.setFromMatrixColumn(t,0).length(),i=this.setFromMatrixColumn(t,1).length(),s=this.setFromMatrixColumn(t,2).length();return this.x=e,this.y=i,this.z=s,this}setFromMatrixColumn(t,e){return this.fromArray(t.elements,e*4)}setFromMatrix3Column(t,e){return this.fromArray(t.elements,e*3)}setFromEuler(t){return this.x=t._x,this.y=t._y,this.z=t._z,this}setFromColor(t){return this.x=t.r,this.y=t.g,this.z=t.b,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const t=Math.random()*Math.PI*2,e=Math.random()*2-1,i=Math.sqrt(1-e*e);return this.x=i*Math.cos(t),this.y=e,this.z=i*Math.sin(t),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Xc=new dt,Fu=new fn;class Ue{constructor(t,e,i,s,r,o,a,l,c){Ue.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c)}set(t,e,i,s,r,o,a,l,c){const u=this.elements;return u[0]=t,u[1]=s,u[2]=a,u[3]=e,u[4]=r,u[5]=l,u[6]=i,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],this}extractBasis(t,e,i){return t.setFromMatrix3Column(this,0),e.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(t){const e=t.elements;return this.set(e[0],e[4],e[8],e[1],e[5],e[9],e[2],e[6],e[10]),this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],u=i[4],d=i[7],p=i[2],m=i[5],g=i[8],x=s[0],f=s[3],h=s[6],M=s[1],_=s[4],b=s[7],S=s[2],y=s[5],E=s[8];return r[0]=o*x+a*M+l*S,r[3]=o*f+a*_+l*y,r[6]=o*h+a*b+l*E,r[1]=c*x+u*M+d*S,r[4]=c*f+u*_+d*y,r[7]=c*h+u*b+d*E,r[2]=p*x+m*M+g*S,r[5]=p*f+m*_+g*y,r[8]=p*h+m*b+g*E,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[3]*=t,e[6]*=t,e[1]*=t,e[4]*=t,e[7]*=t,e[2]*=t,e[5]*=t,e[8]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8];return e*o*u-e*a*c-i*r*u+i*a*l+s*r*c-s*o*l}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8],d=u*o-a*c,p=a*l-u*r,m=c*r-o*l,g=e*d+i*p+s*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return t[0]=d*x,t[1]=(s*c-u*i)*x,t[2]=(a*i-s*o)*x,t[3]=p*x,t[4]=(u*e-s*l)*x,t[5]=(s*r-a*e)*x,t[6]=m*x,t[7]=(i*l-c*e)*x,t[8]=(o*e-i*r)*x,this}transpose(){let t;const e=this.elements;return t=e[1],e[1]=e[3],e[3]=t,t=e[2],e[2]=e[6],e[6]=t,t=e[5],e[5]=e[7],e[7]=t,this}getNormalMatrix(t){return this.setFromMatrix4(t).invert().transpose()}transposeIntoArray(t){const e=this.elements;return t[0]=e[0],t[1]=e[3],t[2]=e[6],t[3]=e[1],t[4]=e[4],t[5]=e[7],t[6]=e[2],t[7]=e[5],t[8]=e[8],this}setUvTransform(t,e,i,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+t,-s*c,s*l,-s*(-c*o+l*a)+a+e,0,0,1),this}scale(t,e){return this.premultiply(qc.makeScale(t,e)),this}rotate(t){return this.premultiply(qc.makeRotation(-t)),this}translate(t,e){return this.premultiply(qc.makeTranslation(t,e)),this}makeTranslation(t,e){return t.isVector2?this.set(1,0,t.x,0,1,t.y,0,0,1):this.set(1,0,t,0,1,e,0,0,1),this}makeRotation(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,i,e,0,0,0,1),this}makeScale(t,e){return this.set(t,0,0,0,e,0,0,0,1),this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<9;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<9;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t}clone(){return new this.constructor().fromArray(this.elements)}}const qc=new Ue,ku=new Ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),zu=new Ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Um(){const n={enabled:!0,workingColorSpace:uo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===un&&(s.r=Ps(s.r),s.g=Ps(s.g),s.b=Ps(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===un&&(s.r=no(s.r),s.g=no(s.g),s.b=no(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Ks?gc:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return sa("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return sa("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},t=[.64,.33,.3,.6,.15,.06],e=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[uo]:{primaries:t,whitePoint:i,transfer:gc,toXYZ:ku,fromXYZ:zu,luminanceCoefficients:e,workingColorSpaceConfig:{unpackColorSpace:ki},outputColorSpaceConfig:{drawingBufferColorSpace:ki}},[ki]:{primaries:t,whitePoint:i,transfer:un,toXYZ:ku,fromXYZ:zu,luminanceCoefficients:e,outputColorSpaceConfig:{drawingBufferColorSpace:ki}}}),n}const en=Um();function Ps(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function no(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Cr;class Nm{static getDataURL(t,e="image/png"){if(/^data:/i.test(t.src)||typeof HTMLCanvasElement>"u")return t.src;let i;if(t instanceof HTMLCanvasElement)i=t;else{Cr===void 0&&(Cr=_c("canvas")),Cr.width=t.width,Cr.height=t.height;const s=Cr.getContext("2d");t instanceof ImageData?s.putImageData(t,0,0):s.drawImage(t,0,0,t.width,t.height),i=Cr}return i.toDataURL(e)}static sRGBToLinear(t){if(typeof HTMLImageElement<"u"&&t instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&t instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&t instanceof ImageBitmap){const e=_c("canvas");e.width=t.width,e.height=t.height;const i=e.getContext("2d");i.drawImage(t,0,0,t.width,t.height);const s=i.getImageData(0,0,t.width,t.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ps(r[o]/255)*255;return i.putImageData(s,0,0),e}else if(t.data){const e=t.data.slice(0);for(let i=0;i<e.length;i++)e instanceof Uint8Array||e instanceof Uint8ClampedArray?e[i]=Math.floor(Ps(e[i]/255)*255):e[i]=Ps(e[i]);return{data:e,width:t.width,height:t.height}}else return ve("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),t}}let Om=0;class Zh{constructor(t=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Om++}),this.uuid=yr(),this.data=t,this.dataReady=!0,this.version=0}getSize(t){const e=this.data;return typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement?t.set(e.videoWidth,e.videoHeight,0):e instanceof VideoFrame?t.set(e.displayHeight,e.displayWidth,0):e!==null?t.set(e.width,e.height,e.depth||0):t.set(0,0,0),t}set needsUpdate(t){t===!0&&this.version++}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.images[this.uuid]!==void 0)return t.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Yc(s[o].image)):r.push(Yc(s[o]))}else r=Yc(s);i.url=r}return e||(t.images[this.uuid]=i),i}}function Yc(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Nm.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(ve("Texture: Unable to serialize Texture."),{})}let Fm=0;const jc=new dt;class ci extends vr{constructor(t=ci.DEFAULT_IMAGE,e=ci.DEFAULT_MAPPING,i=Rs,s=Rs,r=Bi,o=gr,a=Vi,l=hs,c=ci.DEFAULT_ANISOTROPY,u=Ks){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Fm++}),this.uuid=yr(),this.name="",this.source=new Zh(t),this.mipmaps=[],this.mapping=e,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ne(0,0),this.repeat=new Ne(1,1),this.center=new Ne(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(t&&t.depth&&t.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(jc).x}get height(){return this.source.getSize(jc).y}get depth(){return this.source.getSize(jc).z}get image(){return this.source.data}set image(t=null){this.source.data=t}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(t){return this.name=t.name,this.source=t.source,this.mipmaps=t.mipmaps.slice(0),this.mapping=t.mapping,this.channel=t.channel,this.wrapS=t.wrapS,this.wrapT=t.wrapT,this.magFilter=t.magFilter,this.minFilter=t.minFilter,this.anisotropy=t.anisotropy,this.format=t.format,this.internalFormat=t.internalFormat,this.type=t.type,this.offset.copy(t.offset),this.repeat.copy(t.repeat),this.center.copy(t.center),this.rotation=t.rotation,this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrix.copy(t.matrix),this.generateMipmaps=t.generateMipmaps,this.premultiplyAlpha=t.premultiplyAlpha,this.flipY=t.flipY,this.unpackAlignment=t.unpackAlignment,this.colorSpace=t.colorSpace,this.renderTarget=t.renderTarget,this.isRenderTargetTexture=t.isRenderTargetTexture,this.isArrayTexture=t.isArrayTexture,this.userData=JSON.parse(JSON.stringify(t.userData)),this.needsUpdate=!0,this}setValues(t){for(const e in t){const i=t[e];if(i===void 0){ve(`Texture.setValues(): parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){ve(`Texture.setValues(): property '${e}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";if(!e&&t.textures[this.uuid]!==void 0)return t.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(t).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),e||(t.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(t){if(this.mapping!==Af)return t;if(t.applyMatrix3(this.matrix),t.x<0||t.x>1)switch(this.wrapS){case Zl:t.x=t.x-Math.floor(t.x);break;case Rs:t.x=t.x<0?0:1;break;case Ql:Math.abs(Math.floor(t.x)%2)===1?t.x=Math.ceil(t.x)-t.x:t.x=t.x-Math.floor(t.x);break}if(t.y<0||t.y>1)switch(this.wrapT){case Zl:t.y=t.y-Math.floor(t.y);break;case Rs:t.y=t.y<0?0:1;break;case Ql:Math.abs(Math.floor(t.y)%2)===1?t.y=Math.ceil(t.y)-t.y:t.y=t.y-Math.floor(t.y);break}return this.flipY&&(t.y=1-t.y),t}set needsUpdate(t){t===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(t){t===!0&&this.pmremVersion++}}ci.DEFAULT_IMAGE=null;ci.DEFAULT_MAPPING=Af;ci.DEFAULT_ANISOTROPY=1;class Mn{constructor(t=0,e=0,i=0,s=1){Mn.prototype.isVector4=!0,this.x=t,this.y=e,this.z=i,this.w=s}get width(){return this.z}set width(t){this.z=t}get height(){return this.w}set height(t){this.w=t}set(t,e,i,s){return this.x=t,this.y=e,this.z=i,this.w=s,this}setScalar(t){return this.x=t,this.y=t,this.z=t,this.w=t,this}setX(t){return this.x=t,this}setY(t){return this.y=t,this}setZ(t){return this.z=t,this}setW(t){return this.w=t,this}setComponent(t,e){switch(t){case 0:this.x=e;break;case 1:this.y=e;break;case 2:this.z=e;break;case 3:this.w=e;break;default:throw new Error("index is out of range: "+t)}return this}getComponent(t){switch(t){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+t)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(t){return this.x=t.x,this.y=t.y,this.z=t.z,this.w=t.w!==void 0?t.w:1,this}add(t){return this.x+=t.x,this.y+=t.y,this.z+=t.z,this.w+=t.w,this}addScalar(t){return this.x+=t,this.y+=t,this.z+=t,this.w+=t,this}addVectors(t,e){return this.x=t.x+e.x,this.y=t.y+e.y,this.z=t.z+e.z,this.w=t.w+e.w,this}addScaledVector(t,e){return this.x+=t.x*e,this.y+=t.y*e,this.z+=t.z*e,this.w+=t.w*e,this}sub(t){return this.x-=t.x,this.y-=t.y,this.z-=t.z,this.w-=t.w,this}subScalar(t){return this.x-=t,this.y-=t,this.z-=t,this.w-=t,this}subVectors(t,e){return this.x=t.x-e.x,this.y=t.y-e.y,this.z=t.z-e.z,this.w=t.w-e.w,this}multiply(t){return this.x*=t.x,this.y*=t.y,this.z*=t.z,this.w*=t.w,this}multiplyScalar(t){return this.x*=t,this.y*=t,this.z*=t,this.w*=t,this}applyMatrix4(t){const e=this.x,i=this.y,s=this.z,r=this.w,o=t.elements;return this.x=o[0]*e+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*e+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*e+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*e+o[7]*i+o[11]*s+o[15]*r,this}divide(t){return this.x/=t.x,this.y/=t.y,this.z/=t.z,this.w/=t.w,this}divideScalar(t){return this.multiplyScalar(1/t)}setAxisAngleFromQuaternion(t){this.w=2*Math.acos(t.w);const e=Math.sqrt(1-t.w*t.w);return e<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=t.x/e,this.y=t.y/e,this.z=t.z/e),this}setAxisAngleFromRotationMatrix(t){let e,i,s,r;const l=t.elements,c=l[0],u=l[4],d=l[8],p=l[1],m=l[5],g=l[9],x=l[2],f=l[6],h=l[10];if(Math.abs(u-p)<.01&&Math.abs(d-x)<.01&&Math.abs(g-f)<.01){if(Math.abs(u+p)<.1&&Math.abs(d+x)<.1&&Math.abs(g+f)<.1&&Math.abs(c+m+h-3)<.1)return this.set(1,0,0,0),this;e=Math.PI;const _=(c+1)/2,b=(m+1)/2,S=(h+1)/2,y=(u+p)/4,E=(d+x)/4,R=(g+f)/4;return _>b&&_>S?_<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(_),s=y/i,r=E/i):b>S?b<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),i=y/s,r=R/s):S<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(S),i=E/r,s=R/r),this.set(i,s,r,e),this}let M=Math.sqrt((f-g)*(f-g)+(d-x)*(d-x)+(p-u)*(p-u));return Math.abs(M)<.001&&(M=1),this.x=(f-g)/M,this.y=(d-x)/M,this.z=(p-u)/M,this.w=Math.acos((c+m+h-1)/2),this}setFromMatrixPosition(t){const e=t.elements;return this.x=e[12],this.y=e[13],this.z=e[14],this.w=e[15],this}min(t){return this.x=Math.min(this.x,t.x),this.y=Math.min(this.y,t.y),this.z=Math.min(this.z,t.z),this.w=Math.min(this.w,t.w),this}max(t){return this.x=Math.max(this.x,t.x),this.y=Math.max(this.y,t.y),this.z=Math.max(this.z,t.z),this.w=Math.max(this.w,t.w),this}clamp(t,e){return this.x=Ve(this.x,t.x,e.x),this.y=Ve(this.y,t.y,e.y),this.z=Ve(this.z,t.z,e.z),this.w=Ve(this.w,t.w,e.w),this}clampScalar(t,e){return this.x=Ve(this.x,t,e),this.y=Ve(this.y,t,e),this.z=Ve(this.z,t,e),this.w=Ve(this.w,t,e),this}clampLength(t,e){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Ve(i,t,e))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(t){return this.x*t.x+this.y*t.y+this.z*t.z+this.w*t.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(t){return this.normalize().multiplyScalar(t)}lerp(t,e){return this.x+=(t.x-this.x)*e,this.y+=(t.y-this.y)*e,this.z+=(t.z-this.z)*e,this.w+=(t.w-this.w)*e,this}lerpVectors(t,e,i){return this.x=t.x+(e.x-t.x)*i,this.y=t.y+(e.y-t.y)*i,this.z=t.z+(e.z-t.z)*i,this.w=t.w+(e.w-t.w)*i,this}equals(t){return t.x===this.x&&t.y===this.y&&t.z===this.z&&t.w===this.w}fromArray(t,e=0){return this.x=t[e],this.y=t[e+1],this.z=t[e+2],this.w=t[e+3],this}toArray(t=[],e=0){return t[e]=this.x,t[e+1]=this.y,t[e+2]=this.z,t[e+3]=this.w,t}fromBufferAttribute(t,e){return this.x=t.getX(e),this.y=t.getY(e),this.z=t.getZ(e),this.w=t.getW(e),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class km extends vr{constructor(t=1,e=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Bi,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=t,this.height=e,this.depth=i.depth,this.scissor=new Mn(0,0,t,e),this.scissorTest=!1,this.viewport=new Mn(0,0,t,e);const s={width:t,height:e,depth:i.depth},r=new ci(s);this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(t={}){const e={minFilter:Bi,generateMipmaps:!1,flipY:!1,internalFormat:null};t.mapping!==void 0&&(e.mapping=t.mapping),t.wrapS!==void 0&&(e.wrapS=t.wrapS),t.wrapT!==void 0&&(e.wrapT=t.wrapT),t.wrapR!==void 0&&(e.wrapR=t.wrapR),t.magFilter!==void 0&&(e.magFilter=t.magFilter),t.minFilter!==void 0&&(e.minFilter=t.minFilter),t.format!==void 0&&(e.format=t.format),t.type!==void 0&&(e.type=t.type),t.anisotropy!==void 0&&(e.anisotropy=t.anisotropy),t.colorSpace!==void 0&&(e.colorSpace=t.colorSpace),t.flipY!==void 0&&(e.flipY=t.flipY),t.generateMipmaps!==void 0&&(e.generateMipmaps=t.generateMipmaps),t.internalFormat!==void 0&&(e.internalFormat=t.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(e)}get texture(){return this.textures[0]}set texture(t){this.textures[0]=t}set depthTexture(t){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),t!==null&&(t.renderTarget=this),this._depthTexture=t}get depthTexture(){return this._depthTexture}setSize(t,e,i=1){if(this.width!==t||this.height!==e||this.depth!==i){this.width=t,this.height=e,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=t,this.textures[s].image.height=e,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,t,e),this.scissor.set(0,0,t,e)}clone(){return new this.constructor().copy(this)}copy(t){this.width=t.width,this.height=t.height,this.depth=t.depth,this.scissor.copy(t.scissor),this.scissorTest=t.scissorTest,this.viewport.copy(t.viewport),this.textures.length=0;for(let e=0,i=t.textures.length;e<i;e++){this.textures[e]=t.textures[e].clone(),this.textures[e].isRenderTargetTexture=!0,this.textures[e].renderTarget=this;const s=Object.assign({},t.textures[e].image);this.textures[e].source=new Zh(s)}return this.depthBuffer=t.depthBuffer,this.stencilBuffer=t.stencilBuffer,this.resolveDepthBuffer=t.resolveDepthBuffer,this.resolveStencilBuffer=t.resolveStencilBuffer,t.depthTexture!==null&&(this.depthTexture=t.depthTexture.clone()),this.samples=t.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class nr extends km{constructor(t=1,e=1,i={}){super(t,e,i),this.isWebGLRenderTarget=!0}}class Ff extends ci{constructor(t=null,e=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Ai,this.minFilter=Ai,this.wrapR=Rs,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(t){this.layerUpdates.add(t)}clearLayerUpdates(){this.layerUpdates.clear()}}class zm extends ci{constructor(t=null,e=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:t,width:e,height:i,depth:s},this.magFilter=Ai,this.minFilter=Ai,this.wrapR=Rs,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class ir{constructor(t=new dt(1/0,1/0,1/0),e=new dt(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=t,this.max=e}set(t,e){return this.min.copy(t),this.max.copy(e),this}setFromArray(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e+=3)this.expandByPoint(Wi.fromArray(t,e));return this}setFromBufferAttribute(t){this.makeEmpty();for(let e=0,i=t.count;e<i;e++)this.expandByPoint(Wi.fromBufferAttribute(t,e));return this}setFromPoints(t){this.makeEmpty();for(let e=0,i=t.length;e<i;e++)this.expandByPoint(t[e]);return this}setFromCenterAndSize(t,e){const i=Wi.copy(e).multiplyScalar(.5);return this.min.copy(t).sub(i),this.max.copy(t).add(i),this}setFromObject(t,e=!1){return this.makeEmpty(),this.expandByObject(t,e)}clone(){return new this.constructor().copy(this)}copy(t){return this.min.copy(t.min),this.max.copy(t.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(t){return this.isEmpty()?t.set(0,0,0):t.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(t){return this.isEmpty()?t.set(0,0,0):t.subVectors(this.max,this.min)}expandByPoint(t){return this.min.min(t),this.max.max(t),this}expandByVector(t){return this.min.sub(t),this.max.add(t),this}expandByScalar(t){return this.min.addScalar(-t),this.max.addScalar(t),this}expandByObject(t,e=!1){t.updateWorldMatrix(!1,!1);const i=t.geometry;if(i!==void 0){const r=i.getAttribute("position");if(e===!0&&r!==void 0&&t.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)t.isMesh===!0?t.getVertexPosition(o,Wi):Wi.fromBufferAttribute(r,o),Wi.applyMatrix4(t.matrixWorld),this.expandByPoint(Wi);else t.boundingBox!==void 0?(t.boundingBox===null&&t.computeBoundingBox(),Sa.copy(t.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),Sa.copy(i.boundingBox)),Sa.applyMatrix4(t.matrixWorld),this.union(Sa)}const s=t.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],e);return this}containsPoint(t){return t.x>=this.min.x&&t.x<=this.max.x&&t.y>=this.min.y&&t.y<=this.max.y&&t.z>=this.min.z&&t.z<=this.max.z}containsBox(t){return this.min.x<=t.min.x&&t.max.x<=this.max.x&&this.min.y<=t.min.y&&t.max.y<=this.max.y&&this.min.z<=t.min.z&&t.max.z<=this.max.z}getParameter(t,e){return e.set((t.x-this.min.x)/(this.max.x-this.min.x),(t.y-this.min.y)/(this.max.y-this.min.y),(t.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(t){return t.max.x>=this.min.x&&t.min.x<=this.max.x&&t.max.y>=this.min.y&&t.min.y<=this.max.y&&t.max.z>=this.min.z&&t.min.z<=this.max.z}intersectsSphere(t){return this.clampPoint(t.center,Wi),Wi.distanceToSquared(t.center)<=t.radius*t.radius}intersectsPlane(t){let e,i;return t.normal.x>0?(e=t.normal.x*this.min.x,i=t.normal.x*this.max.x):(e=t.normal.x*this.max.x,i=t.normal.x*this.min.x),t.normal.y>0?(e+=t.normal.y*this.min.y,i+=t.normal.y*this.max.y):(e+=t.normal.y*this.max.y,i+=t.normal.y*this.min.y),t.normal.z>0?(e+=t.normal.z*this.min.z,i+=t.normal.z*this.max.z):(e+=t.normal.z*this.max.z,i+=t.normal.z*this.min.z),e<=-t.constant&&i>=-t.constant}intersectsTriangle(t){if(this.isEmpty())return!1;this.getCenter(To),Ea.subVectors(this.max,To),Lr.subVectors(t.a,To),Pr.subVectors(t.b,To),Dr.subVectors(t.c,To),Bs.subVectors(Pr,Lr),Vs.subVectors(Dr,Pr),or.subVectors(Lr,Dr);let e=[0,-Bs.z,Bs.y,0,-Vs.z,Vs.y,0,-or.z,or.y,Bs.z,0,-Bs.x,Vs.z,0,-Vs.x,or.z,0,-or.x,-Bs.y,Bs.x,0,-Vs.y,Vs.x,0,-or.y,or.x,0];return!$c(e,Lr,Pr,Dr,Ea)||(e=[1,0,0,0,1,0,0,0,1],!$c(e,Lr,Pr,Dr,Ea))?!1:(wa.crossVectors(Bs,Vs),e=[wa.x,wa.y,wa.z],$c(e,Lr,Pr,Dr,Ea))}clampPoint(t,e){return e.copy(t).clamp(this.min,this.max)}distanceToPoint(t){return this.clampPoint(t,Wi).distanceTo(t)}getBoundingSphere(t){return this.isEmpty()?t.makeEmpty():(this.getCenter(t.center),t.radius=this.getSize(Wi).length()*.5),t}intersect(t){return this.min.max(t.min),this.max.min(t.max),this.isEmpty()&&this.makeEmpty(),this}union(t){return this.min.min(t.min),this.max.max(t.max),this}applyMatrix4(t){return this.isEmpty()?this:(xs[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(t),xs[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(t),xs[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(t),xs[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(t),xs[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(t),xs[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(t),xs[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(t),xs[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(t),this.setFromPoints(xs),this)}translate(t){return this.min.add(t),this.max.add(t),this}equals(t){return t.min.equals(this.min)&&t.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(t){return this.min.fromArray(t.min),this.max.fromArray(t.max),this}}const xs=[new dt,new dt,new dt,new dt,new dt,new dt,new dt,new dt],Wi=new dt,Sa=new ir,Lr=new dt,Pr=new dt,Dr=new dt,Bs=new dt,Vs=new dt,or=new dt,To=new dt,Ea=new dt,wa=new dt,ar=new dt;function $c(n,t,e,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){ar.fromArray(n,r);const a=s.x*Math.abs(ar.x)+s.y*Math.abs(ar.y)+s.z*Math.abs(ar.z),l=t.dot(ar),c=e.dot(ar),u=i.dot(ar);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Bm=new ir,Ao=new dt,Kc=new dt;class sr{constructor(t=new dt,e=-1){this.isSphere=!0,this.center=t,this.radius=e}set(t,e){return this.center.copy(t),this.radius=e,this}setFromPoints(t,e){const i=this.center;e!==void 0?i.copy(e):Bm.setFromPoints(t).getCenter(i);let s=0;for(let r=0,o=t.length;r<o;r++)s=Math.max(s,i.distanceToSquared(t[r]));return this.radius=Math.sqrt(s),this}copy(t){return this.center.copy(t.center),this.radius=t.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(t){return t.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(t){return t.distanceTo(this.center)-this.radius}intersectsSphere(t){const e=this.radius+t.radius;return t.center.distanceToSquared(this.center)<=e*e}intersectsBox(t){return t.intersectsSphere(this)}intersectsPlane(t){return Math.abs(t.distanceToPoint(this.center))<=this.radius}clampPoint(t,e){const i=this.center.distanceToSquared(t);return e.copy(t),i>this.radius*this.radius&&(e.sub(this.center).normalize(),e.multiplyScalar(this.radius).add(this.center)),e}getBoundingBox(t){return this.isEmpty()?(t.makeEmpty(),t):(t.set(this.center,this.center),t.expandByScalar(this.radius),t)}applyMatrix4(t){return this.center.applyMatrix4(t),this.radius=this.radius*t.getMaxScaleOnAxis(),this}translate(t){return this.center.add(t),this}expandByPoint(t){if(this.isEmpty())return this.center.copy(t),this.radius=0,this;Ao.subVectors(t,this.center);const e=Ao.lengthSq();if(e>this.radius*this.radius){const i=Math.sqrt(e),s=(i-this.radius)*.5;this.center.addScaledVector(Ao,s/i),this.radius+=s}return this}union(t){return t.isEmpty()?this:this.isEmpty()?(this.copy(t),this):(this.center.equals(t.center)===!0?this.radius=Math.max(this.radius,t.radius):(Kc.subVectors(t.center,this.center).setLength(t.radius),this.expandByPoint(Ao.copy(t.center).add(Kc)),this.expandByPoint(Ao.copy(t.center).sub(Kc))),this)}equals(t){return t.center.equals(this.center)&&t.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(t){return this.radius=t.radius,this.center.fromArray(t.center),this}}const _s=new dt,Zc=new dt,Ta=new dt,Hs=new dt,Qc=new dt,Aa=new dt,Jc=new dt;class Cc{constructor(t=new dt,e=new dt(0,0,-1)){this.origin=t,this.direction=e}set(t,e){return this.origin.copy(t),this.direction.copy(e),this}copy(t){return this.origin.copy(t.origin),this.direction.copy(t.direction),this}at(t,e){return e.copy(this.origin).addScaledVector(this.direction,t)}lookAt(t){return this.direction.copy(t).sub(this.origin).normalize(),this}recast(t){return this.origin.copy(this.at(t,_s)),this}closestPointToPoint(t,e){e.subVectors(t,this.origin);const i=e.dot(this.direction);return i<0?e.copy(this.origin):e.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(t){return Math.sqrt(this.distanceSqToPoint(t))}distanceSqToPoint(t){const e=_s.subVectors(t,this.origin).dot(this.direction);return e<0?this.origin.distanceToSquared(t):(_s.copy(this.origin).addScaledVector(this.direction,e),_s.distanceToSquared(t))}distanceSqToSegment(t,e,i,s){Zc.copy(t).add(e).multiplyScalar(.5),Ta.copy(e).sub(t).normalize(),Hs.copy(this.origin).sub(Zc);const r=t.distanceTo(e)*.5,o=-this.direction.dot(Ta),a=Hs.dot(this.direction),l=-Hs.dot(Ta),c=Hs.lengthSq(),u=Math.abs(1-o*o);let d,p,m,g;if(u>0)if(d=o*l-a,p=o*a-l,g=r*u,d>=0)if(p>=-g)if(p<=g){const x=1/u;d*=x,p*=x,m=d*(d+o*p+2*a)+p*(o*d+p+2*l)+c}else p=r,d=Math.max(0,-(o*p+a)),m=-d*d+p*(p+2*l)+c;else p=-r,d=Math.max(0,-(o*p+a)),m=-d*d+p*(p+2*l)+c;else p<=-g?(d=Math.max(0,-(-o*r+a)),p=d>0?-r:Math.min(Math.max(-r,-l),r),m=-d*d+p*(p+2*l)+c):p<=g?(d=0,p=Math.min(Math.max(-r,-l),r),m=p*(p+2*l)+c):(d=Math.max(0,-(o*r+a)),p=d>0?r:Math.min(Math.max(-r,-l),r),m=-d*d+p*(p+2*l)+c);else p=o>0?-r:r,d=Math.max(0,-(o*p+a)),m=-d*d+p*(p+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Zc).addScaledVector(Ta,p),m}intersectSphere(t,e){_s.subVectors(t.center,this.origin);const i=_s.dot(this.direction),s=_s.dot(_s)-i*i,r=t.radius*t.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,e):this.at(a,e)}intersectsSphere(t){return t.radius<0?!1:this.distanceSqToPoint(t.center)<=t.radius*t.radius}distanceToPlane(t){const e=t.normal.dot(this.direction);if(e===0)return t.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(t.normal)+t.constant)/e;return i>=0?i:null}intersectPlane(t,e){const i=this.distanceToPlane(t);return i===null?null:this.at(i,e)}intersectsPlane(t){const e=t.distanceToPoint(this.origin);return e===0||t.normal.dot(this.direction)*e<0}intersectBox(t,e){let i,s,r,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,d=1/this.direction.z,p=this.origin;return c>=0?(i=(t.min.x-p.x)*c,s=(t.max.x-p.x)*c):(i=(t.max.x-p.x)*c,s=(t.min.x-p.x)*c),u>=0?(r=(t.min.y-p.y)*u,o=(t.max.y-p.y)*u):(r=(t.max.y-p.y)*u,o=(t.min.y-p.y)*u),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(t.min.z-p.z)*d,l=(t.max.z-p.z)*d):(a=(t.max.z-p.z)*d,l=(t.min.z-p.z)*d),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,e)}intersectsBox(t){return this.intersectBox(t,_s)!==null}intersectTriangle(t,e,i,s,r){Qc.subVectors(e,t),Aa.subVectors(i,t),Jc.crossVectors(Qc,Aa);let o=this.direction.dot(Jc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Hs.subVectors(this.origin,t);const l=a*this.direction.dot(Aa.crossVectors(Hs,Aa));if(l<0)return null;const c=a*this.direction.dot(Qc.cross(Hs));if(c<0||l+c>o)return null;const u=-a*Hs.dot(Jc);return u<0?null:this.at(u/o,r)}applyMatrix4(t){return this.origin.applyMatrix4(t),this.direction.transformDirection(t),this}equals(t){return t.origin.equals(this.origin)&&t.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class ke{constructor(t,e,i,s,r,o,a,l,c,u,d,p,m,g,x,f){ke.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],t!==void 0&&this.set(t,e,i,s,r,o,a,l,c,u,d,p,m,g,x,f)}set(t,e,i,s,r,o,a,l,c,u,d,p,m,g,x,f){const h=this.elements;return h[0]=t,h[4]=e,h[8]=i,h[12]=s,h[1]=r,h[5]=o,h[9]=a,h[13]=l,h[2]=c,h[6]=u,h[10]=d,h[14]=p,h[3]=m,h[7]=g,h[11]=x,h[15]=f,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new ke().fromArray(this.elements)}copy(t){const e=this.elements,i=t.elements;return e[0]=i[0],e[1]=i[1],e[2]=i[2],e[3]=i[3],e[4]=i[4],e[5]=i[5],e[6]=i[6],e[7]=i[7],e[8]=i[8],e[9]=i[9],e[10]=i[10],e[11]=i[11],e[12]=i[12],e[13]=i[13],e[14]=i[14],e[15]=i[15],this}copyPosition(t){const e=this.elements,i=t.elements;return e[12]=i[12],e[13]=i[13],e[14]=i[14],this}setFromMatrix3(t){const e=t.elements;return this.set(e[0],e[3],e[6],0,e[1],e[4],e[7],0,e[2],e[5],e[8],0,0,0,0,1),this}extractBasis(t,e,i){return t.setFromMatrixColumn(this,0),e.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(t,e,i){return this.set(t.x,e.x,i.x,0,t.y,e.y,i.y,0,t.z,e.z,i.z,0,0,0,0,1),this}extractRotation(t){const e=this.elements,i=t.elements,s=1/Ir.setFromMatrixColumn(t,0).length(),r=1/Ir.setFromMatrixColumn(t,1).length(),o=1/Ir.setFromMatrixColumn(t,2).length();return e[0]=i[0]*s,e[1]=i[1]*s,e[2]=i[2]*s,e[3]=0,e[4]=i[4]*r,e[5]=i[5]*r,e[6]=i[6]*r,e[7]=0,e[8]=i[8]*o,e[9]=i[9]*o,e[10]=i[10]*o,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromEuler(t){const e=this.elements,i=t.x,s=t.y,r=t.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),d=Math.sin(r);if(t.order==="XYZ"){const p=o*u,m=o*d,g=a*u,x=a*d;e[0]=l*u,e[4]=-l*d,e[8]=c,e[1]=m+g*c,e[5]=p-x*c,e[9]=-a*l,e[2]=x-p*c,e[6]=g+m*c,e[10]=o*l}else if(t.order==="YXZ"){const p=l*u,m=l*d,g=c*u,x=c*d;e[0]=p+x*a,e[4]=g*a-m,e[8]=o*c,e[1]=o*d,e[5]=o*u,e[9]=-a,e[2]=m*a-g,e[6]=x+p*a,e[10]=o*l}else if(t.order==="ZXY"){const p=l*u,m=l*d,g=c*u,x=c*d;e[0]=p-x*a,e[4]=-o*d,e[8]=g+m*a,e[1]=m+g*a,e[5]=o*u,e[9]=x-p*a,e[2]=-o*c,e[6]=a,e[10]=o*l}else if(t.order==="ZYX"){const p=o*u,m=o*d,g=a*u,x=a*d;e[0]=l*u,e[4]=g*c-m,e[8]=p*c+x,e[1]=l*d,e[5]=x*c+p,e[9]=m*c-g,e[2]=-c,e[6]=a*l,e[10]=o*l}else if(t.order==="YZX"){const p=o*l,m=o*c,g=a*l,x=a*c;e[0]=l*u,e[4]=x-p*d,e[8]=g*d+m,e[1]=d,e[5]=o*u,e[9]=-a*u,e[2]=-c*u,e[6]=m*d+g,e[10]=p-x*d}else if(t.order==="XZY"){const p=o*l,m=o*c,g=a*l,x=a*c;e[0]=l*u,e[4]=-d,e[8]=c*u,e[1]=p*d+x,e[5]=o*u,e[9]=m*d-g,e[2]=g*d-m,e[6]=a*u,e[10]=x*d+p}return e[3]=0,e[7]=0,e[11]=0,e[12]=0,e[13]=0,e[14]=0,e[15]=1,this}makeRotationFromQuaternion(t){return this.compose(Vm,t,Hm)}lookAt(t,e,i){const s=this.elements;return vi.subVectors(t,e),vi.lengthSq()===0&&(vi.z=1),vi.normalize(),Gs.crossVectors(i,vi),Gs.lengthSq()===0&&(Math.abs(i.z)===1?vi.x+=1e-4:vi.z+=1e-4,vi.normalize(),Gs.crossVectors(i,vi)),Gs.normalize(),Ra.crossVectors(vi,Gs),s[0]=Gs.x,s[4]=Ra.x,s[8]=vi.x,s[1]=Gs.y,s[5]=Ra.y,s[9]=vi.y,s[2]=Gs.z,s[6]=Ra.z,s[10]=vi.z,this}multiply(t){return this.multiplyMatrices(this,t)}premultiply(t){return this.multiplyMatrices(t,this)}multiplyMatrices(t,e){const i=t.elements,s=e.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],u=i[1],d=i[5],p=i[9],m=i[13],g=i[2],x=i[6],f=i[10],h=i[14],M=i[3],_=i[7],b=i[11],S=i[15],y=s[0],E=s[4],R=s[8],w=s[12],T=s[1],C=s[5],I=s[9],F=s[13],V=s[2],Y=s[6],P=s[10],H=s[14],W=s[3],j=s[7],N=s[11],tt=s[15];return r[0]=o*y+a*T+l*V+c*W,r[4]=o*E+a*C+l*Y+c*j,r[8]=o*R+a*I+l*P+c*N,r[12]=o*w+a*F+l*H+c*tt,r[1]=u*y+d*T+p*V+m*W,r[5]=u*E+d*C+p*Y+m*j,r[9]=u*R+d*I+p*P+m*N,r[13]=u*w+d*F+p*H+m*tt,r[2]=g*y+x*T+f*V+h*W,r[6]=g*E+x*C+f*Y+h*j,r[10]=g*R+x*I+f*P+h*N,r[14]=g*w+x*F+f*H+h*tt,r[3]=M*y+_*T+b*V+S*W,r[7]=M*E+_*C+b*Y+S*j,r[11]=M*R+_*I+b*P+S*N,r[15]=M*w+_*F+b*H+S*tt,this}multiplyScalar(t){const e=this.elements;return e[0]*=t,e[4]*=t,e[8]*=t,e[12]*=t,e[1]*=t,e[5]*=t,e[9]*=t,e[13]*=t,e[2]*=t,e[6]*=t,e[10]*=t,e[14]*=t,e[3]*=t,e[7]*=t,e[11]*=t,e[15]*=t,this}determinant(){const t=this.elements,e=t[0],i=t[4],s=t[8],r=t[12],o=t[1],a=t[5],l=t[9],c=t[13],u=t[2],d=t[6],p=t[10],m=t[14],g=t[3],x=t[7],f=t[11],h=t[15];return g*(+r*l*d-s*c*d-r*a*p+i*c*p+s*a*m-i*l*m)+x*(+e*l*m-e*c*p+r*o*p-s*o*m+s*c*u-r*l*u)+f*(+e*c*d-e*a*m-r*o*d+i*o*m+r*a*u-i*c*u)+h*(-s*a*u-e*l*d+e*a*p+s*o*d-i*o*p+i*l*u)}transpose(){const t=this.elements;let e;return e=t[1],t[1]=t[4],t[4]=e,e=t[2],t[2]=t[8],t[8]=e,e=t[6],t[6]=t[9],t[9]=e,e=t[3],t[3]=t[12],t[12]=e,e=t[7],t[7]=t[13],t[13]=e,e=t[11],t[11]=t[14],t[14]=e,this}setPosition(t,e,i){const s=this.elements;return t.isVector3?(s[12]=t.x,s[13]=t.y,s[14]=t.z):(s[12]=t,s[13]=e,s[14]=i),this}invert(){const t=this.elements,e=t[0],i=t[1],s=t[2],r=t[3],o=t[4],a=t[5],l=t[6],c=t[7],u=t[8],d=t[9],p=t[10],m=t[11],g=t[12],x=t[13],f=t[14],h=t[15],M=d*f*c-x*p*c+x*l*m-a*f*m-d*l*h+a*p*h,_=g*p*c-u*f*c-g*l*m+o*f*m+u*l*h-o*p*h,b=u*x*c-g*d*c+g*a*m-o*x*m-u*a*h+o*d*h,S=g*d*l-u*x*l-g*a*p+o*x*p+u*a*f-o*d*f,y=e*M+i*_+s*b+r*S;if(y===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/y;return t[0]=M*E,t[1]=(x*p*r-d*f*r-x*s*m+i*f*m+d*s*h-i*p*h)*E,t[2]=(a*f*r-x*l*r+x*s*c-i*f*c-a*s*h+i*l*h)*E,t[3]=(d*l*r-a*p*r-d*s*c+i*p*c+a*s*m-i*l*m)*E,t[4]=_*E,t[5]=(u*f*r-g*p*r+g*s*m-e*f*m-u*s*h+e*p*h)*E,t[6]=(g*l*r-o*f*r-g*s*c+e*f*c+o*s*h-e*l*h)*E,t[7]=(o*p*r-u*l*r+u*s*c-e*p*c-o*s*m+e*l*m)*E,t[8]=b*E,t[9]=(g*d*r-u*x*r-g*i*m+e*x*m+u*i*h-e*d*h)*E,t[10]=(o*x*r-g*a*r+g*i*c-e*x*c-o*i*h+e*a*h)*E,t[11]=(u*a*r-o*d*r-u*i*c+e*d*c+o*i*m-e*a*m)*E,t[12]=S*E,t[13]=(u*x*s-g*d*s+g*i*p-e*x*p-u*i*f+e*d*f)*E,t[14]=(g*a*s-o*x*s-g*i*l+e*x*l+o*i*f-e*a*f)*E,t[15]=(o*d*s-u*a*s+u*i*l-e*d*l-o*i*p+e*a*p)*E,this}scale(t){const e=this.elements,i=t.x,s=t.y,r=t.z;return e[0]*=i,e[4]*=s,e[8]*=r,e[1]*=i,e[5]*=s,e[9]*=r,e[2]*=i,e[6]*=s,e[10]*=r,e[3]*=i,e[7]*=s,e[11]*=r,this}getMaxScaleOnAxis(){const t=this.elements,e=t[0]*t[0]+t[1]*t[1]+t[2]*t[2],i=t[4]*t[4]+t[5]*t[5]+t[6]*t[6],s=t[8]*t[8]+t[9]*t[9]+t[10]*t[10];return Math.sqrt(Math.max(e,i,s))}makeTranslation(t,e,i){return t.isVector3?this.set(1,0,0,t.x,0,1,0,t.y,0,0,1,t.z,0,0,0,1):this.set(1,0,0,t,0,1,0,e,0,0,1,i,0,0,0,1),this}makeRotationX(t){const e=Math.cos(t),i=Math.sin(t);return this.set(1,0,0,0,0,e,-i,0,0,i,e,0,0,0,0,1),this}makeRotationY(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,0,i,0,0,1,0,0,-i,0,e,0,0,0,0,1),this}makeRotationZ(t){const e=Math.cos(t),i=Math.sin(t);return this.set(e,-i,0,0,i,e,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(t,e){const i=Math.cos(e),s=Math.sin(e),r=1-i,o=t.x,a=t.y,l=t.z,c=r*o,u=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+i,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(t,e,i){return this.set(t,0,0,0,0,e,0,0,0,0,i,0,0,0,0,1),this}makeShear(t,e,i,s,r,o){return this.set(1,i,r,0,t,1,o,0,e,s,1,0,0,0,0,1),this}compose(t,e,i){const s=this.elements,r=e._x,o=e._y,a=e._z,l=e._w,c=r+r,u=o+o,d=a+a,p=r*c,m=r*u,g=r*d,x=o*u,f=o*d,h=a*d,M=l*c,_=l*u,b=l*d,S=i.x,y=i.y,E=i.z;return s[0]=(1-(x+h))*S,s[1]=(m+b)*S,s[2]=(g-_)*S,s[3]=0,s[4]=(m-b)*y,s[5]=(1-(p+h))*y,s[6]=(f+M)*y,s[7]=0,s[8]=(g+_)*E,s[9]=(f-M)*E,s[10]=(1-(p+x))*E,s[11]=0,s[12]=t.x,s[13]=t.y,s[14]=t.z,s[15]=1,this}decompose(t,e,i){const s=this.elements;let r=Ir.set(s[0],s[1],s[2]).length();const o=Ir.set(s[4],s[5],s[6]).length(),a=Ir.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),t.x=s[12],t.y=s[13],t.z=s[14],Xi.copy(this);const c=1/r,u=1/o,d=1/a;return Xi.elements[0]*=c,Xi.elements[1]*=c,Xi.elements[2]*=c,Xi.elements[4]*=u,Xi.elements[5]*=u,Xi.elements[6]*=u,Xi.elements[8]*=d,Xi.elements[9]*=d,Xi.elements[10]*=d,e.setFromRotationMatrix(Xi),i.x=r,i.y=o,i.z=a,this}makePerspective(t,e,i,s,r,o,a=ls,l=!1){const c=this.elements,u=2*r/(e-t),d=2*r/(i-s),p=(e+t)/(e-t),m=(i+s)/(i-s);let g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===ls)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===xc)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=p,c[12]=0,c[1]=0,c[5]=d,c[9]=m,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(t,e,i,s,r,o,a=ls,l=!1){const c=this.elements,u=2/(e-t),d=2/(i-s),p=-(e+t)/(e-t),m=-(i+s)/(i-s);let g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===ls)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===xc)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=p,c[1]=0,c[5]=d,c[9]=0,c[13]=m,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(t){const e=this.elements,i=t.elements;for(let s=0;s<16;s++)if(e[s]!==i[s])return!1;return!0}fromArray(t,e=0){for(let i=0;i<16;i++)this.elements[i]=t[i+e];return this}toArray(t=[],e=0){const i=this.elements;return t[e]=i[0],t[e+1]=i[1],t[e+2]=i[2],t[e+3]=i[3],t[e+4]=i[4],t[e+5]=i[5],t[e+6]=i[6],t[e+7]=i[7],t[e+8]=i[8],t[e+9]=i[9],t[e+10]=i[10],t[e+11]=i[11],t[e+12]=i[12],t[e+13]=i[13],t[e+14]=i[14],t[e+15]=i[15],t}}const Ir=new dt,Xi=new ke,Vm=new dt(0,0,0),Hm=new dt(1,1,1),Gs=new dt,Ra=new dt,vi=new dt,Bu=new ke,Vu=new fn;class us{constructor(t=0,e=0,i=0,s=us.DEFAULT_ORDER){this.isEuler=!0,this._x=t,this._y=e,this._z=i,this._order=s}get x(){return this._x}set x(t){this._x=t,this._onChangeCallback()}get y(){return this._y}set y(t){this._y=t,this._onChangeCallback()}get z(){return this._z}set z(t){this._z=t,this._onChangeCallback()}get order(){return this._order}set order(t){this._order=t,this._onChangeCallback()}set(t,e,i,s=this._order){return this._x=t,this._y=e,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(t){return this._x=t._x,this._y=t._y,this._z=t._z,this._order=t._order,this._onChangeCallback(),this}setFromRotationMatrix(t,e=this._order,i=!0){const s=t.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],d=s[2],p=s[6],m=s[10];switch(e){case"XYZ":this._y=Math.asin(Ve(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(p,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ve(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ve(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-d,m),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ve(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(p,m),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ve(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Ve(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(p,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,m),this._y=0);break;default:ve("Euler: .setFromRotationMatrix() encountered an unknown order: "+e)}return this._order=e,i===!0&&this._onChangeCallback(),this}setFromQuaternion(t,e,i){return Bu.makeRotationFromQuaternion(t),this.setFromRotationMatrix(Bu,e,i)}setFromVector3(t,e=this._order){return this.set(t.x,t.y,t.z,e)}reorder(t){return Vu.setFromEuler(this),this.setFromQuaternion(Vu,t)}equals(t){return t._x===this._x&&t._y===this._y&&t._z===this._z&&t._order===this._order}fromArray(t){return this._x=t[0],this._y=t[1],this._z=t[2],t[3]!==void 0&&(this._order=t[3]),this._onChangeCallback(),this}toArray(t=[],e=0){return t[e]=this._x,t[e+1]=this._y,t[e+2]=this._z,t[e+3]=this._order,t}_onChange(t){return this._onChangeCallback=t,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}us.DEFAULT_ORDER="XYZ";class kf{constructor(){this.mask=1}set(t){this.mask=(1<<t|0)>>>0}enable(t){this.mask|=1<<t|0}enableAll(){this.mask=-1}toggle(t){this.mask^=1<<t|0}disable(t){this.mask&=~(1<<t|0)}disableAll(){this.mask=0}test(t){return(this.mask&t.mask)!==0}isEnabled(t){return(this.mask&(1<<t|0))!==0}}let Gm=0;const Hu=new dt,Ur=new fn,bs=new ke,Ca=new dt,Ro=new dt,Wm=new dt,Xm=new fn,Gu=new dt(1,0,0),Wu=new dt(0,1,0),Xu=new dt(0,0,1),qu={type:"added"},qm={type:"removed"},Nr={type:"childadded",child:null},tl={type:"childremoved",child:null};class zn extends vr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Gm++}),this.uuid=yr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=zn.DEFAULT_UP.clone();const t=new dt,e=new us,i=new fn,s=new dt(1,1,1);function r(){i.setFromEuler(e,!1)}function o(){e.setFromQuaternion(i,void 0,!1)}e._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:t},rotation:{configurable:!0,enumerable:!0,value:e},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ke},normalMatrix:{value:new Ue}}),this.matrix=new ke,this.matrixWorld=new ke,this.matrixAutoUpdate=zn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=zn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new kf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(t){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(t),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(t){return this.quaternion.premultiply(t),this}setRotationFromAxisAngle(t,e){this.quaternion.setFromAxisAngle(t,e)}setRotationFromEuler(t){this.quaternion.setFromEuler(t,!0)}setRotationFromMatrix(t){this.quaternion.setFromRotationMatrix(t)}setRotationFromQuaternion(t){this.quaternion.copy(t)}rotateOnAxis(t,e){return Ur.setFromAxisAngle(t,e),this.quaternion.multiply(Ur),this}rotateOnWorldAxis(t,e){return Ur.setFromAxisAngle(t,e),this.quaternion.premultiply(Ur),this}rotateX(t){return this.rotateOnAxis(Gu,t)}rotateY(t){return this.rotateOnAxis(Wu,t)}rotateZ(t){return this.rotateOnAxis(Xu,t)}translateOnAxis(t,e){return Hu.copy(t).applyQuaternion(this.quaternion),this.position.add(Hu.multiplyScalar(e)),this}translateX(t){return this.translateOnAxis(Gu,t)}translateY(t){return this.translateOnAxis(Wu,t)}translateZ(t){return this.translateOnAxis(Xu,t)}localToWorld(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(this.matrixWorld)}worldToLocal(t){return this.updateWorldMatrix(!0,!1),t.applyMatrix4(bs.copy(this.matrixWorld).invert())}lookAt(t,e,i){t.isVector3?Ca.copy(t):Ca.set(t,e,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Ro.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?bs.lookAt(Ro,Ca,this.up):bs.lookAt(Ca,Ro,this.up),this.quaternion.setFromRotationMatrix(bs),s&&(bs.extractRotation(s.matrixWorld),Ur.setFromRotationMatrix(bs),this.quaternion.premultiply(Ur.invert()))}add(t){if(arguments.length>1){for(let e=0;e<arguments.length;e++)this.add(arguments[e]);return this}return t===this?(Cn("Object3D.add: object can't be added as a child of itself.",t),this):(t&&t.isObject3D?(t.removeFromParent(),t.parent=this,this.children.push(t),t.dispatchEvent(qu),Nr.child=t,this.dispatchEvent(Nr),Nr.child=null):Cn("Object3D.add: object not an instance of THREE.Object3D.",t),this)}remove(t){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const e=this.children.indexOf(t);return e!==-1&&(t.parent=null,this.children.splice(e,1),t.dispatchEvent(qm),tl.child=t,this.dispatchEvent(tl),tl.child=null),this}removeFromParent(){const t=this.parent;return t!==null&&t.remove(this),this}clear(){return this.remove(...this.children)}attach(t){return this.updateWorldMatrix(!0,!1),bs.copy(this.matrixWorld).invert(),t.parent!==null&&(t.parent.updateWorldMatrix(!0,!1),bs.multiply(t.parent.matrixWorld)),t.applyMatrix4(bs),t.removeFromParent(),t.parent=this,this.children.push(t),t.updateWorldMatrix(!1,!0),t.dispatchEvent(qu),Nr.child=t,this.dispatchEvent(Nr),Nr.child=null,this}getObjectById(t){return this.getObjectByProperty("id",t)}getObjectByName(t){return this.getObjectByProperty("name",t)}getObjectByProperty(t,e){if(this[t]===e)return this;for(let i=0,s=this.children.length;i<s;i++){const o=this.children[i].getObjectByProperty(t,e);if(o!==void 0)return o}}getObjectsByProperty(t,e,i=[]){this[t]===e&&i.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(t,e,i);return i}getWorldPosition(t){return this.updateWorldMatrix(!0,!1),t.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ro,t,Wm),t}getWorldScale(t){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ro,Xm,t),t}getWorldDirection(t){this.updateWorldMatrix(!0,!1);const e=this.matrixWorld.elements;return t.set(e[8],e[9],e[10]).normalize()}raycast(){}traverse(t){t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverse(t)}traverseVisible(t){if(this.visible===!1)return;t(this);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].traverseVisible(t)}traverseAncestors(t){const e=this.parent;e!==null&&(t(e),e.traverseAncestors(t))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(t){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||t)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,t=!0);const e=this.children;for(let i=0,s=e.length;i<s;i++)e[i].updateMatrixWorld(t)}updateWorldMatrix(t,e){const i=this.parent;if(t===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),e===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(t){const e=t===void 0||typeof t=="string",i={};e&&(t={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(t),s.indirectTexture=this._indirectTexture.toJSON(t),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(t)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(t)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(t).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(t).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(t.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const d=l[c];r(t.shapes,d)}else r(t.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(t.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(t.materials,this.material[l]));s.material=a}else s.material=r(t.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(t).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(t.animations,l))}}if(e){const a=o(t.geometries),l=o(t.materials),c=o(t.textures),u=o(t.images),d=o(t.shapes),p=o(t.skeletons),m=o(t.animations),g=o(t.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),d.length>0&&(i.shapes=d),p.length>0&&(i.skeletons=p),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=s,i;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(t){return new this.constructor().copy(this,t)}copy(t,e=!0){if(this.name=t.name,this.up.copy(t.up),this.position.copy(t.position),this.rotation.order=t.rotation.order,this.quaternion.copy(t.quaternion),this.scale.copy(t.scale),this.matrix.copy(t.matrix),this.matrixWorld.copy(t.matrixWorld),this.matrixAutoUpdate=t.matrixAutoUpdate,this.matrixWorldAutoUpdate=t.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=t.matrixWorldNeedsUpdate,this.layers.mask=t.layers.mask,this.visible=t.visible,this.castShadow=t.castShadow,this.receiveShadow=t.receiveShadow,this.frustumCulled=t.frustumCulled,this.renderOrder=t.renderOrder,this.animations=t.animations.slice(),this.userData=JSON.parse(JSON.stringify(t.userData)),e===!0)for(let i=0;i<t.children.length;i++){const s=t.children[i];this.add(s.clone())}return this}}zn.DEFAULT_UP=new dt(0,1,0);zn.DEFAULT_MATRIX_AUTO_UPDATE=!0;zn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const qi=new dt,Ms=new dt,el=new dt,vs=new dt,Or=new dt,Fr=new dt,Yu=new dt,nl=new dt,il=new dt,sl=new dt,rl=new Mn,ol=new Mn,al=new Mn;class $i{constructor(t=new dt,e=new dt,i=new dt){this.a=t,this.b=e,this.c=i}static getNormal(t,e,i,s){s.subVectors(i,e),qi.subVectors(t,e),s.cross(qi);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(t,e,i,s,r){qi.subVectors(s,e),Ms.subVectors(i,e),el.subVectors(t,e);const o=qi.dot(qi),a=qi.dot(Ms),l=qi.dot(el),c=Ms.dot(Ms),u=Ms.dot(el),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;const p=1/d,m=(c*l-a*u)*p,g=(o*u-a*l)*p;return r.set(1-m-g,g,m)}static containsPoint(t,e,i,s){return this.getBarycoord(t,e,i,s,vs)===null?!1:vs.x>=0&&vs.y>=0&&vs.x+vs.y<=1}static getInterpolation(t,e,i,s,r,o,a,l){return this.getBarycoord(t,e,i,s,vs)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,vs.x),l.addScaledVector(o,vs.y),l.addScaledVector(a,vs.z),l)}static getInterpolatedAttribute(t,e,i,s,r,o){return rl.setScalar(0),ol.setScalar(0),al.setScalar(0),rl.fromBufferAttribute(t,e),ol.fromBufferAttribute(t,i),al.fromBufferAttribute(t,s),o.setScalar(0),o.addScaledVector(rl,r.x),o.addScaledVector(ol,r.y),o.addScaledVector(al,r.z),o}static isFrontFacing(t,e,i,s){return qi.subVectors(i,e),Ms.subVectors(t,e),qi.cross(Ms).dot(s)<0}set(t,e,i){return this.a.copy(t),this.b.copy(e),this.c.copy(i),this}setFromPointsAndIndices(t,e,i,s){return this.a.copy(t[e]),this.b.copy(t[i]),this.c.copy(t[s]),this}setFromAttributeAndIndices(t,e,i,s){return this.a.fromBufferAttribute(t,e),this.b.fromBufferAttribute(t,i),this.c.fromBufferAttribute(t,s),this}clone(){return new this.constructor().copy(this)}copy(t){return this.a.copy(t.a),this.b.copy(t.b),this.c.copy(t.c),this}getArea(){return qi.subVectors(this.c,this.b),Ms.subVectors(this.a,this.b),qi.cross(Ms).length()*.5}getMidpoint(t){return t.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(t){return $i.getNormal(this.a,this.b,this.c,t)}getPlane(t){return t.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(t,e){return $i.getBarycoord(t,this.a,this.b,this.c,e)}getInterpolation(t,e,i,s,r){return $i.getInterpolation(t,this.a,this.b,this.c,e,i,s,r)}containsPoint(t){return $i.containsPoint(t,this.a,this.b,this.c)}isFrontFacing(t){return $i.isFrontFacing(this.a,this.b,this.c,t)}intersectsBox(t){return t.intersectsTriangle(this)}closestPointToPoint(t,e){const i=this.a,s=this.b,r=this.c;let o,a;Or.subVectors(s,i),Fr.subVectors(r,i),nl.subVectors(t,i);const l=Or.dot(nl),c=Fr.dot(nl);if(l<=0&&c<=0)return e.copy(i);il.subVectors(t,s);const u=Or.dot(il),d=Fr.dot(il);if(u>=0&&d<=u)return e.copy(s);const p=l*d-u*c;if(p<=0&&l>=0&&u<=0)return o=l/(l-u),e.copy(i).addScaledVector(Or,o);sl.subVectors(t,r);const m=Or.dot(sl),g=Fr.dot(sl);if(g>=0&&m<=g)return e.copy(r);const x=m*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),e.copy(i).addScaledVector(Fr,a);const f=u*g-m*d;if(f<=0&&d-u>=0&&m-g>=0)return Yu.subVectors(r,s),a=(d-u)/(d-u+(m-g)),e.copy(s).addScaledVector(Yu,a);const h=1/(f+x+p);return o=x*h,a=p*h,e.copy(i).addScaledVector(Or,o).addScaledVector(Fr,a)}equals(t){return t.a.equals(this.a)&&t.b.equals(this.b)&&t.c.equals(this.c)}}const zf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Ws={h:0,s:0,l:0},La={h:0,s:0,l:0};function cl(n,t,e){return e<0&&(e+=1),e>1&&(e-=1),e<1/6?n+(t-n)*6*e:e<1/2?t:e<2/3?n+(t-n)*6*(2/3-e):n}class He{constructor(t,e,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(t,e,i)}set(t,e,i){if(e===void 0&&i===void 0){const s=t;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(t,e,i);return this}setScalar(t){return this.r=t,this.g=t,this.b=t,this}setHex(t,e=ki){return t=Math.floor(t),this.r=(t>>16&255)/255,this.g=(t>>8&255)/255,this.b=(t&255)/255,en.colorSpaceToWorking(this,e),this}setRGB(t,e,i,s=en.workingColorSpace){return this.r=t,this.g=e,this.b=i,en.colorSpaceToWorking(this,s),this}setHSL(t,e,i,s=en.workingColorSpace){if(t=Kh(t,1),e=Ve(e,0,1),i=Ve(i,0,1),e===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+e):i+e-i*e,o=2*i-r;this.r=cl(o,r,t+1/3),this.g=cl(o,r,t),this.b=cl(o,r,t-1/3)}return en.colorSpaceToWorking(this,s),this}setStyle(t,e=ki){function i(r){r!==void 0&&parseFloat(r)<1&&ve("Color: Alpha component of "+t+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(t)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,e);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,e);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,e);break;default:ve("Color: Unknown color model "+t)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(t)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,e);if(o===6)return this.setHex(parseInt(r,16),e);ve("Color: Invalid hex color "+t)}else if(t&&t.length>0)return this.setColorName(t,e);return this}setColorName(t,e=ki){const i=zf[t.toLowerCase()];return i!==void 0?this.setHex(i,e):ve("Color: Unknown color "+t),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(t){return this.r=t.r,this.g=t.g,this.b=t.b,this}copySRGBToLinear(t){return this.r=Ps(t.r),this.g=Ps(t.g),this.b=Ps(t.b),this}copyLinearToSRGB(t){return this.r=no(t.r),this.g=no(t.g),this.b=no(t.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(t=ki){return en.workingToColorSpace(Jn.copy(this),t),Math.round(Ve(Jn.r*255,0,255))*65536+Math.round(Ve(Jn.g*255,0,255))*256+Math.round(Ve(Jn.b*255,0,255))}getHexString(t=ki){return("000000"+this.getHex(t).toString(16)).slice(-6)}getHSL(t,e=en.workingColorSpace){en.workingToColorSpace(Jn.copy(this),e);const i=Jn.r,s=Jn.g,r=Jn.b,o=Math.max(i,s,r),a=Math.min(i,s,r);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const d=o-a;switch(c=u<=.5?d/(o+a):d/(2-o-a),o){case i:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-i)/d+2;break;case r:l=(i-s)/d+4;break}l/=6}return t.h=l,t.s=c,t.l=u,t}getRGB(t,e=en.workingColorSpace){return en.workingToColorSpace(Jn.copy(this),e),t.r=Jn.r,t.g=Jn.g,t.b=Jn.b,t}getStyle(t=ki){en.workingToColorSpace(Jn.copy(this),t);const e=Jn.r,i=Jn.g,s=Jn.b;return t!==ki?`color(${t} ${e.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(e*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(t,e,i){return this.getHSL(Ws),this.setHSL(Ws.h+t,Ws.s+e,Ws.l+i)}add(t){return this.r+=t.r,this.g+=t.g,this.b+=t.b,this}addColors(t,e){return this.r=t.r+e.r,this.g=t.g+e.g,this.b=t.b+e.b,this}addScalar(t){return this.r+=t,this.g+=t,this.b+=t,this}sub(t){return this.r=Math.max(0,this.r-t.r),this.g=Math.max(0,this.g-t.g),this.b=Math.max(0,this.b-t.b),this}multiply(t){return this.r*=t.r,this.g*=t.g,this.b*=t.b,this}multiplyScalar(t){return this.r*=t,this.g*=t,this.b*=t,this}lerp(t,e){return this.r+=(t.r-this.r)*e,this.g+=(t.g-this.g)*e,this.b+=(t.b-this.b)*e,this}lerpColors(t,e,i){return this.r=t.r+(e.r-t.r)*i,this.g=t.g+(e.g-t.g)*i,this.b=t.b+(e.b-t.b)*i,this}lerpHSL(t,e){this.getHSL(Ws),t.getHSL(La);const i=Ko(Ws.h,La.h,e),s=Ko(Ws.s,La.s,e),r=Ko(Ws.l,La.l,e);return this.setHSL(i,s,r),this}setFromVector3(t){return this.r=t.x,this.g=t.y,this.b=t.z,this}applyMatrix3(t){const e=this.r,i=this.g,s=this.b,r=t.elements;return this.r=r[0]*e+r[3]*i+r[6]*s,this.g=r[1]*e+r[4]*i+r[7]*s,this.b=r[2]*e+r[5]*i+r[8]*s,this}equals(t){return t.r===this.r&&t.g===this.g&&t.b===this.b}fromArray(t,e=0){return this.r=t[e],this.g=t[e+1],this.b=t[e+2],this}toArray(t=[],e=0){return t[e]=this.r,t[e+1]=this.g,t[e+2]=this.b,t}fromBufferAttribute(t,e){return this.r=t.getX(e),this.g=t.getY(e),this.b=t.getZ(e),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Jn=new He;He.NAMES=zf;let Ym=0;class bo extends vr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Ym++}),this.uuid=yr(),this.name="",this.type="Material",this.blending=Jr,this.side=er,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Bl,this.blendDst=Vl,this.blendEquation=pr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new He(0,0,0),this.blendAlpha=0,this.depthFunc=ao,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Pu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Rr,this.stencilZFail=Rr,this.stencilZPass=Rr,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(t){this._alphaTest>0!=t>0&&this.version++,this._alphaTest=t}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(t){if(t!==void 0)for(const e in t){const i=t[e];if(i===void 0){ve(`Material: parameter '${e}' has value of undefined.`);continue}const s=this[e];if(s===void 0){ve(`Material: '${e}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[e]=i}}toJSON(t){const e=t===void 0||typeof t=="string";e&&(t={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(t).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(t).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(t).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(t).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(t).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(t).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(t).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(t).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(t).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(t).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(t).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(t).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(t).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(t).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(t).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(t).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(t).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(t).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(t).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(t).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(t).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(t).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(t).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(t).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(t).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(t).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Jr&&(i.blending=this.blending),this.side!==er&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==Bl&&(i.blendSrc=this.blendSrc),this.blendDst!==Vl&&(i.blendDst=this.blendDst),this.blendEquation!==pr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==ao&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Pu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Rr&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Rr&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Rr&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(e){const r=s(t.textures),o=s(t.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(t){this.name=t.name,this.blending=t.blending,this.side=t.side,this.vertexColors=t.vertexColors,this.opacity=t.opacity,this.transparent=t.transparent,this.blendSrc=t.blendSrc,this.blendDst=t.blendDst,this.blendEquation=t.blendEquation,this.blendSrcAlpha=t.blendSrcAlpha,this.blendDstAlpha=t.blendDstAlpha,this.blendEquationAlpha=t.blendEquationAlpha,this.blendColor.copy(t.blendColor),this.blendAlpha=t.blendAlpha,this.depthFunc=t.depthFunc,this.depthTest=t.depthTest,this.depthWrite=t.depthWrite,this.stencilWriteMask=t.stencilWriteMask,this.stencilFunc=t.stencilFunc,this.stencilRef=t.stencilRef,this.stencilFuncMask=t.stencilFuncMask,this.stencilFail=t.stencilFail,this.stencilZFail=t.stencilZFail,this.stencilZPass=t.stencilZPass,this.stencilWrite=t.stencilWrite;const e=t.clippingPlanes;let i=null;if(e!==null){const s=e.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=e[r].clone()}return this.clippingPlanes=i,this.clipIntersection=t.clipIntersection,this.clipShadows=t.clipShadows,this.shadowSide=t.shadowSide,this.colorWrite=t.colorWrite,this.precision=t.precision,this.polygonOffset=t.polygonOffset,this.polygonOffsetFactor=t.polygonOffsetFactor,this.polygonOffsetUnits=t.polygonOffsetUnits,this.dithering=t.dithering,this.alphaTest=t.alphaTest,this.alphaHash=t.alphaHash,this.alphaToCoverage=t.alphaToCoverage,this.premultipliedAlpha=t.premultipliedAlpha,this.forceSinglePass=t.forceSinglePass,this.visible=t.visible,this.toneMapped=t.toneMapped,this.userData=JSON.parse(JSON.stringify(t.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(t){t===!0&&this.version++}}class Bf extends bo{constructor(t){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new He(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new us,this.combine=Tf,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.specularMap=t.specularMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.combine=t.combine,this.reflectivity=t.reflectivity,this.refractionRatio=t.refractionRatio,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.fog=t.fog,this}}const In=new dt,Pa=new Ne;let jm=0;class Ri{constructor(t,e,i=!1){if(Array.isArray(t))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:jm++}),this.name="",this.array=t,this.itemSize=e,this.count=t!==void 0?t.length/e:0,this.normalized=i,this.usage=Du,this.updateRanges=[],this.gpuType=zi,this.version=0}onUploadCallback(){}set needsUpdate(t){t===!0&&this.version++}setUsage(t){return this.usage=t,this}addUpdateRange(t,e){this.updateRanges.push({start:t,count:e})}clearUpdateRanges(){this.updateRanges.length=0}copy(t){return this.name=t.name,this.array=new t.array.constructor(t.array),this.itemSize=t.itemSize,this.count=t.count,this.normalized=t.normalized,this.usage=t.usage,this.gpuType=t.gpuType,this}copyAt(t,e,i){t*=this.itemSize,i*=e.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[t+s]=e.array[i+s];return this}copyArray(t){return this.array.set(t),this}applyMatrix3(t){if(this.itemSize===2)for(let e=0,i=this.count;e<i;e++)Pa.fromBufferAttribute(this,e),Pa.applyMatrix3(t),this.setXY(e,Pa.x,Pa.y);else if(this.itemSize===3)for(let e=0,i=this.count;e<i;e++)In.fromBufferAttribute(this,e),In.applyMatrix3(t),this.setXYZ(e,In.x,In.y,In.z);return this}applyMatrix4(t){for(let e=0,i=this.count;e<i;e++)In.fromBufferAttribute(this,e),In.applyMatrix4(t),this.setXYZ(e,In.x,In.y,In.z);return this}applyNormalMatrix(t){for(let e=0,i=this.count;e<i;e++)In.fromBufferAttribute(this,e),In.applyNormalMatrix(t),this.setXYZ(e,In.x,In.y,In.z);return this}transformDirection(t){for(let e=0,i=this.count;e<i;e++)In.fromBufferAttribute(this,e),In.transformDirection(t),this.setXYZ(e,In.x,In.y,In.z);return this}set(t,e=0){return this.array.set(t,e),this}getComponent(t,e){let i=this.array[t*this.itemSize+e];return this.normalized&&(i=Xr(i,this.array)),i}setComponent(t,e,i){return this.normalized&&(i=ri(i,this.array)),this.array[t*this.itemSize+e]=i,this}getX(t){let e=this.array[t*this.itemSize];return this.normalized&&(e=Xr(e,this.array)),e}setX(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize]=e,this}getY(t){let e=this.array[t*this.itemSize+1];return this.normalized&&(e=Xr(e,this.array)),e}setY(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+1]=e,this}getZ(t){let e=this.array[t*this.itemSize+2];return this.normalized&&(e=Xr(e,this.array)),e}setZ(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+2]=e,this}getW(t){let e=this.array[t*this.itemSize+3];return this.normalized&&(e=Xr(e,this.array)),e}setW(t,e){return this.normalized&&(e=ri(e,this.array)),this.array[t*this.itemSize+3]=e,this}setXY(t,e,i){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array)),this.array[t+0]=e,this.array[t+1]=i,this}setXYZ(t,e,i,s){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array),s=ri(s,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this}setXYZW(t,e,i,s,r){return t*=this.itemSize,this.normalized&&(e=ri(e,this.array),i=ri(i,this.array),s=ri(s,this.array),r=ri(r,this.array)),this.array[t+0]=e,this.array[t+1]=i,this.array[t+2]=s,this.array[t+3]=r,this}onUpload(t){return this.onUploadCallback=t,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const t={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(t.name=this.name),this.usage!==Du&&(t.usage=this.usage),t}}class Vf extends Ri{constructor(t,e,i){super(new Uint16Array(t),e,i)}}class Hf extends Ri{constructor(t,e,i){super(new Uint32Array(t),e,i)}}class Ci extends Ri{constructor(t,e,i){super(new Float32Array(t),e,i)}}let $m=0;const Ii=new ke,ll=new zn,kr=new dt,yi=new ir,Co=new ir,Gn=new dt;class Hi extends vr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:$m++}),this.uuid=yr(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(t){return Array.isArray(t)?this.index=new(Of(t)?Hf:Vf)(t,1):this.index=t,this}setIndirect(t){return this.indirect=t,this}getIndirect(){return this.indirect}getAttribute(t){return this.attributes[t]}setAttribute(t,e){return this.attributes[t]=e,this}deleteAttribute(t){return delete this.attributes[t],this}hasAttribute(t){return this.attributes[t]!==void 0}addGroup(t,e,i=0){this.groups.push({start:t,count:e,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(t,e){this.drawRange.start=t,this.drawRange.count=e}applyMatrix4(t){const e=this.attributes.position;e!==void 0&&(e.applyMatrix4(t),e.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Ue().getNormalMatrix(t);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(t),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(t){return Ii.makeRotationFromQuaternion(t),this.applyMatrix4(Ii),this}rotateX(t){return Ii.makeRotationX(t),this.applyMatrix4(Ii),this}rotateY(t){return Ii.makeRotationY(t),this.applyMatrix4(Ii),this}rotateZ(t){return Ii.makeRotationZ(t),this.applyMatrix4(Ii),this}translate(t,e,i){return Ii.makeTranslation(t,e,i),this.applyMatrix4(Ii),this}scale(t,e,i){return Ii.makeScale(t,e,i),this.applyMatrix4(Ii),this}lookAt(t){return ll.lookAt(t),ll.updateMatrix(),this.applyMatrix4(ll.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(kr).negate(),this.translate(kr.x,kr.y,kr.z),this}setFromPoints(t){const e=this.getAttribute("position");if(e===void 0){const i=[];for(let s=0,r=t.length;s<r;s++){const o=t[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ci(i,3))}else{const i=Math.min(t.length,e.count);for(let s=0;s<i;s++){const r=t[s];e.setXYZ(s,r.x,r.y,r.z||0)}t.length>e.count&&ve("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),e.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ir);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Cn("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new dt(-1/0,-1/0,-1/0),new dt(1/0,1/0,1/0));return}if(t!==void 0){if(this.boundingBox.setFromBufferAttribute(t),e)for(let i=0,s=e.length;i<s;i++){const r=e[i];yi.setFromBufferAttribute(r),this.morphTargetsRelative?(Gn.addVectors(this.boundingBox.min,yi.min),this.boundingBox.expandByPoint(Gn),Gn.addVectors(this.boundingBox.max,yi.max),this.boundingBox.expandByPoint(Gn)):(this.boundingBox.expandByPoint(yi.min),this.boundingBox.expandByPoint(yi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Cn('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new sr);const t=this.attributes.position,e=this.morphAttributes.position;if(t&&t.isGLBufferAttribute){Cn("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new dt,1/0);return}if(t){const i=this.boundingSphere.center;if(yi.setFromBufferAttribute(t),e)for(let r=0,o=e.length;r<o;r++){const a=e[r];Co.setFromBufferAttribute(a),this.morphTargetsRelative?(Gn.addVectors(yi.min,Co.min),yi.expandByPoint(Gn),Gn.addVectors(yi.max,Co.max),yi.expandByPoint(Gn)):(yi.expandByPoint(Co.min),yi.expandByPoint(Co.max))}yi.getCenter(i);let s=0;for(let r=0,o=t.count;r<o;r++)Gn.fromBufferAttribute(t,r),s=Math.max(s,i.distanceToSquared(Gn));if(e)for(let r=0,o=e.length;r<o;r++){const a=e[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Gn.fromBufferAttribute(a,c),l&&(kr.fromBufferAttribute(t,c),Gn.add(kr)),s=Math.max(s,i.distanceToSquared(Gn))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Cn('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const t=this.index,e=this.attributes;if(t===null||e.position===void 0||e.normal===void 0||e.uv===void 0){Cn("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=e.position,s=e.normal,r=e.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Ri(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let R=0;R<i.count;R++)a[R]=new dt,l[R]=new dt;const c=new dt,u=new dt,d=new dt,p=new Ne,m=new Ne,g=new Ne,x=new dt,f=new dt;function h(R,w,T){c.fromBufferAttribute(i,R),u.fromBufferAttribute(i,w),d.fromBufferAttribute(i,T),p.fromBufferAttribute(r,R),m.fromBufferAttribute(r,w),g.fromBufferAttribute(r,T),u.sub(c),d.sub(c),m.sub(p),g.sub(p);const C=1/(m.x*g.y-g.x*m.y);isFinite(C)&&(x.copy(u).multiplyScalar(g.y).addScaledVector(d,-m.y).multiplyScalar(C),f.copy(d).multiplyScalar(m.x).addScaledVector(u,-g.x).multiplyScalar(C),a[R].add(x),a[w].add(x),a[T].add(x),l[R].add(f),l[w].add(f),l[T].add(f))}let M=this.groups;M.length===0&&(M=[{start:0,count:t.count}]);for(let R=0,w=M.length;R<w;++R){const T=M[R],C=T.start,I=T.count;for(let F=C,V=C+I;F<V;F+=3)h(t.getX(F+0),t.getX(F+1),t.getX(F+2))}const _=new dt,b=new dt,S=new dt,y=new dt;function E(R){S.fromBufferAttribute(s,R),y.copy(S);const w=a[R];_.copy(w),_.sub(S.multiplyScalar(S.dot(w))).normalize(),b.crossVectors(y,w);const C=b.dot(l[R])<0?-1:1;o.setXYZW(R,_.x,_.y,_.z,C)}for(let R=0,w=M.length;R<w;++R){const T=M[R],C=T.start,I=T.count;for(let F=C,V=C+I;F<V;F+=3)E(t.getX(F+0)),E(t.getX(F+1)),E(t.getX(F+2))}}computeVertexNormals(){const t=this.index,e=this.getAttribute("position");if(e!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Ri(new Float32Array(e.count*3),3),this.setAttribute("normal",i);else for(let p=0,m=i.count;p<m;p++)i.setXYZ(p,0,0,0);const s=new dt,r=new dt,o=new dt,a=new dt,l=new dt,c=new dt,u=new dt,d=new dt;if(t)for(let p=0,m=t.count;p<m;p+=3){const g=t.getX(p+0),x=t.getX(p+1),f=t.getX(p+2);s.fromBufferAttribute(e,g),r.fromBufferAttribute(e,x),o.fromBufferAttribute(e,f),u.subVectors(o,r),d.subVectors(s,r),u.cross(d),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,x),c.fromBufferAttribute(i,f),a.add(u),l.add(u),c.add(u),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(x,l.x,l.y,l.z),i.setXYZ(f,c.x,c.y,c.z)}else for(let p=0,m=e.count;p<m;p+=3)s.fromBufferAttribute(e,p+0),r.fromBufferAttribute(e,p+1),o.fromBufferAttribute(e,p+2),u.subVectors(o,r),d.subVectors(s,r),u.cross(d),i.setXYZ(p+0,u.x,u.y,u.z),i.setXYZ(p+1,u.x,u.y,u.z),i.setXYZ(p+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const t=this.attributes.normal;for(let e=0,i=t.count;e<i;e++)Gn.fromBufferAttribute(t,e),Gn.normalize(),t.setXYZ(e,Gn.x,Gn.y,Gn.z)}toNonIndexed(){function t(a,l){const c=a.array,u=a.itemSize,d=a.normalized,p=new c.constructor(l.length*u);let m=0,g=0;for(let x=0,f=l.length;x<f;x++){a.isInterleavedBufferAttribute?m=l[x]*a.data.stride+a.offset:m=l[x]*u;for(let h=0;h<u;h++)p[g++]=c[m++]}return new Ri(p,u,d)}if(this.index===null)return ve("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const e=new Hi,i=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=t(l,i);e.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let u=0,d=c.length;u<d;u++){const p=c[u],m=t(p,i);l.push(m)}e.morphAttributes[a]=l}e.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];e.addGroup(c.start,c.count,c.materialIndex)}return e}toJSON(){const t={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),Object.keys(this.userData).length>0&&(t.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(t[c]=l[c]);return t}t.data={attributes:{}};const e=this.index;e!==null&&(t.data.index={type:e.array.constructor.name,array:Array.prototype.slice.call(e.array)});const i=this.attributes;for(const l in i){const c=i[l];t.data.attributes[l]=c.toJSON(t.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let d=0,p=c.length;d<p;d++){const m=c[d];u.push(m.toJSON(t.data))}u.length>0&&(s[l]=u,r=!0)}r&&(t.data.morphAttributes=s,t.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(t.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(t.data.boundingSphere=a.toJSON()),t}clone(){return new this.constructor().copy(this)}copy(t){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const e={};this.name=t.name;const i=t.index;i!==null&&this.setIndex(i.clone());const s=t.attributes;for(const c in s){const u=s[c];this.setAttribute(c,u.clone(e))}const r=t.morphAttributes;for(const c in r){const u=[],d=r[c];for(let p=0,m=d.length;p<m;p++)u.push(d[p].clone(e));this.morphAttributes[c]=u}this.morphTargetsRelative=t.morphTargetsRelative;const o=t.groups;for(let c=0,u=o.length;c<u;c++){const d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}const a=t.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=t.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=t.drawRange.start,this.drawRange.count=t.drawRange.count,this.userData=t.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const ju=new ke,cr=new Cc,Da=new sr,$u=new dt,Ia=new dt,Ua=new dt,Na=new dt,hl=new dt,Oa=new dt,Ku=new dt,Fa=new dt;class ts extends zn{constructor(t=new Hi,e=new Bf){super(),this.isMesh=!0,this.type="Mesh",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),t.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=t.morphTargetInfluences.slice()),t.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},t.morphTargetDictionary)),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(t,e){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;e.fromBufferAttribute(s,t);const a=this.morphTargetInfluences;if(r&&a){Oa.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const u=a[l],d=r[l];u!==0&&(hl.fromBufferAttribute(d,t),o?Oa.addScaledVector(hl,u):Oa.addScaledVector(hl.sub(e),u))}e.add(Oa)}return e}raycast(t,e){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Da.copy(i.boundingSphere),Da.applyMatrix4(r),cr.copy(t.ray).recast(t.near),!(Da.containsPoint(cr.origin)===!1&&(cr.intersectSphere(Da,$u)===null||cr.origin.distanceToSquared($u)>(t.far-t.near)**2))&&(ju.copy(r).invert(),cr.copy(t.ray).applyMatrix4(ju),!(i.boundingBox!==null&&cr.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(t,e,cr)))}_computeIntersections(t,e,i){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,d=r.attributes.normal,p=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=p.length;g<x;g++){const f=p[g],h=o[f.materialIndex],M=Math.max(f.start,m.start),_=Math.min(a.count,Math.min(f.start+f.count,m.start+m.count));for(let b=M,S=_;b<S;b+=3){const y=a.getX(b),E=a.getX(b+1),R=a.getX(b+2);s=ka(this,h,t,i,c,u,d,y,E,R),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=f.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(a.count,m.start+m.count);for(let f=g,h=x;f<h;f+=3){const M=a.getX(f),_=a.getX(f+1),b=a.getX(f+2);s=ka(this,o,t,i,c,u,d,M,_,b),s&&(s.faceIndex=Math.floor(f/3),e.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=p.length;g<x;g++){const f=p[g],h=o[f.materialIndex],M=Math.max(f.start,m.start),_=Math.min(l.count,Math.min(f.start+f.count,m.start+m.count));for(let b=M,S=_;b<S;b+=3){const y=b,E=b+1,R=b+2;s=ka(this,h,t,i,c,u,d,y,E,R),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=f.materialIndex,e.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(l.count,m.start+m.count);for(let f=g,h=x;f<h;f+=3){const M=f,_=f+1,b=f+2;s=ka(this,o,t,i,c,u,d,M,_,b),s&&(s.faceIndex=Math.floor(f/3),e.push(s))}}}}function Km(n,t,e,i,s,r,o,a){let l;if(t.side===xi?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,t.side===er,a),l===null)return null;Fa.copy(a),Fa.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(Fa);return c<e.near||c>e.far?null:{distance:c,point:Fa.clone(),object:n}}function ka(n,t,e,i,s,r,o,a,l,c){n.getVertexPosition(a,Ia),n.getVertexPosition(l,Ua),n.getVertexPosition(c,Na);const u=Km(n,t,e,i,Ia,Ua,Na,Ku);if(u){const d=new dt;$i.getBarycoord(Ku,Ia,Ua,Na,d),s&&(u.uv=$i.getInterpolatedAttribute(s,a,l,c,d,new Ne)),r&&(u.uv1=$i.getInterpolatedAttribute(r,a,l,c,d,new Ne)),o&&(u.normal=$i.getInterpolatedAttribute(o,a,l,c,d,new dt),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const p={a,b:l,c,normal:new dt,materialIndex:0};$i.getNormal(Ia,Ua,Na,p.normal),u.face=p,u.barycoord=d}return u}class da extends Hi{constructor(t=1,e=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:t,height:e,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],u=[],d=[];let p=0,m=0;g("z","y","x",-1,-1,i,e,t,o,r,0),g("z","y","x",1,-1,i,e,-t,o,r,1),g("x","z","y",1,1,t,i,e,s,o,2),g("x","z","y",1,-1,t,i,-e,s,o,3),g("x","y","z",1,-1,t,e,i,s,r,4),g("x","y","z",-1,-1,t,e,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Ci(c,3)),this.setAttribute("normal",new Ci(u,3)),this.setAttribute("uv",new Ci(d,2));function g(x,f,h,M,_,b,S,y,E,R,w){const T=b/E,C=S/R,I=b/2,F=S/2,V=y/2,Y=E+1,P=R+1;let H=0,W=0;const j=new dt;for(let N=0;N<P;N++){const tt=N*C-F;for(let $=0;$<Y;$++){const ut=$*T-I;j[x]=ut*M,j[f]=tt*_,j[h]=V,c.push(j.x,j.y,j.z),j[x]=0,j[f]=0,j[h]=y>0?1:-1,u.push(j.x,j.y,j.z),d.push($/E),d.push(1-N/R),H+=1}}for(let N=0;N<R;N++)for(let tt=0;tt<E;tt++){const $=p+tt+Y*N,ut=p+tt+Y*(N+1),st=p+(tt+1)+Y*(N+1),nt=p+(tt+1)+Y*N;l.push($,ut,nt),l.push(ut,st,nt),W+=6}a.addGroup(m,W,w),m+=W,p+=H}}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new da(t.width,t.height,t.depth,t.widthSegments,t.heightSegments,t.depthSegments)}}function fo(n){const t={};for(const e in n){t[e]={};for(const i in n[e]){const s=n[e][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(ve("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),t[e][i]=null):t[e][i]=s.clone():Array.isArray(s)?t[e][i]=s.slice():t[e][i]=s}}return t}function oi(n){const t={};for(let e=0;e<n.length;e++){const i=fo(n[e]);for(const s in i)t[s]=i[s]}return t}function Zm(n){const t=[];for(let e=0;e<n.length;e++)t.push(n[e].clone());return t}function Gf(n){const t=n.getRenderTarget();return t===null?n.outputColorSpace:t.isXRRenderTarget===!0?t.texture.colorSpace:en.workingColorSpace}const Qm={clone:fo,merge:oi};var Jm=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,tg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Us extends bo{constructor(t){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Jm,this.fragmentShader=tg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,t!==void 0&&this.setValues(t)}copy(t){return super.copy(t),this.fragmentShader=t.fragmentShader,this.vertexShader=t.vertexShader,this.uniforms=fo(t.uniforms),this.uniformsGroups=Zm(t.uniformsGroups),this.defines=Object.assign({},t.defines),this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.fog=t.fog,this.lights=t.lights,this.clipping=t.clipping,this.extensions=Object.assign({},t.extensions),this.glslVersion=t.glslVersion,this}toJSON(t){const e=super.toJSON(t);e.glslVersion=this.glslVersion,e.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?e.uniforms[s]={type:"t",value:o.toJSON(t).uuid}:o&&o.isColor?e.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?e.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?e.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?e.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?e.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?e.uniforms[s]={type:"m4",value:o.toArray()}:e.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(e.defines=this.defines),e.vertexShader=this.vertexShader,e.fragmentShader=this.fragmentShader,e.lights=this.lights,e.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(e.extensions=i),e}}class Wf extends zn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ke,this.projectionMatrix=new ke,this.projectionMatrixInverse=new ke,this.coordinateSystem=ls,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(t,e){return super.copy(t,e),this.matrixWorldInverse.copy(t.matrixWorldInverse),this.projectionMatrix.copy(t.projectionMatrix),this.projectionMatrixInverse.copy(t.projectionMatrixInverse),this.coordinateSystem=t.coordinateSystem,this}getWorldDirection(t){return super.getWorldDirection(t).negate()}updateMatrixWorld(t){super.updateMatrixWorld(t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(t,e){super.updateWorldMatrix(t,e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const Xs=new dt,Zu=new Ne,Qu=new Ne;class ji extends Wf{constructor(t=50,e=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=t,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=e,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.fov=t.fov,this.zoom=t.zoom,this.near=t.near,this.far=t.far,this.focus=t.focus,this.aspect=t.aspect,this.view=t.view===null?null:Object.assign({},t.view),this.filmGauge=t.filmGauge,this.filmOffset=t.filmOffset,this}setFocalLength(t){const e=.5*this.getFilmHeight()/t;this.fov=ra*2*Math.atan(e),this.updateProjectionMatrix()}getFocalLength(){const t=Math.tan($o*.5*this.fov);return .5*this.getFilmHeight()/t}getEffectiveFOV(){return ra*2*Math.atan(Math.tan($o*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(t,e,i){Xs.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),e.set(Xs.x,Xs.y).multiplyScalar(-t/Xs.z),Xs.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(Xs.x,Xs.y).multiplyScalar(-t/Xs.z)}getViewSize(t,e){return this.getViewBounds(t,Zu,Qu),e.subVectors(Qu,Zu)}setViewOffset(t,e,i,s,r,o){this.aspect=t/e,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=this.near;let e=t*Math.tan($o*.5*this.fov)/this.zoom,i=2*e,s=this.aspect*i,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,e-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(r+=t*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,e,e-i,t,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.fov=this.fov,e.object.zoom=this.zoom,e.object.near=this.near,e.object.far=this.far,e.object.focus=this.focus,e.object.aspect=this.aspect,this.view!==null&&(e.object.view=Object.assign({},this.view)),e.object.filmGauge=this.filmGauge,e.object.filmOffset=this.filmOffset,e}}const zr=-90,Br=1;class eg extends zn{constructor(t,e,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new ji(zr,Br,t,e);s.layers=this.layers,this.add(s);const r=new ji(zr,Br,t,e);r.layers=this.layers,this.add(r);const o=new ji(zr,Br,t,e);o.layers=this.layers,this.add(o);const a=new ji(zr,Br,t,e);a.layers=this.layers,this.add(a);const l=new ji(zr,Br,t,e);l.layers=this.layers,this.add(l);const c=new ji(zr,Br,t,e);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const t=this.coordinateSystem,e=this.children.concat(),[i,s,r,o,a,l]=e;for(const c of e)this.remove(c);if(t===ls)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(t===xc)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+t);for(const c of e)this.add(c),c.updateMatrixWorld()}update(t,e){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==t.coordinateSystem&&(this.coordinateSystem=t.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,u]=this.children,d=t.getRenderTarget(),p=t.getActiveCubeFace(),m=t.getActiveMipmapLevel(),g=t.xr.enabled;t.xr.enabled=!1;const x=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,t.setRenderTarget(i,0,s),t.render(e,r),t.setRenderTarget(i,1,s),t.render(e,o),t.setRenderTarget(i,2,s),t.render(e,a),t.setRenderTarget(i,3,s),t.render(e,l),t.setRenderTarget(i,4,s),t.render(e,c),i.texture.generateMipmaps=x,t.setRenderTarget(i,5,s),t.render(e,u),t.setRenderTarget(d,p,m),t.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Xf extends ci{constructor(t=[],e=co,i,s,r,o,a,l,c,u){super(t,e,i,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(t){this.image=t}}class ng extends nr{constructor(t=1,e={}){super(t,t,e),this.isWebGLCubeRenderTarget=!0;const i={width:t,height:t,depth:1},s=[i,i,i,i,i,i];this.texture=new Xf(s),this._setTextureOptions(e),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(t,e){this.texture.type=e.type,this.texture.colorSpace=e.colorSpace,this.texture.generateMipmaps=e.generateMipmaps,this.texture.minFilter=e.minFilter,this.texture.magFilter=e.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new da(5,5,5),r=new Us({name:"CubemapFromEquirect",uniforms:fo(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:xi,blending:Ls});r.uniforms.tEquirect.value=e;const o=new ts(s,r),a=e.minFilter;return e.minFilter===gr&&(e.minFilter=Bi),new eg(1,10,this).update(t,o),e.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(t,e=!0,i=!0,s=!0){const r=t.getRenderTarget();for(let o=0;o<6;o++)t.setRenderTarget(this,o),t.clear(e,i,s);t.setRenderTarget(r)}}class za extends zn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const ig={type:"move"};class ul{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new za,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new za,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new dt,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new dt),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new za,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new dt,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new dt),this._grip}dispatchEvent(t){return this._targetRay!==null&&this._targetRay.dispatchEvent(t),this._grip!==null&&this._grip.dispatchEvent(t),this._hand!==null&&this._hand.dispatchEvent(t),this}connect(t){if(t&&t.hand){const e=this._hand;if(e)for(const i of t.hand.values())this._getHandJoint(e,i)}return this.dispatchEvent({type:"connected",data:t}),this}disconnect(t){return this.dispatchEvent({type:"disconnected",data:t}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(t,e,i){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(t&&e.session.visibilityState!=="visible-blurred"){if(c&&t.hand){o=!0;for(const x of t.hand.values()){const f=e.getJointPose(x,i),h=this._getHandJoint(c,x);f!==null&&(h.matrix.fromArray(f.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=f.radius),h.visible=f!==null}const u=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],p=u.position.distanceTo(d.position),m=.02,g=.005;c.inputState.pinching&&p>m+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:t.handedness,target:this})):!c.inputState.pinching&&p<=m-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:t.handedness,target:this}))}else l!==null&&t.gripSpace&&(r=e.getPose(t.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=e.getPose(t.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(ig)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(t,e){if(t.joints[e.jointName]===void 0){const i=new za;i.matrixAutoUpdate=!1,i.visible=!1,t.joints[e.jointName]=i,t.add(i)}return t.joints[e.jointName]}}class pS extends zn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new us,this.environmentIntensity=1,this.environmentRotation=new us,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(t,e){return super.copy(t,e),t.background!==null&&(this.background=t.background.clone()),t.environment!==null&&(this.environment=t.environment.clone()),t.fog!==null&&(this.fog=t.fog.clone()),this.backgroundBlurriness=t.backgroundBlurriness,this.backgroundIntensity=t.backgroundIntensity,this.backgroundRotation.copy(t.backgroundRotation),this.environmentIntensity=t.environmentIntensity,this.environmentRotation.copy(t.environmentRotation),t.overrideMaterial!==null&&(this.overrideMaterial=t.overrideMaterial.clone()),this.matrixAutoUpdate=t.matrixAutoUpdate,this}toJSON(t){const e=super.toJSON(t);return this.fog!==null&&(e.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(e.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(e.object.backgroundIntensity=this.backgroundIntensity),e.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(e.object.environmentIntensity=this.environmentIntensity),e.object.environmentRotation=this.environmentRotation.toArray(),e}}const Ju=new dt,td=new Mn,ed=new Mn,sg=new dt,nd=new ke,Ba=new dt,dl=new sr,id=new ke,fl=new Cc;class mS extends ts{constructor(t,e){super(t,e),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=Lu,this.bindMatrix=new ke,this.bindMatrixInverse=new ke,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const t=this.geometry;this.boundingBox===null&&(this.boundingBox=new ir),this.boundingBox.makeEmpty();const e=t.getAttribute("position");for(let i=0;i<e.count;i++)this.getVertexPosition(i,Ba),this.boundingBox.expandByPoint(Ba)}computeBoundingSphere(){const t=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new sr),this.boundingSphere.makeEmpty();const e=t.getAttribute("position");for(let i=0;i<e.count;i++)this.getVertexPosition(i,Ba),this.boundingSphere.expandByPoint(Ba)}copy(t,e){return super.copy(t,e),this.bindMode=t.bindMode,this.bindMatrix.copy(t.bindMatrix),this.bindMatrixInverse.copy(t.bindMatrixInverse),this.skeleton=t.skeleton,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}raycast(t,e){const i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),dl.copy(this.boundingSphere),dl.applyMatrix4(s),t.ray.intersectsSphere(dl)!==!1&&(id.copy(s).invert(),fl.copy(t.ray).applyMatrix4(id),!(this.boundingBox!==null&&fl.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(t,e,fl)))}getVertexPosition(t,e){return super.getVertexPosition(t,e),this.applyBoneTransform(t,e),e}bind(t,e){this.skeleton=t,e===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),e=this.matrixWorld),this.bindMatrix.copy(e),this.bindMatrixInverse.copy(e).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const t=new Mn,e=this.geometry.attributes.skinWeight;for(let i=0,s=e.count;i<s;i++){t.fromBufferAttribute(e,i);const r=1/t.manhattanLength();r!==1/0?t.multiplyScalar(r):t.set(1,0,0,0),e.setXYZW(i,t.x,t.y,t.z,t.w)}}updateMatrixWorld(t){super.updateMatrixWorld(t),this.bindMode===Lu?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===im?this.bindMatrixInverse.copy(this.bindMatrix).invert():ve("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(t,e){const i=this.skeleton,s=this.geometry;td.fromBufferAttribute(s.attributes.skinIndex,t),ed.fromBufferAttribute(s.attributes.skinWeight,t),Ju.copy(e).applyMatrix4(this.bindMatrix),e.set(0,0,0);for(let r=0;r<4;r++){const o=ed.getComponent(r);if(o!==0){const a=td.getComponent(r);nd.multiplyMatrices(i.bones[a].matrixWorld,i.boneInverses[a]),e.addScaledVector(sg.copy(Ju).applyMatrix4(nd),o)}}return e.applyMatrix4(this.bindMatrixInverse)}}class rg extends zn{constructor(){super(),this.isBone=!0,this.type="Bone"}}class Qh extends ci{constructor(t=null,e=1,i=1,s,r,o,a,l,c=Ai,u=Ai,d,p){super(null,o,a,l,c,u,s,r,d,p),this.isDataTexture=!0,this.image={data:t,width:e,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const sd=new ke,og=new ke;class qf{constructor(t=[],e=[]){this.uuid=yr(),this.bones=t.slice(0),this.boneInverses=e,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const t=this.bones,e=this.boneInverses;if(this.boneMatrices=new Float32Array(t.length*16),e.length===0)this.calculateInverses();else if(t.length!==e.length){ve("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new ke)}}calculateInverses(){this.boneInverses.length=0;for(let t=0,e=this.bones.length;t<e;t++){const i=new ke;this.bones[t]&&i.copy(this.bones[t].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let t=0,e=this.bones.length;t<e;t++){const i=this.bones[t];i&&i.matrixWorld.copy(this.boneInverses[t]).invert()}for(let t=0,e=this.bones.length;t<e;t++){const i=this.bones[t];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){const t=this.bones,e=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let r=0,o=t.length;r<o;r++){const a=t[r]?t[r].matrixWorld:og;sd.multiplyMatrices(a,e[r]),sd.toArray(i,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new qf(this.bones,this.boneInverses)}computeBoneTexture(){let t=Math.sqrt(this.bones.length*4);t=Math.ceil(t/4)*4,t=Math.max(t,4);const e=new Float32Array(t*t*4);e.set(this.boneMatrices);const i=new Qh(e,t,t,Vi,zi);return i.needsUpdate=!0,this.boneMatrices=e,this.boneTexture=i,this}getBoneByName(t){for(let e=0,i=this.bones.length;e<i;e++){const s=this.bones[e];if(s.name===t)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(t,e){this.uuid=t.uuid;for(let i=0,s=t.bones.length;i<s;i++){const r=t.bones[i];let o=e[r];o===void 0&&(ve("Skeleton: No bone found with UUID:",r),o=new rg),this.bones.push(o),this.boneInverses.push(new ke().fromArray(t.boneInverses[i]))}return this.init(),this}toJSON(){const t={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};t.uuid=this.uuid;const e=this.bones,i=this.boneInverses;for(let s=0,r=e.length;s<r;s++){const o=e[s];t.bones.push(o.uuid);const a=i[s];t.boneInverses.push(a.toArray())}return t}}class rd extends Ri{constructor(t,e,i,s=1){super(t,e,i),this.isInstancedBufferAttribute=!0,this.meshPerAttribute=s}copy(t){return super.copy(t),this.meshPerAttribute=t.meshPerAttribute,this}toJSON(){const t=super.toJSON();return t.meshPerAttribute=this.meshPerAttribute,t.isInstancedBufferAttribute=!0,t}}const Vr=new ke,od=new ke,Va=[],ad=new ir,ag=new ke,Lo=new ts,Po=new sr;class gS extends ts{constructor(t,e,i){super(t,e),this.isInstancedMesh=!0,this.instanceMatrix=new rd(new Float32Array(i*16),16),this.instanceColor=null,this.morphTexture=null,this.count=i,this.boundingBox=null,this.boundingSphere=null;for(let s=0;s<i;s++)this.setMatrixAt(s,ag)}computeBoundingBox(){const t=this.geometry,e=this.count;this.boundingBox===null&&(this.boundingBox=new ir),t.boundingBox===null&&t.computeBoundingBox(),this.boundingBox.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Vr),ad.copy(t.boundingBox).applyMatrix4(Vr),this.boundingBox.union(ad)}computeBoundingSphere(){const t=this.geometry,e=this.count;this.boundingSphere===null&&(this.boundingSphere=new sr),t.boundingSphere===null&&t.computeBoundingSphere(),this.boundingSphere.makeEmpty();for(let i=0;i<e;i++)this.getMatrixAt(i,Vr),Po.copy(t.boundingSphere).applyMatrix4(Vr),this.boundingSphere.union(Po)}copy(t,e){return super.copy(t,e),this.instanceMatrix.copy(t.instanceMatrix),t.morphTexture!==null&&(this.morphTexture=t.morphTexture.clone()),t.instanceColor!==null&&(this.instanceColor=t.instanceColor.clone()),this.count=t.count,t.boundingBox!==null&&(this.boundingBox=t.boundingBox.clone()),t.boundingSphere!==null&&(this.boundingSphere=t.boundingSphere.clone()),this}getColorAt(t,e){e.fromArray(this.instanceColor.array,t*3)}getMatrixAt(t,e){e.fromArray(this.instanceMatrix.array,t*16)}getMorphAt(t,e){const i=e.morphTargetInfluences,s=this.morphTexture.source.data.data,r=i.length+1,o=t*r+1;for(let a=0;a<i.length;a++)i[a]=s[o+a]}raycast(t,e){const i=this.matrixWorld,s=this.count;if(Lo.geometry=this.geometry,Lo.material=this.material,Lo.material!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),Po.copy(this.boundingSphere),Po.applyMatrix4(i),t.ray.intersectsSphere(Po)!==!1))for(let r=0;r<s;r++){this.getMatrixAt(r,Vr),od.multiplyMatrices(i,Vr),Lo.matrixWorld=od,Lo.raycast(t,Va);for(let o=0,a=Va.length;o<a;o++){const l=Va[o];l.instanceId=r,l.object=this,e.push(l)}Va.length=0}}setColorAt(t,e){this.instanceColor===null&&(this.instanceColor=new rd(new Float32Array(this.instanceMatrix.count*3).fill(1),3)),e.toArray(this.instanceColor.array,t*3)}setMatrixAt(t,e){e.toArray(this.instanceMatrix.array,t*16)}setMorphAt(t,e){const i=e.morphTargetInfluences,s=i.length+1;this.morphTexture===null&&(this.morphTexture=new Qh(new Float32Array(s*this.count),s,this.count,Xh,zi));const r=this.morphTexture.source.data.data;let o=0;for(let c=0;c<i.length;c++)o+=i[c];const a=this.geometry.morphTargetsRelative?1:1-o,l=s*t;r[l]=a,r.set(i,l+1)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"}),this.morphTexture!==null&&(this.morphTexture.dispose(),this.morphTexture=null)}}const pl=new dt,cg=new dt,lg=new Ue;class $s{constructor(t=new dt(1,0,0),e=0){this.isPlane=!0,this.normal=t,this.constant=e}set(t,e){return this.normal.copy(t),this.constant=e,this}setComponents(t,e,i,s){return this.normal.set(t,e,i),this.constant=s,this}setFromNormalAndCoplanarPoint(t,e){return this.normal.copy(t),this.constant=-e.dot(this.normal),this}setFromCoplanarPoints(t,e,i){const s=pl.subVectors(i,e).cross(cg.subVectors(t,e)).normalize();return this.setFromNormalAndCoplanarPoint(s,t),this}copy(t){return this.normal.copy(t.normal),this.constant=t.constant,this}normalize(){const t=1/this.normal.length();return this.normal.multiplyScalar(t),this.constant*=t,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(t){return this.normal.dot(t)+this.constant}distanceToSphere(t){return this.distanceToPoint(t.center)-t.radius}projectPoint(t,e){return e.copy(t).addScaledVector(this.normal,-this.distanceToPoint(t))}intersectLine(t,e){const i=t.delta(pl),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(t.start)===0?e.copy(t.start):null;const r=-(t.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:e.copy(t.start).addScaledVector(i,r)}intersectsLine(t){const e=this.distanceToPoint(t.start),i=this.distanceToPoint(t.end);return e<0&&i>0||i<0&&e>0}intersectsBox(t){return t.intersectsPlane(this)}intersectsSphere(t){return t.intersectsPlane(this)}coplanarPoint(t){return t.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(t,e){const i=e||lg.getNormalMatrix(t),s=this.coplanarPoint(pl).applyMatrix4(t),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(t){return this.constant-=t.dot(this.normal),this}equals(t){return t.normal.equals(this.normal)&&t.constant===this.constant}clone(){return new this.constructor().copy(this)}}const lr=new sr,hg=new Ne(.5,.5),Ha=new dt;class Jh{constructor(t=new $s,e=new $s,i=new $s,s=new $s,r=new $s,o=new $s){this.planes=[t,e,i,s,r,o]}set(t,e,i,s,r,o){const a=this.planes;return a[0].copy(t),a[1].copy(e),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(t){const e=this.planes;for(let i=0;i<6;i++)e[i].copy(t.planes[i]);return this}setFromProjectionMatrix(t,e=ls,i=!1){const s=this.planes,r=t.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],d=r[5],p=r[6],m=r[7],g=r[8],x=r[9],f=r[10],h=r[11],M=r[12],_=r[13],b=r[14],S=r[15];if(s[0].setComponents(c-o,m-u,h-g,S-M).normalize(),s[1].setComponents(c+o,m+u,h+g,S+M).normalize(),s[2].setComponents(c+a,m+d,h+x,S+_).normalize(),s[3].setComponents(c-a,m-d,h-x,S-_).normalize(),i)s[4].setComponents(l,p,f,b).normalize(),s[5].setComponents(c-l,m-p,h-f,S-b).normalize();else if(s[4].setComponents(c-l,m-p,h-f,S-b).normalize(),e===ls)s[5].setComponents(c+l,m+p,h+f,S+b).normalize();else if(e===xc)s[5].setComponents(l,p,f,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+e);return this}intersectsObject(t){if(t.boundingSphere!==void 0)t.boundingSphere===null&&t.computeBoundingSphere(),lr.copy(t.boundingSphere).applyMatrix4(t.matrixWorld);else{const e=t.geometry;e.boundingSphere===null&&e.computeBoundingSphere(),lr.copy(e.boundingSphere).applyMatrix4(t.matrixWorld)}return this.intersectsSphere(lr)}intersectsSprite(t){lr.center.set(0,0,0);const e=hg.distanceTo(t.center);return lr.radius=.7071067811865476+e,lr.applyMatrix4(t.matrixWorld),this.intersectsSphere(lr)}intersectsSphere(t){const e=this.planes,i=t.center,s=-t.radius;for(let r=0;r<6;r++)if(e[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(t){const e=this.planes;for(let i=0;i<6;i++){const s=e[i];if(Ha.x=s.normal.x>0?t.max.x:t.min.x,Ha.y=s.normal.y>0?t.max.y:t.min.y,Ha.z=s.normal.z>0?t.max.z:t.min.z,s.distanceToPoint(Ha)<0)return!1}return!0}containsPoint(t){const e=this.planes;for(let i=0;i<6;i++)if(e[i].distanceToPoint(t)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class tu extends bo{constructor(t){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new He(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.color.copy(t.color),this.map=t.map,this.linewidth=t.linewidth,this.linecap=t.linecap,this.linejoin=t.linejoin,this.fog=t.fog,this}}const bc=new dt,Mc=new dt,cd=new ke,Do=new Cc,Ga=new sr,ml=new dt,ld=new dt;class ug extends zn{constructor(t=new Hi,e=new tu){super(),this.isLine=!0,this.type="Line",this.geometry=t,this.material=e,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(t,e){return super.copy(t,e),this.material=Array.isArray(t.material)?t.material.slice():t.material,this.geometry=t.geometry,this}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[0];for(let s=1,r=e.count;s<r;s++)bc.fromBufferAttribute(e,s-1),Mc.fromBufferAttribute(e,s),i[s]=i[s-1],i[s]+=bc.distanceTo(Mc);t.setAttribute("lineDistance",new Ci(i,1))}else ve("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(t,e){const i=this.geometry,s=this.matrixWorld,r=t.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Ga.copy(i.boundingSphere),Ga.applyMatrix4(s),Ga.radius+=r,t.ray.intersectsSphere(Ga)===!1)return;cd.copy(s).invert(),Do.copy(t.ray).applyMatrix4(cd);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=i.index,p=i.attributes.position;if(u!==null){const m=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let x=m,f=g-1;x<f;x+=c){const h=u.getX(x),M=u.getX(x+1),_=Wa(this,t,Do,l,h,M,x);_&&e.push(_)}if(this.isLineLoop){const x=u.getX(g-1),f=u.getX(m),h=Wa(this,t,Do,l,x,f,g-1);h&&e.push(h)}}else{const m=Math.max(0,o.start),g=Math.min(p.count,o.start+o.count);for(let x=m,f=g-1;x<f;x+=c){const h=Wa(this,t,Do,l,x,x+1,x);h&&e.push(h)}if(this.isLineLoop){const x=Wa(this,t,Do,l,g-1,m,g-1);x&&e.push(x)}}}updateMorphTargets(){const e=this.geometry.morphAttributes,i=Object.keys(e);if(i.length>0){const s=e[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Wa(n,t,e,i,s,r,o){const a=n.geometry.attributes.position;if(bc.fromBufferAttribute(a,s),Mc.fromBufferAttribute(a,r),e.distanceSqToSegment(bc,Mc,ml,ld)>i)return;ml.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(ml);if(!(c<t.near||c>t.far))return{distance:c,point:ld.clone().applyMatrix4(n.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:n}}const hd=new dt,ud=new dt;class Yf extends ug{constructor(t,e){super(t,e),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const t=this.geometry;if(t.index===null){const e=t.attributes.position,i=[];for(let s=0,r=e.count;s<r;s+=2)hd.fromBufferAttribute(e,s),ud.fromBufferAttribute(e,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+hd.distanceTo(ud);t.setAttribute("lineDistance",new Ci(i,1))}else ve("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class jf extends ci{constructor(t,e,i=br,s,r,o,a=Ai,l=Ai,c,u=ho,d=1){if(u!==ho&&u!==eo)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const p={width:t,height:e,depth:d};super(p,s,r,o,a,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(t){return super.copy(t),this.source=new Zh(Object.assign({},t.image)),this.compareFunction=t.compareFunction,this}toJSON(t){const e=super.toJSON(t);return this.compareFunction!==null&&(e.compareFunction=this.compareFunction),e}}class $f extends ci{constructor(t=null){super(),this.sourceTexture=t,this.isExternalTexture=!0}copy(t){return super.copy(t),this.sourceTexture=t.sourceTexture,this}}class Lc extends Hi{constructor(t=1,e=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:t,height:e,widthSegments:i,heightSegments:s};const r=t/2,o=e/2,a=Math.floor(i),l=Math.floor(s),c=a+1,u=l+1,d=t/a,p=e/l,m=[],g=[],x=[],f=[];for(let h=0;h<u;h++){const M=h*p-o;for(let _=0;_<c;_++){const b=_*d-r;g.push(b,-M,0),x.push(0,0,1),f.push(_/a),f.push(1-h/l)}}for(let h=0;h<l;h++)for(let M=0;M<a;M++){const _=M+c*h,b=M+c*(h+1),S=M+1+c*(h+1),y=M+1+c*h;m.push(_,b,y),m.push(b,S,y)}this.setIndex(m),this.setAttribute("position",new Ci(g,3)),this.setAttribute("normal",new Ci(x,3)),this.setAttribute("uv",new Ci(f,2))}copy(t){return super.copy(t),this.parameters=Object.assign({},t.parameters),this}static fromJSON(t){return new Lc(t.width,t.height,t.widthSegments,t.heightSegments)}}class xS extends bo{constructor(t){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new He(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new He(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=Uf,this.normalScale=new Ne(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new us,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(t)}copy(t){return super.copy(t),this.defines={STANDARD:""},this.color.copy(t.color),this.roughness=t.roughness,this.metalness=t.metalness,this.map=t.map,this.lightMap=t.lightMap,this.lightMapIntensity=t.lightMapIntensity,this.aoMap=t.aoMap,this.aoMapIntensity=t.aoMapIntensity,this.emissive.copy(t.emissive),this.emissiveMap=t.emissiveMap,this.emissiveIntensity=t.emissiveIntensity,this.bumpMap=t.bumpMap,this.bumpScale=t.bumpScale,this.normalMap=t.normalMap,this.normalMapType=t.normalMapType,this.normalScale.copy(t.normalScale),this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.roughnessMap=t.roughnessMap,this.metalnessMap=t.metalnessMap,this.alphaMap=t.alphaMap,this.envMap=t.envMap,this.envMapRotation.copy(t.envMapRotation),this.envMapIntensity=t.envMapIntensity,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this.wireframeLinecap=t.wireframeLinecap,this.wireframeLinejoin=t.wireframeLinejoin,this.flatShading=t.flatShading,this.fog=t.fog,this}}class dg extends bo{constructor(t){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=rm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(t)}copy(t){return super.copy(t),this.depthPacking=t.depthPacking,this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this.wireframe=t.wireframe,this.wireframeLinewidth=t.wireframeLinewidth,this}}class fg extends bo{constructor(t){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(t)}copy(t){return super.copy(t),this.map=t.map,this.alphaMap=t.alphaMap,this.displacementMap=t.displacementMap,this.displacementScale=t.displacementScale,this.displacementBias=t.displacementBias,this}}class eu extends zn{constructor(t,e=1){super(),this.isLight=!0,this.type="Light",this.color=new He(t),this.intensity=e}dispose(){}copy(t,e){return super.copy(t,e),this.color.copy(t.color),this.intensity=t.intensity,this}toJSON(t){const e=super.toJSON(t);return e.object.color=this.color.getHex(),e.object.intensity=this.intensity,this.groundColor!==void 0&&(e.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(e.object.distance=this.distance),this.angle!==void 0&&(e.object.angle=this.angle),this.decay!==void 0&&(e.object.decay=this.decay),this.penumbra!==void 0&&(e.object.penumbra=this.penumbra),this.shadow!==void 0&&(e.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(e.object.target=this.target.uuid),e}}class _S extends eu{constructor(t,e,i){super(t,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(zn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new He(e)}copy(t,e){return super.copy(t,e),this.groundColor.copy(t.groundColor),this}}const gl=new ke,dd=new dt,fd=new dt;class pg{constructor(t){this.camera=t,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ne(512,512),this.mapType=hs,this.map=null,this.mapPass=null,this.matrix=new ke,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new Jh,this._frameExtents=new Ne(1,1),this._viewportCount=1,this._viewports=[new Mn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(t){const e=this.camera,i=this.matrix;dd.setFromMatrixPosition(t.matrixWorld),e.position.copy(dd),fd.setFromMatrixPosition(t.target.matrixWorld),e.lookAt(fd),e.updateMatrixWorld(),gl.multiplyMatrices(e.projectionMatrix,e.matrixWorldInverse),this._frustum.setFromProjectionMatrix(gl,e.coordinateSystem,e.reversedDepth),e.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(gl)}getViewport(t){return this._viewports[t]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(t){return this.camera=t.camera.clone(),this.intensity=t.intensity,this.bias=t.bias,this.radius=t.radius,this.autoUpdate=t.autoUpdate,this.needsUpdate=t.needsUpdate,this.normalBias=t.normalBias,this.blurSamples=t.blurSamples,this.mapSize.copy(t.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const t={};return this.intensity!==1&&(t.intensity=this.intensity),this.bias!==0&&(t.bias=this.bias),this.normalBias!==0&&(t.normalBias=this.normalBias),this.radius!==1&&(t.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(t.mapSize=this.mapSize.toArray()),t.camera=this.camera.toJSON(!1).object,delete t.camera.matrix,t}}class Kf extends Wf{constructor(t=-1,e=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=t,this.right=e,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(t,e){return super.copy(t,e),this.left=t.left,this.right=t.right,this.top=t.top,this.bottom=t.bottom,this.near=t.near,this.far=t.far,this.zoom=t.zoom,this.view=t.view===null?null:Object.assign({},t.view),this}setViewOffset(t,e,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=t,this.view.fullHeight=e,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const t=(this.right-this.left)/(2*this.zoom),e=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-t,o=i+t,a=s+e,l=s-e;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(t){const e=super.toJSON(t);return e.object.zoom=this.zoom,e.object.left=this.left,e.object.right=this.right,e.object.top=this.top,e.object.bottom=this.bottom,e.object.near=this.near,e.object.far=this.far,this.view!==null&&(e.object.view=Object.assign({},this.view)),e}}class mg extends pg{constructor(){super(new Kf(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class bS extends eu{constructor(t,e){super(t,e),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(zn.DEFAULT_UP),this.updateMatrix(),this.target=new zn,this.shadow=new mg}dispose(){this.shadow.dispose()}copy(t){return super.copy(t),this.target=t.target.clone(),this.shadow=t.shadow.clone(),this}}class MS extends eu{constructor(t,e){super(t,e),this.isAmbientLight=!0,this.type="AmbientLight"}}class gg extends ji{constructor(t=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=t}}class vS{constructor(t,e,i,s,r,o=!1){this.isGLBufferAttribute=!0,this.name="",this.buffer=t,this.type=e,this.itemSize=i,this.elementSize=s,this.count=r,this.normalized=o,this.version=0}set needsUpdate(t){t===!0&&this.version++}setBuffer(t){return this.buffer=t,this}setType(t,e){return this.type=t,this.elementSize=e,this}setItemSize(t){return this.itemSize=t,this}setCount(t){return this.count=t,this}}class pd{constructor(t=1,e=0,i=0){this.radius=t,this.phi=e,this.theta=i}set(t,e,i){return this.radius=t,this.phi=e,this.theta=i,this}copy(t){return this.radius=t.radius,this.phi=t.phi,this.theta=t.theta,this}makeSafe(){return this.phi=Ve(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(t){return this.setFromCartesianCoords(t.x,t.y,t.z)}setFromCartesianCoords(t,e,i){return this.radius=Math.sqrt(t*t+e*e+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(t,i),this.phi=Math.acos(Ve(e/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const qs=new dt,Xa=new ke,xl=new ke;class yS extends Yf{constructor(t){const e=Zf(t),i=new Hi,s=[],r=[];for(let c=0;c<e.length;c++){const u=e[c];u.parent&&u.parent.isBone&&(s.push(0,0,0),s.push(0,0,0),r.push(0,0,0),r.push(0,0,0))}i.setAttribute("position",new Ci(s,3)),i.setAttribute("color",new Ci(r,3));const o=new tu({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(i,o),this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=t,this.bones=e,this.matrix=t.matrixWorld,this.matrixAutoUpdate=!1;const a=new He(255),l=new He(65280);this.setColors(a,l)}updateMatrixWorld(t){const e=this.bones,i=this.geometry,s=i.getAttribute("position");xl.copy(this.root.matrixWorld).invert();for(let r=0,o=0;r<e.length;r++){const a=e[r];a.parent&&a.parent.isBone&&(Xa.multiplyMatrices(xl,a.matrixWorld),qs.setFromMatrixPosition(Xa),s.setXYZ(o,qs.x,qs.y,qs.z),Xa.multiplyMatrices(xl,a.parent.matrixWorld),qs.setFromMatrixPosition(Xa),s.setXYZ(o+1,qs.x,qs.y,qs.z),o+=2)}i.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(t)}setColors(t,e){const s=this.geometry.getAttribute("color");for(let r=0;r<s.count;r+=2)s.setXYZ(r,t.r,t.g,t.b),s.setXYZ(r+1,e.r,e.g,e.b);return s.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}function Zf(n){const t=[];n.isBone===!0&&t.push(n);for(let e=0;e<n.children.length;e++)t.push(...Zf(n.children[e]));return t}class SS extends Yf{constructor(t=10,e=10,i=4473924,s=8947848){i=new He(i),s=new He(s);const r=e/2,o=t/e,a=t/2,l=[],c=[];for(let p=0,m=0,g=-a;p<=e;p++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const x=p===r?i:s;x.toArray(c,m),m+=3,x.toArray(c,m),m+=3,x.toArray(c,m),m+=3,x.toArray(c,m),m+=3}const u=new Hi;u.setAttribute("position",new Ci(l,3)),u.setAttribute("color",new Ci(c,3));const d=new tu({vertexColors:!0,toneMapped:!1});super(u,d),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class xg extends vr{constructor(t,e=null){super(),this.object=t,this.domElement=e,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(t){if(t===void 0){ve("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=t}disconnect(){}dispose(){}update(){}}function md(n,t,e,i){const s=_g(i);switch(e){case Df:return n*t;case Xh:return n*t/s.components*s.byteLength;case qh:return n*t/s.components*s.byteLength;case Yh:return n*t*2/s.components*s.byteLength;case jh:return n*t*2/s.components*s.byteLength;case If:return n*t*3/s.components*s.byteLength;case Vi:return n*t*4/s.components*s.byteLength;case $h:return n*t*4/s.components*s.byteLength;case ac:case cc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case lc:case hc:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case th:case nh:return Math.max(n,16)*Math.max(t,8)/4;case Jl:case eh:return Math.max(n,8)*Math.max(t,8)/2;case ih:case sh:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*8;case rh:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case oh:return Math.floor((n+3)/4)*Math.floor((t+3)/4)*16;case ah:return Math.floor((n+4)/5)*Math.floor((t+3)/4)*16;case ch:return Math.floor((n+4)/5)*Math.floor((t+4)/5)*16;case lh:return Math.floor((n+5)/6)*Math.floor((t+4)/5)*16;case hh:return Math.floor((n+5)/6)*Math.floor((t+5)/6)*16;case uh:return Math.floor((n+7)/8)*Math.floor((t+4)/5)*16;case dh:return Math.floor((n+7)/8)*Math.floor((t+5)/6)*16;case fh:return Math.floor((n+7)/8)*Math.floor((t+7)/8)*16;case ph:return Math.floor((n+9)/10)*Math.floor((t+4)/5)*16;case mh:return Math.floor((n+9)/10)*Math.floor((t+5)/6)*16;case gh:return Math.floor((n+9)/10)*Math.floor((t+7)/8)*16;case xh:return Math.floor((n+9)/10)*Math.floor((t+9)/10)*16;case _h:return Math.floor((n+11)/12)*Math.floor((t+9)/10)*16;case bh:return Math.floor((n+11)/12)*Math.floor((t+11)/12)*16;case Mh:case vh:case yh:return Math.ceil(n/4)*Math.ceil(t/4)*16;case Sh:case Eh:return Math.ceil(n/4)*Math.ceil(t/4)*8;case wh:case Th:return Math.ceil(n/4)*Math.ceil(t/4)*16}throw new Error(`Unable to determine texture byte length for ${e} format.`)}function _g(n){switch(n){case hs:case Rf:return{byteLength:1,components:1};case ia:case Cf:case _o:return{byteLength:2,components:1};case Gh:case Wh:return{byteLength:2,components:4};case br:case Hh:case zi:return{byteLength:4,components:1};case Lf:case Pf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"181"}}));typeof window<"u"&&(window.__THREE__?ve("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="181");function Qf(){let n=null,t=!1,e=null,i=null;function s(r,o){e(r,o),i=n.requestAnimationFrame(s)}return{start:function(){t!==!0&&e!==null&&(i=n.requestAnimationFrame(s),t=!0)},stop:function(){n.cancelAnimationFrame(i),t=!1},setAnimationLoop:function(r){e=r},setContext:function(r){n=r}}}function bg(n){const t=new WeakMap;function e(a,l){const c=a.array,u=a.usage,d=c.byteLength,p=n.createBuffer();n.bindBuffer(l,p),n.bufferData(l,c,u),a.onUploadCallback();let m;if(c instanceof Float32Array)m=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)m=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)m=n.SHORT;else if(c instanceof Uint32Array)m=n.UNSIGNED_INT;else if(c instanceof Int32Array)m=n.INT;else if(c instanceof Int8Array)m=n.BYTE;else if(c instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:p,type:m,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function i(a,l,c){const u=l.array,d=l.updateRanges;if(n.bindBuffer(c,a),d.length===0)n.bufferSubData(c,0,u);else{d.sort((m,g)=>m.start-g.start);let p=0;for(let m=1;m<d.length;m++){const g=d[p],x=d[m];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++p,d[p]=x)}d.length=p+1;for(let m=0,g=d.length;m<g;m++){const x=d[m];n.bufferSubData(c,x.start*u.BYTES_PER_ELEMENT,u,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),t.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=t.get(a);l&&(n.deleteBuffer(l.buffer),t.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=t.get(a);(!u||u.version<a.version)&&t.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=t.get(a);if(c===void 0)t.set(a,e(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Mg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,vg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,yg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Sg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Eg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,wg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Tg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,Ag=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Rg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec3 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 ).rgb;
	}
#endif`,Cg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Lg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Pg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Dg=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,Ig=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Ug=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Ng=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,Og=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Fg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,kg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,zg=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Bg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Vg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,Hg=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif
#ifdef USE_BATCHING_COLOR
	vec3 batchingColor = getBatchingColor( getIndirectIndex( gl_DrawID ) );
	vColor.xyz *= batchingColor.xyz;
#endif`,Gg=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Wg=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Xg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,qg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Yg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,jg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,$g=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Kg="gl_FragColor = linearToOutputTexel( gl_FragColor );",Zg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Qg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Jg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,tx=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,ex=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,nx=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,ix=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,sx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,rx=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,ox=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ax=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,cx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,lx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,hx=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,ux=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,dx=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,fx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,px=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,mx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,gx=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,xx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = mix( min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( 0.04 ), diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.07, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,_x=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	float roughness;
	vec3 specularColor;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return saturate(v);
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColor;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float a = roughness < 0.25 ? -339.2 * r2 + 161.4 * roughness - 25.9 : -8.48 * r2 + 14.3 * roughness - 9.95;
	float b = roughness < 0.25 ? 44.0 * r2 - 23.7 * roughness + 3.26 : 1.97 * r2 - 3.27 * roughness + 0.72;
	float DG = exp( a * dotNV + b ) + ( roughness < 0.25 ? 0.0 : 0.1 * ( roughness - 0.25 ) );
	return saturate( DG * RECIPROCAL_PI );
}
vec2 DFGApprox( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 uv = vec2( roughness, dotNV );
	return texture2D( dfgLUT, uv ).rg;
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	vec2 fab = DFGApprox( normal, viewDir, roughness );
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNV * dotNV), 0.0, dotNV), material.roughness );
	vec2 dfgL = DFGApprox( vec3(0.0, 0.0, 1.0), vec3(sqrt(1.0 - dotNL * dotNL), 0.0, dotNL), material.roughness );
	vec3 FssEss_V = material.specularColor * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColor * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColor + ( 1.0 - material.specularColor ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
	#endif
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnel, material.roughness, singleScattering, multiScattering );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScattering, multiScattering );
	#endif
	vec3 totalScattering = singleScattering + multiScattering;
	vec3 diffuse = material.diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );
	reflectedLight.indirectSpecular += radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,bx=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnel = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,Mx=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getIBLIrradiance( geometryNormal );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,vx=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,yx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Sx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ex=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,wx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Tx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Ax=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Rx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,Cx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Lx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Px=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Dx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Ix=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Ux=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Nx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Ox=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Fx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,kx=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,zx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Bx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Vx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Hx=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Gx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Wx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Xx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,qx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Yx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,jx=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return depth * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * depth - far );
}`,$x=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,Kx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Zx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Qx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Jx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,t1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,e1=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		float depth = unpackRGBAToDepth( texture2D( depths, uv ) );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			return step( depth, compare );
		#else
			return step( compare, depth );
		#endif
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow( sampler2D shadow, vec2 uv, float compare ) {
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		#ifdef USE_REVERSED_DEPTH_BUFFER
			float hard_shadow = step( distribution.x, compare );
		#else
			float hard_shadow = step( compare, distribution.x );
		#endif
		if ( hard_shadow != 1.0 ) {
			float distance = compare - distribution.x;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
		bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ),
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ),
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		
		float lightToPositionLength = length( lightToPosition );
		if ( lightToPositionLength - shadowCameraFar <= 0.0 && lightToPositionLength - shadowCameraNear >= 0.0 ) {
			float dp = ( lightToPositionLength - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
			#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
				vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
				shadow = (
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
					texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
				) * ( 1.0 / 9.0 );
			#else
				shadow = texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
			#endif
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
#endif`,n1=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,i1=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,s1=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,r1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,o1=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,a1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,c1=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,l1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,h1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,u1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,d1=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,f1=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseColor, material.specularColor, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,p1=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,m1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,g1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,x1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,_1=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const b1=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,M1=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,v1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,y1=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,S1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,E1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,w1=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,T1=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,A1=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,R1=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,C1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,L1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,P1=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,D1=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,I1=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,U1=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,N1=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,O1=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,F1=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,k1=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,z1=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,B1=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <packing>
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,V1=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,H1=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,G1=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,W1=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
		float sheenEnergyComp = 1.0 - 0.157 * max3( material.sheenColor );
		outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,X1=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,q1=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Y1=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,j1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,$1=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,K1=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Z1=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Q1=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Fe={alphahash_fragment:Mg,alphahash_pars_fragment:vg,alphamap_fragment:yg,alphamap_pars_fragment:Sg,alphatest_fragment:Eg,alphatest_pars_fragment:wg,aomap_fragment:Tg,aomap_pars_fragment:Ag,batching_pars_vertex:Rg,batching_vertex:Cg,begin_vertex:Lg,beginnormal_vertex:Pg,bsdfs:Dg,iridescence_fragment:Ig,bumpmap_pars_fragment:Ug,clipping_planes_fragment:Ng,clipping_planes_pars_fragment:Og,clipping_planes_pars_vertex:Fg,clipping_planes_vertex:kg,color_fragment:zg,color_pars_fragment:Bg,color_pars_vertex:Vg,color_vertex:Hg,common:Gg,cube_uv_reflection_fragment:Wg,defaultnormal_vertex:Xg,displacementmap_pars_vertex:qg,displacementmap_vertex:Yg,emissivemap_fragment:jg,emissivemap_pars_fragment:$g,colorspace_fragment:Kg,colorspace_pars_fragment:Zg,envmap_fragment:Qg,envmap_common_pars_fragment:Jg,envmap_pars_fragment:tx,envmap_pars_vertex:ex,envmap_physical_pars_fragment:dx,envmap_vertex:nx,fog_vertex:ix,fog_pars_vertex:sx,fog_fragment:rx,fog_pars_fragment:ox,gradientmap_pars_fragment:ax,lightmap_pars_fragment:cx,lights_lambert_fragment:lx,lights_lambert_pars_fragment:hx,lights_pars_begin:ux,lights_toon_fragment:fx,lights_toon_pars_fragment:px,lights_phong_fragment:mx,lights_phong_pars_fragment:gx,lights_physical_fragment:xx,lights_physical_pars_fragment:_x,lights_fragment_begin:bx,lights_fragment_maps:Mx,lights_fragment_end:vx,logdepthbuf_fragment:yx,logdepthbuf_pars_fragment:Sx,logdepthbuf_pars_vertex:Ex,logdepthbuf_vertex:wx,map_fragment:Tx,map_pars_fragment:Ax,map_particle_fragment:Rx,map_particle_pars_fragment:Cx,metalnessmap_fragment:Lx,metalnessmap_pars_fragment:Px,morphinstance_vertex:Dx,morphcolor_vertex:Ix,morphnormal_vertex:Ux,morphtarget_pars_vertex:Nx,morphtarget_vertex:Ox,normal_fragment_begin:Fx,normal_fragment_maps:kx,normal_pars_fragment:zx,normal_pars_vertex:Bx,normal_vertex:Vx,normalmap_pars_fragment:Hx,clearcoat_normal_fragment_begin:Gx,clearcoat_normal_fragment_maps:Wx,clearcoat_pars_fragment:Xx,iridescence_pars_fragment:qx,opaque_fragment:Yx,packing:jx,premultiplied_alpha_fragment:$x,project_vertex:Kx,dithering_fragment:Zx,dithering_pars_fragment:Qx,roughnessmap_fragment:Jx,roughnessmap_pars_fragment:t1,shadowmap_pars_fragment:e1,shadowmap_pars_vertex:n1,shadowmap_vertex:i1,shadowmask_pars_fragment:s1,skinbase_vertex:r1,skinning_pars_vertex:o1,skinning_vertex:a1,skinnormal_vertex:c1,specularmap_fragment:l1,specularmap_pars_fragment:h1,tonemapping_fragment:u1,tonemapping_pars_fragment:d1,transmission_fragment:f1,transmission_pars_fragment:p1,uv_pars_fragment:m1,uv_pars_vertex:g1,uv_vertex:x1,worldpos_vertex:_1,background_vert:b1,background_frag:M1,backgroundCube_vert:v1,backgroundCube_frag:y1,cube_vert:S1,cube_frag:E1,depth_vert:w1,depth_frag:T1,distanceRGBA_vert:A1,distanceRGBA_frag:R1,equirect_vert:C1,equirect_frag:L1,linedashed_vert:P1,linedashed_frag:D1,meshbasic_vert:I1,meshbasic_frag:U1,meshlambert_vert:N1,meshlambert_frag:O1,meshmatcap_vert:F1,meshmatcap_frag:k1,meshnormal_vert:z1,meshnormal_frag:B1,meshphong_vert:V1,meshphong_frag:H1,meshphysical_vert:G1,meshphysical_frag:W1,meshtoon_vert:X1,meshtoon_frag:q1,points_vert:Y1,points_frag:j1,shadow_vert:$1,shadow_frag:K1,sprite_vert:Z1,sprite_frag:Q1},Kt={common:{diffuse:{value:new He(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new Ne(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new He(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new He(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new He(16777215)},opacity:{value:1},center:{value:new Ne(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},os={basic:{uniforms:oi([Kt.common,Kt.specularmap,Kt.envmap,Kt.aomap,Kt.lightmap,Kt.fog]),vertexShader:Fe.meshbasic_vert,fragmentShader:Fe.meshbasic_frag},lambert:{uniforms:oi([Kt.common,Kt.specularmap,Kt.envmap,Kt.aomap,Kt.lightmap,Kt.emissivemap,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,Kt.fog,Kt.lights,{emissive:{value:new He(0)}}]),vertexShader:Fe.meshlambert_vert,fragmentShader:Fe.meshlambert_frag},phong:{uniforms:oi([Kt.common,Kt.specularmap,Kt.envmap,Kt.aomap,Kt.lightmap,Kt.emissivemap,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,Kt.fog,Kt.lights,{emissive:{value:new He(0)},specular:{value:new He(1118481)},shininess:{value:30}}]),vertexShader:Fe.meshphong_vert,fragmentShader:Fe.meshphong_frag},standard:{uniforms:oi([Kt.common,Kt.envmap,Kt.aomap,Kt.lightmap,Kt.emissivemap,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,Kt.roughnessmap,Kt.metalnessmap,Kt.fog,Kt.lights,{emissive:{value:new He(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag},toon:{uniforms:oi([Kt.common,Kt.aomap,Kt.lightmap,Kt.emissivemap,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,Kt.gradientmap,Kt.fog,Kt.lights,{emissive:{value:new He(0)}}]),vertexShader:Fe.meshtoon_vert,fragmentShader:Fe.meshtoon_frag},matcap:{uniforms:oi([Kt.common,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,Kt.fog,{matcap:{value:null}}]),vertexShader:Fe.meshmatcap_vert,fragmentShader:Fe.meshmatcap_frag},points:{uniforms:oi([Kt.points,Kt.fog]),vertexShader:Fe.points_vert,fragmentShader:Fe.points_frag},dashed:{uniforms:oi([Kt.common,Kt.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Fe.linedashed_vert,fragmentShader:Fe.linedashed_frag},depth:{uniforms:oi([Kt.common,Kt.displacementmap]),vertexShader:Fe.depth_vert,fragmentShader:Fe.depth_frag},normal:{uniforms:oi([Kt.common,Kt.bumpmap,Kt.normalmap,Kt.displacementmap,{opacity:{value:1}}]),vertexShader:Fe.meshnormal_vert,fragmentShader:Fe.meshnormal_frag},sprite:{uniforms:oi([Kt.sprite,Kt.fog]),vertexShader:Fe.sprite_vert,fragmentShader:Fe.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Fe.background_vert,fragmentShader:Fe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:Fe.backgroundCube_vert,fragmentShader:Fe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Fe.cube_vert,fragmentShader:Fe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Fe.equirect_vert,fragmentShader:Fe.equirect_frag},distanceRGBA:{uniforms:oi([Kt.common,Kt.displacementmap,{referencePosition:{value:new dt},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Fe.distanceRGBA_vert,fragmentShader:Fe.distanceRGBA_frag},shadow:{uniforms:oi([Kt.lights,Kt.fog,{color:{value:new He(0)},opacity:{value:1}}]),vertexShader:Fe.shadow_vert,fragmentShader:Fe.shadow_frag}};os.physical={uniforms:oi([os.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new Ne(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new He(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new Ne},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new He(0)},specularColor:{value:new He(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new Ne},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:Fe.meshphysical_vert,fragmentShader:Fe.meshphysical_frag};const qa={r:0,b:0,g:0},hr=new us,J1=new ke;function t_(n,t,e,i,s,r,o){const a=new He(0);let l=r===!0?0:1,c,u,d=null,p=0,m=null;function g(_){let b=_.isScene===!0?_.background:null;return b&&b.isTexture&&(b=(_.backgroundBlurriness>0?e:t).get(b)),b}function x(_){let b=!1;const S=g(_);S===null?h(a,l):S&&S.isColor&&(h(S,1),b=!0);const y=n.xr.getEnvironmentBlendMode();y==="additive"?i.buffers.color.setClear(0,0,0,1,o):y==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||b)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function f(_,b){const S=g(b);S&&(S.isCubeTexture||S.mapping===Rc)?(u===void 0&&(u=new ts(new da(1e4,1e4,1e4),new Us({name:"BackgroundCubeMaterial",uniforms:fo(os.backgroundCube.uniforms),vertexShader:os.backgroundCube.vertexShader,fragmentShader:os.backgroundCube.fragmentShader,side:xi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(y,E,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),hr.copy(b.backgroundRotation),hr.x*=-1,hr.y*=-1,hr.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(hr.y*=-1,hr.z*=-1),u.material.uniforms.envMap.value=S,u.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(J1.makeRotationFromEuler(hr)),u.material.toneMapped=en.getTransfer(S.colorSpace)!==un,(d!==S||p!==S.version||m!==n.toneMapping)&&(u.material.needsUpdate=!0,d=S,p=S.version,m=n.toneMapping),u.layers.enableAll(),_.unshift(u,u.geometry,u.material,0,0,null)):S&&S.isTexture&&(c===void 0&&(c=new ts(new Lc(2,2),new Us({name:"BackgroundMaterial",uniforms:fo(os.background.uniforms),vertexShader:os.background.vertexShader,fragmentShader:os.background.fragmentShader,side:er,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=S,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.toneMapped=en.getTransfer(S.colorSpace)!==un,S.matrixAutoUpdate===!0&&S.updateMatrix(),c.material.uniforms.uvTransform.value.copy(S.matrix),(d!==S||p!==S.version||m!==n.toneMapping)&&(c.material.needsUpdate=!0,d=S,p=S.version,m=n.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function h(_,b){_.getRGB(qa,Gf(n)),i.buffers.color.setClear(qa.r,qa.g,qa.b,b,o)}function M(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(_,b=1){a.set(_),l=b,h(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,h(a,l)},render:x,addToRenderList:f,dispose:M}}function e_(n,t){const e=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=p(null);let r=s,o=!1;function a(T,C,I,F,V){let Y=!1;const P=d(F,I,C);r!==P&&(r=P,c(r.object)),Y=m(T,F,I,V),Y&&g(T,F,I,V),V!==null&&t.update(V,n.ELEMENT_ARRAY_BUFFER),(Y||o)&&(o=!1,b(T,C,I,F),V!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,t.get(V).buffer))}function l(){return n.createVertexArray()}function c(T){return n.bindVertexArray(T)}function u(T){return n.deleteVertexArray(T)}function d(T,C,I){const F=I.wireframe===!0;let V=i[T.id];V===void 0&&(V={},i[T.id]=V);let Y=V[C.id];Y===void 0&&(Y={},V[C.id]=Y);let P=Y[F];return P===void 0&&(P=p(l()),Y[F]=P),P}function p(T){const C=[],I=[],F=[];for(let V=0;V<e;V++)C[V]=0,I[V]=0,F[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:I,attributeDivisors:F,object:T,attributes:{},index:null}}function m(T,C,I,F){const V=r.attributes,Y=C.attributes;let P=0;const H=I.getAttributes();for(const W in H)if(H[W].location>=0){const N=V[W];let tt=Y[W];if(tt===void 0&&(W==="instanceMatrix"&&T.instanceMatrix&&(tt=T.instanceMatrix),W==="instanceColor"&&T.instanceColor&&(tt=T.instanceColor)),N===void 0||N.attribute!==tt||tt&&N.data!==tt.data)return!0;P++}return r.attributesNum!==P||r.index!==F}function g(T,C,I,F){const V={},Y=C.attributes;let P=0;const H=I.getAttributes();for(const W in H)if(H[W].location>=0){let N=Y[W];N===void 0&&(W==="instanceMatrix"&&T.instanceMatrix&&(N=T.instanceMatrix),W==="instanceColor"&&T.instanceColor&&(N=T.instanceColor));const tt={};tt.attribute=N,N&&N.data&&(tt.data=N.data),V[W]=tt,P++}r.attributes=V,r.attributesNum=P,r.index=F}function x(){const T=r.newAttributes;for(let C=0,I=T.length;C<I;C++)T[C]=0}function f(T){h(T,0)}function h(T,C){const I=r.newAttributes,F=r.enabledAttributes,V=r.attributeDivisors;I[T]=1,F[T]===0&&(n.enableVertexAttribArray(T),F[T]=1),V[T]!==C&&(n.vertexAttribDivisor(T,C),V[T]=C)}function M(){const T=r.newAttributes,C=r.enabledAttributes;for(let I=0,F=C.length;I<F;I++)C[I]!==T[I]&&(n.disableVertexAttribArray(I),C[I]=0)}function _(T,C,I,F,V,Y,P){P===!0?n.vertexAttribIPointer(T,C,I,V,Y):n.vertexAttribPointer(T,C,I,F,V,Y)}function b(T,C,I,F){x();const V=F.attributes,Y=I.getAttributes(),P=C.defaultAttributeValues;for(const H in Y){const W=Y[H];if(W.location>=0){let j=V[H];if(j===void 0&&(H==="instanceMatrix"&&T.instanceMatrix&&(j=T.instanceMatrix),H==="instanceColor"&&T.instanceColor&&(j=T.instanceColor)),j!==void 0){const N=j.normalized,tt=j.itemSize,$=t.get(j);if($===void 0)continue;const ut=$.buffer,st=$.type,nt=$.bytesPerElement,K=st===n.INT||st===n.UNSIGNED_INT||j.gpuType===Hh;if(j.isInterleavedBufferAttribute){const ct=j.data,rt=ct.stride,pt=j.offset;if(ct.isInstancedInterleavedBuffer){for(let X=0;X<W.locationSize;X++)h(W.location+X,ct.meshPerAttribute);T.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=ct.meshPerAttribute*ct.count)}else for(let X=0;X<W.locationSize;X++)f(W.location+X);n.bindBuffer(n.ARRAY_BUFFER,ut);for(let X=0;X<W.locationSize;X++)_(W.location+X,tt/W.locationSize,st,N,rt*nt,(pt+tt/W.locationSize*X)*nt,K)}else{if(j.isInstancedBufferAttribute){for(let ct=0;ct<W.locationSize;ct++)h(W.location+ct,j.meshPerAttribute);T.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=j.meshPerAttribute*j.count)}else for(let ct=0;ct<W.locationSize;ct++)f(W.location+ct);n.bindBuffer(n.ARRAY_BUFFER,ut);for(let ct=0;ct<W.locationSize;ct++)_(W.location+ct,tt/W.locationSize,st,N,tt*nt,tt/W.locationSize*ct*nt,K)}}else if(P!==void 0){const N=P[H];if(N!==void 0)switch(N.length){case 2:n.vertexAttrib2fv(W.location,N);break;case 3:n.vertexAttrib3fv(W.location,N);break;case 4:n.vertexAttrib4fv(W.location,N);break;default:n.vertexAttrib1fv(W.location,N)}}}}M()}function S(){R();for(const T in i){const C=i[T];for(const I in C){const F=C[I];for(const V in F)u(F[V].object),delete F[V];delete C[I]}delete i[T]}}function y(T){if(i[T.id]===void 0)return;const C=i[T.id];for(const I in C){const F=C[I];for(const V in F)u(F[V].object),delete F[V];delete C[I]}delete i[T.id]}function E(T){for(const C in i){const I=i[C];if(I[T.id]===void 0)continue;const F=I[T.id];for(const V in F)u(F[V].object),delete F[V];delete I[T.id]}}function R(){w(),o=!0,r!==s&&(r=s,c(r.object))}function w(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:R,resetDefaultState:w,dispose:S,releaseStatesOfGeometry:y,releaseStatesOfProgram:E,initAttributes:x,enableAttribute:f,disableUnusedAttributes:M}}function n_(n,t,e){let i;function s(c){i=c}function r(c,u){n.drawArrays(i,c,u),e.update(u,i,1)}function o(c,u,d){d!==0&&(n.drawArraysInstanced(i,c,u,d),e.update(u,i,d))}function a(c,u,d){if(d===0)return;t.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,d);let m=0;for(let g=0;g<d;g++)m+=u[g];e.update(m,i,1)}function l(c,u,d,p){if(d===0)return;const m=t.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<c.length;g++)o(c[g],u[g],p[g]);else{m.multiDrawArraysInstancedWEBGL(i,c,0,u,0,p,0,d);let g=0;for(let x=0;x<d;x++)g+=u[x]*p[x];e.update(g,i,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function i_(n,t,e,i){let s;function r(){if(s!==void 0)return s;if(t.has("EXT_texture_filter_anisotropic")===!0){const E=t.get("EXT_texture_filter_anisotropic");s=n.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(E){return!(E!==Vi&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const R=E===_o&&(t.has("EXT_color_buffer_half_float")||t.has("EXT_color_buffer_float"));return!(E!==hs&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==zi&&!R)}function l(E){if(E==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=e.precision!==void 0?e.precision:"highp";const u=l(c);u!==c&&(ve("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const d=e.logarithmicDepthBuffer===!0,p=e.reversedDepthBuffer===!0&&t.has("EXT_clip_control"),m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_TEXTURE_SIZE),f=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),h=n.getParameter(n.MAX_VERTEX_ATTRIBS),M=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),_=n.getParameter(n.MAX_VARYING_VECTORS),b=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),S=g>0,y=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:p,maxTextures:m,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:f,maxAttributes:h,maxVertexUniforms:M,maxVaryings:_,maxFragmentUniforms:b,vertexTextures:S,maxSamples:y}}function s_(n){const t=this;let e=null,i=0,s=!1,r=!1;const o=new $s,a=new Ue,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,p){const m=d.length!==0||p||i!==0||s;return s=p,i=d.length,m},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,p){e=u(d,p,0)},this.setState=function(d,p,m){const g=d.clippingPlanes,x=d.clipIntersection,f=d.clipShadows,h=n.get(d);if(!s||g===null||g.length===0||r&&!f)r?u(null):c();else{const M=r?0:i,_=M*4;let b=h.clippingState||null;l.value=b,b=u(g,p,_,m);for(let S=0;S!==_;++S)b[S]=e[S];h.clippingState=b,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==e&&(l.value=e,l.needsUpdate=i>0),t.numPlanes=i,t.numIntersection=0}function u(d,p,m,g){const x=d!==null?d.length:0;let f=null;if(x!==0){if(f=l.value,g!==!0||f===null){const h=m+x*4,M=p.matrixWorldInverse;a.getNormalMatrix(M),(f===null||f.length<h)&&(f=new Float32Array(h));for(let _=0,b=m;_!==x;++_,b+=4)o.copy(d[_]).applyMatrix4(M,a),o.normal.toArray(f,b),f[b+3]=o.constant}l.value=f,l.needsUpdate=!0}return t.numPlanes=x,t.numIntersection=0,f}}function r_(n){let t=new WeakMap;function e(o,a){return a===$l?o.mapping=co:a===Kl&&(o.mapping=lo),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===$l||a===Kl)if(t.has(o)){const l=t.get(o).texture;return e(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new ng(l.height);return c.fromEquirectangularTexture(n,o),t.set(o,c),o.addEventListener("dispose",s),e(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=t.get(a);l!==void 0&&(t.delete(a),l.dispose())}function r(){t=new WeakMap}return{get:i,dispose:r}}const Js=4,gd=[.125,.215,.35,.446,.526,.582],mr=20,o_=256,Io=new Kf,xd=new He;let _l=null,bl=0,Ml=0,vl=!1;const a_=new dt;class _d{constructor(t){this._renderer=t,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(t,e=0,i=.1,s=100,r={}){const{size:o=256,position:a=a_}=r;_l=this._renderer.getRenderTarget(),bl=this._renderer.getActiveCubeFace(),Ml=this._renderer.getActiveMipmapLevel(),vl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(t,i,s,l,a),e>0&&this._blur(l,0,0,e),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(t,e=null){return this._fromTexture(t,e)}fromCubemap(t,e=null){return this._fromTexture(t,e)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=vd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Md(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(t){this._lodMax=Math.floor(Math.log2(t)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let t=0;t<this._lodMeshes.length;t++)this._lodMeshes[t].geometry.dispose()}_cleanup(t){this._renderer.setRenderTarget(_l,bl,Ml),this._renderer.xr.enabled=vl,t.scissorTest=!1,Hr(t,0,0,t.width,t.height)}_fromTexture(t,e){t.mapping===co||t.mapping===lo?this._setSize(t.image.length===0?16:t.image[0].width||t.image[0].image.width):this._setSize(t.image.width/4),_l=this._renderer.getRenderTarget(),bl=this._renderer.getActiveCubeFace(),Ml=this._renderer.getActiveMipmapLevel(),vl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=e||this._allocateTargets();return this._textureToCubeUV(t,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const t=3*Math.max(this._cubeSize,112),e=4*this._cubeSize,i={magFilter:Bi,minFilter:Bi,generateMipmaps:!1,type:_o,format:Vi,colorSpace:uo,depthBuffer:!1},s=bd(t,e,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==t||this._pingPongRenderTarget.height!==e){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=bd(t,e,i);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=c_(r)),this._blurMaterial=h_(r,t,e)}return s}_compileMaterial(t){const e=new ts(new Hi,t);this._renderer.compile(e,Io)}_sceneToCubeUV(t,e,i,s,r){const l=new ji(90,1,e,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],d=this._renderer,p=d.autoClear,m=d.toneMapping;d.getClearColor(xd),d.toneMapping=tr,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new ts(new da,new Bf({name:"PMREM.Background",side:xi,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,f=x.material;let h=!1;const M=t.background;M?M.isColor&&(f.color.copy(M),t.background=null,h=!0):(f.color.copy(xd),h=!0);for(let _=0;_<6;_++){const b=_%3;b===0?(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[_],r.y,r.z)):b===1?(l.up.set(0,0,c[_]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[_],r.z)):(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[_]));const S=this._cubeSize;Hr(s,b*S,_>2?S:0,S,S),d.setRenderTarget(s),h&&d.render(x,l),d.render(t,l)}d.toneMapping=m,d.autoClear=p,t.background=M}_textureToCubeUV(t,e){const i=this._renderer,s=t.mapping===co||t.mapping===lo;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=vd()),this._cubemapMaterial.uniforms.flipEnvMap.value=t.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Md());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=t;const l=this._cubeSize;Hr(e,0,0,3*l,2*l),i.setRenderTarget(e),i.render(o,Io)}_applyPMREM(t){const e=this._renderer,i=e.autoClear;e.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(t,r-1,r);e.autoClear=i}_applyGGXFilter(t,e,i){const s=this._renderer,r=this._pingPongRenderTarget;if(this._ggxMaterial===null){const M=3*Math.max(this._cubeSize,16),_=4*this._cubeSize;this._ggxMaterial=l_(this._lodMax,M,_)}const o=this._ggxMaterial,a=this._lodMeshes[i];a.material=o;const l=o.uniforms,c=i/(this._lodMeshes.length-1),u=e/(this._lodMeshes.length-1),d=Math.sqrt(c*c-u*u),p=.05+c*.95,m=d*p,{_lodMax:g}=this,x=this._sizeLods[i],f=3*x*(i>g-Js?i-g+Js:0),h=4*(this._cubeSize-x);l.envMap.value=t.texture,l.roughness.value=m,l.mipInt.value=g-e,Hr(r,f,h,3*x,2*x),s.setRenderTarget(r),s.render(a,Io),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-i,Hr(t,f,h,3*x,2*x),s.setRenderTarget(t),s.render(a,Io)}_blur(t,e,i,s,r){const o=this._pingPongRenderTarget;this._halfBlur(t,o,e,i,s,"latitudinal",r),this._halfBlur(o,t,i,i,s,"longitudinal",r)}_halfBlur(t,e,i,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Cn("blur direction must be either latitudinal or longitudinal!");const u=3,d=this._lodMeshes[s];d.material=c;const p=c.uniforms,m=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*mr-1),x=r/g,f=isFinite(r)?1+Math.floor(u*x):mr;f>mr&&ve(`sigmaRadians, ${r}, is too large and will clip, as it requested ${f} samples when the maximum is set to ${mr}`);const h=[];let M=0;for(let E=0;E<mr;++E){const R=E/x,w=Math.exp(-R*R/2);h.push(w),E===0?M+=w:E<f&&(M+=2*w)}for(let E=0;E<h.length;E++)h[E]=h[E]/M;p.envMap.value=t.texture,p.samples.value=f,p.weights.value=h,p.latitudinal.value=o==="latitudinal",a&&(p.poleAxis.value=a);const{_lodMax:_}=this;p.dTheta.value=g,p.mipInt.value=_-i;const b=this._sizeLods[s],S=3*b*(s>_-Js?s-_+Js:0),y=4*(this._cubeSize-b);Hr(e,S,y,3*b,2*b),l.setRenderTarget(e),l.render(d,Io)}}function c_(n){const t=[],e=[],i=[];let s=n;const r=n-Js+1+gd.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);t.push(a);let l=1/a;o>n-Js?l=gd[o-n+Js-1]:o===0&&(l=0),e.push(l);const c=1/(a-2),u=-c,d=1+c,p=[u,u,d,u,d,d,u,u,d,d,u,d],m=6,g=6,x=3,f=2,h=1,M=new Float32Array(x*g*m),_=new Float32Array(f*g*m),b=new Float32Array(h*g*m);for(let y=0;y<m;y++){const E=y%3*2/3-1,R=y>2?0:-1,w=[E,R,0,E+2/3,R,0,E+2/3,R+1,0,E,R,0,E+2/3,R+1,0,E,R+1,0];M.set(w,x*g*y),_.set(p,f*g*y);const T=[y,y,y,y,y,y];b.set(T,h*g*y)}const S=new Hi;S.setAttribute("position",new Ri(M,x)),S.setAttribute("uv",new Ri(_,f)),S.setAttribute("faceIndex",new Ri(b,h)),i.push(new ts(S,null)),s>Js&&s--}return{lodMeshes:i,sizeLods:t,sigmas:e}}function bd(n,t,e){const i=new nr(n,t,e);return i.texture.mapping=Rc,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Hr(n,t,e,i,s){n.viewport.set(t,e,i,s),n.scissor.set(t,e,i,s)}function l_(n,t,e){return new Us({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:o_,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Pc(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 3.2: Transform view direction to hemisphere configuration
				vec3 Vh = normalize(vec3(alpha * V.x, alpha * V.y, V.z));

				// Section 4.1: Orthonormal basis
				float lensq = Vh.x * Vh.x + Vh.y * Vh.y;
				vec3 T1 = lensq > 0.0 ? vec3(-Vh.y, Vh.x, 0.0) / sqrt(lensq) : vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(Vh, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + Vh.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * Vh;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Ls,depthTest:!1,depthWrite:!1})}function h_(n,t,e){const i=new Float32Array(mr),s=new dt(0,1,0);return new Us({name:"SphericalGaussianBlur",defines:{n:mr,CUBEUV_TEXEL_WIDTH:1/t,CUBEUV_TEXEL_HEIGHT:1/e,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Ls,depthTest:!1,depthWrite:!1})}function Md(){return new Us({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Ls,depthTest:!1,depthWrite:!1})}function vd(){return new Us({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Pc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Ls,depthTest:!1,depthWrite:!1})}function Pc(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}function u_(n){let t=new WeakMap,e=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===$l||l===Kl,u=l===co||l===lo;if(c||u){let d=t.get(a);const p=d!==void 0?d.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==p)return e===null&&(e=new _d(n)),d=c?e.fromEquirectangular(a,d):e.fromCubemap(a,d),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),d.texture;if(d!==void 0)return d.texture;{const m=a.image;return c&&m&&m.height>0||u&&m&&s(m)?(e===null&&(e=new _d(n)),d=c?e.fromEquirectangular(a):e.fromCubemap(a),d.texture.pmremVersion=a.pmremVersion,t.set(a,d),a.addEventListener("dispose",r),d.texture):null}}}return a}function s(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=t.get(l);c!==void 0&&(t.delete(l),c.dispose())}function o(){t=new WeakMap,e!==null&&(e.dispose(),e=null)}return{get:i,dispose:o}}function d_(n){const t={};function e(i){if(t[i]!==void 0)return t[i];const s=n.getExtension(i);return t[i]=s,s}return{has:function(i){return e(i)!==null},init:function(){e("EXT_color_buffer_float"),e("WEBGL_clip_cull_distance"),e("OES_texture_float_linear"),e("EXT_color_buffer_half_float"),e("WEBGL_multisampled_render_to_texture"),e("WEBGL_render_shared_exponent")},get:function(i){const s=e(i);return s===null&&sa("WebGLRenderer: "+i+" extension not supported."),s}}}function f_(n,t,e,i){const s={},r=new WeakMap;function o(d){const p=d.target;p.index!==null&&t.remove(p.index);for(const g in p.attributes)t.remove(p.attributes[g]);p.removeEventListener("dispose",o),delete s[p.id];const m=r.get(p);m&&(t.remove(m),r.delete(p)),i.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,e.memory.geometries--}function a(d,p){return s[p.id]===!0||(p.addEventListener("dispose",o),s[p.id]=!0,e.memory.geometries++),p}function l(d){const p=d.attributes;for(const m in p)t.update(p[m],n.ARRAY_BUFFER)}function c(d){const p=[],m=d.index,g=d.attributes.position;let x=0;if(m!==null){const M=m.array;x=m.version;for(let _=0,b=M.length;_<b;_+=3){const S=M[_+0],y=M[_+1],E=M[_+2];p.push(S,y,y,E,E,S)}}else if(g!==void 0){const M=g.array;x=g.version;for(let _=0,b=M.length/3-1;_<b;_+=3){const S=_+0,y=_+1,E=_+2;p.push(S,y,y,E,E,S)}}else return;const f=new(Of(p)?Hf:Vf)(p,1);f.version=x;const h=r.get(d);h&&t.remove(h),r.set(d,f)}function u(d){const p=r.get(d);if(p){const m=d.index;m!==null&&p.version<m.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:u}}function p_(n,t,e){let i;function s(p){i=p}let r,o;function a(p){r=p.type,o=p.bytesPerElement}function l(p,m){n.drawElements(i,m,r,p*o),e.update(m,i,1)}function c(p,m,g){g!==0&&(n.drawElementsInstanced(i,m,r,p*o,g),e.update(m,i,g))}function u(p,m,g){if(g===0)return;t.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,r,p,0,g);let f=0;for(let h=0;h<g;h++)f+=m[h];e.update(f,i,1)}function d(p,m,g,x){if(g===0)return;const f=t.get("WEBGL_multi_draw");if(f===null)for(let h=0;h<p.length;h++)c(p[h]/o,m[h],x[h]);else{f.multiDrawElementsInstancedWEBGL(i,m,0,r,p,0,x,0,g);let h=0;for(let M=0;M<g;M++)h+=m[M]*x[M];e.update(h,i,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=d}function m_(n){const t={geometries:0,textures:0},e={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(e.calls++,o){case n.TRIANGLES:e.triangles+=a*(r/3);break;case n.LINES:e.lines+=a*(r/2);break;case n.LINE_STRIP:e.lines+=a*(r-1);break;case n.LINE_LOOP:e.lines+=a*r;break;case n.POINTS:e.points+=a*r;break;default:Cn("WebGLInfo: Unknown draw mode:",o);break}}function s(){e.calls=0,e.triangles=0,e.points=0,e.lines=0}return{memory:t,render:e,programs:null,autoReset:!0,reset:s,update:i}}function g_(n,t,e){const i=new WeakMap,s=new Mn;function r(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=u!==void 0?u.length:0;let p=i.get(a);if(p===void 0||p.count!==d){let w=function(){E.dispose(),i.delete(a),a.removeEventListener("dispose",w)};p!==void 0&&p.texture.dispose();const m=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,f=a.morphAttributes.position||[],h=a.morphAttributes.normal||[],M=a.morphAttributes.color||[];let _=0;m===!0&&(_=1),g===!0&&(_=2),x===!0&&(_=3);let b=a.attributes.position.count*_,S=1;b>t.maxTextureSize&&(S=Math.ceil(b/t.maxTextureSize),b=t.maxTextureSize);const y=new Float32Array(b*S*4*d),E=new Ff(y,b,S,d);E.type=zi,E.needsUpdate=!0;const R=_*4;for(let T=0;T<d;T++){const C=f[T],I=h[T],F=M[T],V=b*S*4*T;for(let Y=0;Y<C.count;Y++){const P=Y*R;m===!0&&(s.fromBufferAttribute(C,Y),y[V+P+0]=s.x,y[V+P+1]=s.y,y[V+P+2]=s.z,y[V+P+3]=0),g===!0&&(s.fromBufferAttribute(I,Y),y[V+P+4]=s.x,y[V+P+5]=s.y,y[V+P+6]=s.z,y[V+P+7]=0),x===!0&&(s.fromBufferAttribute(F,Y),y[V+P+8]=s.x,y[V+P+9]=s.y,y[V+P+10]=s.z,y[V+P+11]=F.itemSize===4?s.w:1)}}p={count:d,texture:E,size:new Ne(b,S)},i.set(a,p),a.addEventListener("dispose",w)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,e);else{let m=0;for(let x=0;x<c.length;x++)m+=c[x];const g=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(n,"morphTargetBaseInfluence",g),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",p.texture,e),l.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}return{update:r}}class x_{constructor(t,e,i){if(this.renderer=t,this.DEFAULT_NUMVIEWS=2,this.maxNumViews=0,this.gl=i,this.extensions=e,this.available=this.extensions.has("OCULUS_multiview"),this.available){const r=this.extensions.get("OCULUS_multiview");this.maxNumViews=this.gl.getParameter(r.MAX_VIEWS_OVR),this.mat4=[],this.mat3=[],this.cameraArray=[];for(var s=0;s<this.maxNumViews;s++)this.mat4[s]=new ke,this.mat3[s]=new Ue}}getCameraArray(t){return t.isArrayCamera?t.cameras:(this.cameraArray[0]=t,this.cameraArray)}updateCameraProjectionMatricesUniform(t,e){for(var i=this.getCameraArray(t),s=0;s<i.length;s++)this.mat4[s].copy(i[s].projectionMatrix);e.setValue(this.gl,"projectionMatrices",this.mat4)}updateCameraViewMatricesUniform(t,e){for(var i=this.getCameraArray(t),s=0;s<i.length;s++)this.mat4[s].copy(i[s].matrixWorldInverse);e.setValue(this.gl,"viewMatrices",this.mat4)}updateObjectMatricesUniforms(t,e,i){for(var s=this.getCameraArray(e),r=0;r<s.length;r++)this.mat4[r].multiplyMatrices(s[r].matrixWorldInverse,t.matrixWorld),this.mat3[r].getNormalMatrix(this.mat4[r]);i.setValue(this.gl,"modelViewMatrices",this.mat4),i.setValue(this.gl,"normalMatrices",this.mat3)}}function __(n,t,e,i){let s=new WeakMap;function r(l){const c=i.render.frame,u=l.geometry,d=t.get(l,u);if(s.get(d)!==c&&(t.update(d),s.set(d,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(e.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&e.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const p=l.skeleton;s.get(p)!==c&&(p.update(),s.set(p,c))}return d}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),e.remove(c.instanceMatrix),c.instanceColor!==null&&e.remove(c.instanceColor)}return{update:r,dispose:o}}const Jf=new ci,yd=new jf(1,1),t0=new Ff,e0=new zm,n0=new Xf,Sd=[],Ed=[],wd=new Float32Array(16),Td=new Float32Array(9),Ad=new Float32Array(4);function Mo(n,t,e){const i=n[0];if(i<=0||i>0)return n;const s=t*e;let r=Sd[s];if(r===void 0&&(r=new Float32Array(s),Sd[s]=r),t!==0){i.toArray(r,0);for(let o=1,a=0;o!==t;++o)a+=e,n[o].toArray(r,a)}return r}function Bn(n,t){if(n.length!==t.length)return!1;for(let e=0,i=n.length;e<i;e++)if(n[e]!==t[e])return!1;return!0}function Vn(n,t){for(let e=0,i=t.length;e<i;e++)n[e]=t[e]}function Dc(n,t){let e=Ed[t];e===void 0&&(e=new Int32Array(t),Ed[t]=e);for(let i=0;i!==t;++i)e[i]=n.allocateTextureUnit();return e}function b_(n,t){const e=this.cache;e[0]!==t&&(n.uniform1f(this.addr,t),e[0]=t)}function M_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2f(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Bn(e,t))return;n.uniform2fv(this.addr,t),Vn(e,t)}}function v_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3f(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else if(t.r!==void 0)(e[0]!==t.r||e[1]!==t.g||e[2]!==t.b)&&(n.uniform3f(this.addr,t.r,t.g,t.b),e[0]=t.r,e[1]=t.g,e[2]=t.b);else{if(Bn(e,t))return;n.uniform3fv(this.addr,t),Vn(e,t)}}function y_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4f(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Bn(e,t))return;n.uniform4fv(this.addr,t),Vn(e,t)}}function S_(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Bn(e,t))return;n.uniformMatrix2fv(this.addr,!1,t),Vn(e,t)}else{if(Bn(e,i))return;Ad.set(i),n.uniformMatrix2fv(this.addr,!1,Ad),Vn(e,i)}}function E_(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Bn(e,t))return;n.uniformMatrix3fv(this.addr,!1,t),Vn(e,t)}else{if(Bn(e,i))return;Td.set(i),n.uniformMatrix3fv(this.addr,!1,Td),Vn(e,i)}}function w_(n,t){const e=this.cache,i=t.elements;if(i===void 0){if(Bn(e,t))return;n.uniformMatrix4fv(this.addr,!1,t),Vn(e,t)}else{if(Bn(e,i))return;wd.set(i),n.uniformMatrix4fv(this.addr,!1,wd),Vn(e,i)}}function T_(n,t){const e=this.cache;e[0]!==t&&(n.uniform1i(this.addr,t),e[0]=t)}function A_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2i(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Bn(e,t))return;n.uniform2iv(this.addr,t),Vn(e,t)}}function R_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3i(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Bn(e,t))return;n.uniform3iv(this.addr,t),Vn(e,t)}}function C_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4i(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Bn(e,t))return;n.uniform4iv(this.addr,t),Vn(e,t)}}function L_(n,t){const e=this.cache;e[0]!==t&&(n.uniform1ui(this.addr,t),e[0]=t)}function P_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y)&&(n.uniform2ui(this.addr,t.x,t.y),e[0]=t.x,e[1]=t.y);else{if(Bn(e,t))return;n.uniform2uiv(this.addr,t),Vn(e,t)}}function D_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z)&&(n.uniform3ui(this.addr,t.x,t.y,t.z),e[0]=t.x,e[1]=t.y,e[2]=t.z);else{if(Bn(e,t))return;n.uniform3uiv(this.addr,t),Vn(e,t)}}function I_(n,t){const e=this.cache;if(t.x!==void 0)(e[0]!==t.x||e[1]!==t.y||e[2]!==t.z||e[3]!==t.w)&&(n.uniform4ui(this.addr,t.x,t.y,t.z,t.w),e[0]=t.x,e[1]=t.y,e[2]=t.z,e[3]=t.w);else{if(Bn(e,t))return;n.uniform4uiv(this.addr,t),Vn(e,t)}}function U_(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(yd.compareFunction=Nf,r=yd):r=Jf,e.setTexture2D(t||r,s)}function N_(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture3D(t||e0,s)}function O_(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTextureCube(t||n0,s)}function F_(n,t,e){const i=this.cache,s=e.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),e.setTexture2DArray(t||t0,s)}function k_(n){switch(n){case 5126:return b_;case 35664:return M_;case 35665:return v_;case 35666:return y_;case 35674:return S_;case 35675:return E_;case 35676:return w_;case 5124:case 35670:return T_;case 35667:case 35671:return A_;case 35668:case 35672:return R_;case 35669:case 35673:return C_;case 5125:return L_;case 36294:return P_;case 36295:return D_;case 36296:return I_;case 35678:case 36198:case 36298:case 36306:case 35682:return U_;case 35679:case 36299:case 36307:return N_;case 35680:case 36300:case 36308:case 36293:return O_;case 36289:case 36303:case 36311:case 36292:return F_}}function z_(n,t){n.uniform1fv(this.addr,t)}function B_(n,t){const e=Mo(t,this.size,2);n.uniform2fv(this.addr,e)}function V_(n,t){const e=Mo(t,this.size,3);n.uniform3fv(this.addr,e)}function H_(n,t){const e=Mo(t,this.size,4);n.uniform4fv(this.addr,e)}function G_(n,t){const e=Mo(t,this.size,4);n.uniformMatrix2fv(this.addr,!1,e)}function W_(n,t){const e=Mo(t,this.size,9);n.uniformMatrix3fv(this.addr,!1,e)}function X_(n,t){const e=Mo(t,this.size,16);n.uniformMatrix4fv(this.addr,!1,e)}function q_(n,t){n.uniform1iv(this.addr,t)}function Y_(n,t){n.uniform2iv(this.addr,t)}function j_(n,t){n.uniform3iv(this.addr,t)}function $_(n,t){n.uniform4iv(this.addr,t)}function K_(n,t){n.uniform1uiv(this.addr,t)}function Z_(n,t){n.uniform2uiv(this.addr,t)}function Q_(n,t){n.uniform3uiv(this.addr,t)}function J_(n,t){n.uniform4uiv(this.addr,t)}function tb(n,t,e){const i=this.cache,s=t.length,r=Dc(e,s);Bn(i,r)||(n.uniform1iv(this.addr,r),Vn(i,r));for(let o=0;o!==s;++o)e.setTexture2D(t[o]||Jf,r[o])}function eb(n,t,e){const i=this.cache,s=t.length,r=Dc(e,s);Bn(i,r)||(n.uniform1iv(this.addr,r),Vn(i,r));for(let o=0;o!==s;++o)e.setTexture3D(t[o]||e0,r[o])}function nb(n,t,e){const i=this.cache,s=t.length,r=Dc(e,s);Bn(i,r)||(n.uniform1iv(this.addr,r),Vn(i,r));for(let o=0;o!==s;++o)e.setTextureCube(t[o]||n0,r[o])}function ib(n,t,e){const i=this.cache,s=t.length,r=Dc(e,s);Bn(i,r)||(n.uniform1iv(this.addr,r),Vn(i,r));for(let o=0;o!==s;++o)e.setTexture2DArray(t[o]||t0,r[o])}function sb(n){switch(n){case 5126:return z_;case 35664:return B_;case 35665:return V_;case 35666:return H_;case 35674:return G_;case 35675:return W_;case 35676:return X_;case 5124:case 35670:return q_;case 35667:case 35671:return Y_;case 35668:case 35672:return j_;case 35669:case 35673:return $_;case 5125:return K_;case 36294:return Z_;case 36295:return Q_;case 36296:return J_;case 35678:case 36198:case 36298:case 36306:case 35682:return tb;case 35679:case 36299:case 36307:return eb;case 35680:case 36300:case 36308:case 36293:return nb;case 36289:case 36303:case 36311:case 36292:return ib}}class rb{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.setValue=k_(e.type)}}class ob{constructor(t,e,i){this.id=t,this.addr=i,this.cache=[],this.type=e.type,this.size=e.size,this.setValue=sb(e.type)}}class ab{constructor(t){this.id=t,this.seq=[],this.map={}}setValue(t,e,i){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(t,e[a.id],i)}}}const yl=/(\w+)(\])?(\[|\.)?/g;function Rd(n,t){n.seq.push(t),n.map[t.id]=t}function cb(n,t,e){const i=n.name,s=i.length;for(yl.lastIndex=0;;){const r=yl.exec(i),o=yl.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Rd(e,c===void 0?new rb(a,n,t):new ob(a,n,t));break}else{let d=e.map[a];d===void 0&&(d=new ab(a),Rd(e,d)),e=d}}}class uc{constructor(t,e){this.seq=[],this.map={};const i=t.getProgramParameter(e,t.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const r=t.getActiveUniform(e,s),o=t.getUniformLocation(e,r.name);cb(r,o,this)}}setValue(t,e,i,s){const r=this.map[e];r!==void 0&&r.setValue(t,i,s)}setOptional(t,e,i){const s=e[i];s!==void 0&&this.setValue(t,i,s)}static upload(t,e,i,s){for(let r=0,o=e.length;r!==o;++r){const a=e[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(t,l.value,s)}}static seqWithValue(t,e){const i=[];for(let s=0,r=t.length;s!==r;++s){const o=t[s];o.id in e&&i.push(o)}return i}}function Cd(n,t,e){const i=n.createShader(t);return n.shaderSource(i,e),n.compileShader(i),i}const lb=37297;let hb=0;function ub(n,t){const e=n.split(`
`),i=[],s=Math.max(t-6,0),r=Math.min(t+6,e.length);for(let o=s;o<r;o++){const a=o+1;i.push(`${a===t?">":" "} ${a}: ${e[o]}`)}return i.join(`
`)}const Ld=new Ue;function db(n){en._getMatrix(Ld,en.workingColorSpace,n);const t=`mat3( ${Ld.elements.map(e=>e.toFixed(4))} )`;switch(en.getTransfer(n)){case gc:return[t,"LinearTransferOETF"];case un:return[t,"sRGBTransferOETF"];default:return ve("WebGLProgram: Unsupported color space: ",n),[t,"LinearTransferOETF"]}}function Pd(n,t,e){const i=n.getShaderParameter(t,n.COMPILE_STATUS),r=(n.getShaderInfoLog(t)||"").trim();if(i&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return e.toUpperCase()+`

`+r+`

`+ub(n.getShaderSource(t),a)}else return r}function fb(n,t){const e=db(t);return[`vec4 ${n}( vec4 value ) {`,`	return ${e[1]}( vec4( value.rgb * ${e[0]}, value.a ) );`,"}"].join(`
`)}function pb(n,t){let e;switch(t){case Kp:e="Linear";break;case Zp:e="Reinhard";break;case Qp:e="Cineon";break;case Jp:e="ACESFilmic";break;case em:e="AgX";break;case nm:e="Neutral";break;case tm:e="Custom";break;default:ve("WebGLProgram: Unsupported toneMapping:",t),e="Linear"}return"vec3 "+n+"( vec3 color ) { return "+e+"ToneMapping( color ); }"}const Ya=new dt;function mb(){en.getLuminanceCoefficients(Ya);const n=Ya.x.toFixed(4),t=Ya.y.toFixed(4),e=Ya.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${t}, ${e} );`,"	return dot( weights, rgb );","}"].join(`
`)}function gb(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Wo).join(`
`)}function xb(n){const t=[];for(const e in n){const i=n[e];i!==!1&&t.push("#define "+e+" "+i)}return t.join(`
`)}function _b(n,t){const e={},i=n.getProgramParameter(t,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(t,s),o=r.name;let a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),e[o]={type:r.type,location:n.getAttribLocation(t,o),locationSize:a}}return e}function Wo(n){return n!==""}function Dd(n,t){const e=t.numSpotLightShadows+t.numSpotLightMaps-t.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,t.numDirLights).replace(/NUM_SPOT_LIGHTS/g,t.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,t.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,e).replace(/NUM_RECT_AREA_LIGHTS/g,t.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,t.numPointLights).replace(/NUM_HEMI_LIGHTS/g,t.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,t.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,t.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,t.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,t.numPointLightShadows)}function Id(n,t){return n.replace(/NUM_CLIPPING_PLANES/g,t.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,t.numClippingPlanes-t.numClipIntersection)}const bb=/^[ \t]*#include +<([\w\d./]+)>/gm;function Ah(n){return n.replace(bb,vb)}const Mb=new Map;function vb(n,t){let e=Fe[t];if(e===void 0){const i=Mb.get(t);if(i!==void 0)e=Fe[i],ve('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',t,i);else throw new Error("Can not resolve #include <"+t+">")}return Ah(e)}const yb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Ud(n){return n.replace(yb,Sb)}function Sb(n,t,e,i){let s="";for(let r=parseInt(t);r<parseInt(e);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Nd(n){let t=`precision ${n.precision} float;
	precision ${n.precision} int;
	precision ${n.precision} sampler2D;
	precision ${n.precision} samplerCube;
	precision ${n.precision} sampler3D;
	precision ${n.precision} sampler2DArray;
	precision ${n.precision} sampler2DShadow;
	precision ${n.precision} samplerCubeShadow;
	precision ${n.precision} sampler2DArrayShadow;
	precision ${n.precision} isampler2D;
	precision ${n.precision} isampler3D;
	precision ${n.precision} isamplerCube;
	precision ${n.precision} isampler2DArray;
	precision ${n.precision} usampler2D;
	precision ${n.precision} usampler3D;
	precision ${n.precision} usamplerCube;
	precision ${n.precision} usampler2DArray;
	`;return n.precision==="highp"?t+=`
#define HIGH_PRECISION`:n.precision==="mediump"?t+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(t+=`
#define LOW_PRECISION`),t}function Eb(n){let t="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===wf?t="SHADOWMAP_TYPE_PCF":n.shadowMapType===Cp?t="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Es&&(t="SHADOWMAP_TYPE_VSM"),t}function wb(n){let t="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case co:case lo:t="ENVMAP_TYPE_CUBE";break;case Rc:t="ENVMAP_TYPE_CUBE_UV";break}return t}function Tb(n){let t="ENVMAP_MODE_REFLECTION";return n.envMap&&n.envMapMode===lo&&(t="ENVMAP_MODE_REFRACTION"),t}function Ab(n){let t="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Tf:t="ENVMAP_BLENDING_MULTIPLY";break;case jp:t="ENVMAP_BLENDING_MIX";break;case $p:t="ENVMAP_BLENDING_ADD";break}return t}function Rb(n){const t=n.envMapCubeUVHeight;if(t===null)return null;const e=Math.log2(t)-2,i=1/t;return{texelWidth:1/(3*Math.max(Math.pow(2,e),112)),texelHeight:i,maxMip:e}}function Cb(n,t,e,i){const s=n.getContext(),r=e.defines;let o=e.vertexShader,a=e.fragmentShader;const l=Eb(e),c=wb(e),u=Tb(e),d=Ab(e),p=Rb(e),m=gb(e),g=xb(r),x=s.createProgram();let f,h,M=e.glslVersion?"#version "+e.glslVersion+`
`:"";const _=e.numMultiviewViews;e.isRawShaderMaterial?(f=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Wo).join(`
`),f.length>0&&(f+=`
`),h=["#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g].filter(Wo).join(`
`),h.length>0&&(h+=`
`)):(f=[Nd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",e.batching?"#define USE_BATCHING":"",e.batchingColor?"#define USE_BATCHING_COLOR":"",e.instancing?"#define USE_INSTANCING":"",e.instancingColor?"#define USE_INSTANCING_COLOR":"",e.instancingMorph?"#define USE_INSTANCING_MORPH":"",e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.map?"#define USE_MAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+u:"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.displacementMap?"#define USE_DISPLACEMENTMAP":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.mapUv?"#define MAP_UV "+e.mapUv:"",e.alphaMapUv?"#define ALPHAMAP_UV "+e.alphaMapUv:"",e.lightMapUv?"#define LIGHTMAP_UV "+e.lightMapUv:"",e.aoMapUv?"#define AOMAP_UV "+e.aoMapUv:"",e.emissiveMapUv?"#define EMISSIVEMAP_UV "+e.emissiveMapUv:"",e.bumpMapUv?"#define BUMPMAP_UV "+e.bumpMapUv:"",e.normalMapUv?"#define NORMALMAP_UV "+e.normalMapUv:"",e.displacementMapUv?"#define DISPLACEMENTMAP_UV "+e.displacementMapUv:"",e.metalnessMapUv?"#define METALNESSMAP_UV "+e.metalnessMapUv:"",e.roughnessMapUv?"#define ROUGHNESSMAP_UV "+e.roughnessMapUv:"",e.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+e.anisotropyMapUv:"",e.clearcoatMapUv?"#define CLEARCOATMAP_UV "+e.clearcoatMapUv:"",e.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+e.clearcoatNormalMapUv:"",e.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+e.clearcoatRoughnessMapUv:"",e.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+e.iridescenceMapUv:"",e.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+e.iridescenceThicknessMapUv:"",e.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+e.sheenColorMapUv:"",e.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+e.sheenRoughnessMapUv:"",e.specularMapUv?"#define SPECULARMAP_UV "+e.specularMapUv:"",e.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+e.specularColorMapUv:"",e.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+e.specularIntensityMapUv:"",e.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+e.transmissionMapUv:"",e.thicknessMapUv?"#define THICKNESSMAP_UV "+e.thicknessMapUv:"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.flatShading?"#define FLAT_SHADED":"",e.skinning?"#define USE_SKINNING":"",e.morphTargets?"#define USE_MORPHTARGETS":"",e.morphNormals&&e.flatShading===!1?"#define USE_MORPHNORMALS":"",e.morphColors?"#define USE_MORPHCOLORS":"",e.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+e.morphTextureStride:"",e.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+e.morphTargetsCount:"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.sizeAttenuation?"#define USE_SIZEATTENUATION":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Wo).join(`
`),h=[Nd(e),"#define SHADER_TYPE "+e.shaderType,"#define SHADER_NAME "+e.shaderName,g,e.useFog&&e.fog?"#define USE_FOG":"",e.useFog&&e.fogExp2?"#define FOG_EXP2":"",e.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",e.map?"#define USE_MAP":"",e.matcap?"#define USE_MATCAP":"",e.envMap?"#define USE_ENVMAP":"",e.envMap?"#define "+c:"",e.envMap?"#define "+u:"",e.envMap?"#define "+d:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",e.lightMap?"#define USE_LIGHTMAP":"",e.aoMap?"#define USE_AOMAP":"",e.bumpMap?"#define USE_BUMPMAP":"",e.normalMap?"#define USE_NORMALMAP":"",e.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",e.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",e.emissiveMap?"#define USE_EMISSIVEMAP":"",e.anisotropy?"#define USE_ANISOTROPY":"",e.anisotropyMap?"#define USE_ANISOTROPYMAP":"",e.clearcoat?"#define USE_CLEARCOAT":"",e.clearcoatMap?"#define USE_CLEARCOATMAP":"",e.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",e.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",e.dispersion?"#define USE_DISPERSION":"",e.iridescence?"#define USE_IRIDESCENCE":"",e.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",e.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",e.specularMap?"#define USE_SPECULARMAP":"",e.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",e.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",e.roughnessMap?"#define USE_ROUGHNESSMAP":"",e.metalnessMap?"#define USE_METALNESSMAP":"",e.alphaMap?"#define USE_ALPHAMAP":"",e.alphaTest?"#define USE_ALPHATEST":"",e.alphaHash?"#define USE_ALPHAHASH":"",e.sheen?"#define USE_SHEEN":"",e.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",e.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",e.transmission?"#define USE_TRANSMISSION":"",e.transmissionMap?"#define USE_TRANSMISSIONMAP":"",e.thicknessMap?"#define USE_THICKNESSMAP":"",e.vertexTangents&&e.flatShading===!1?"#define USE_TANGENT":"",e.vertexColors||e.instancingColor||e.batchingColor?"#define USE_COLOR":"",e.vertexAlphas?"#define USE_COLOR_ALPHA":"",e.vertexUv1s?"#define USE_UV1":"",e.vertexUv2s?"#define USE_UV2":"",e.vertexUv3s?"#define USE_UV3":"",e.pointsUvs?"#define USE_POINTS_UV":"",e.gradientMap?"#define USE_GRADIENTMAP":"",e.flatShading?"#define FLAT_SHADED":"",e.doubleSided?"#define DOUBLE_SIDED":"",e.flipSided?"#define FLIP_SIDED":"",e.shadowMapEnabled?"#define USE_SHADOWMAP":"",e.shadowMapEnabled?"#define "+l:"",e.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",e.numLightProbes>0?"#define USE_LIGHT_PROBES":"",e.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",e.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",e.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",e.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",e.toneMapping!==tr?"#define TONE_MAPPING":"",e.toneMapping!==tr?Fe.tonemapping_pars_fragment:"",e.toneMapping!==tr?pb("toneMapping",e.toneMapping):"",e.dithering?"#define DITHERING":"",e.opaque?"#define OPAQUE":"",Fe.colorspace_pars_fragment,fb("linearToOutputTexel",e.outputColorSpace),mb(),e.useDepthPacking?"#define DEPTH_PACKING "+e.depthPacking:"",`
`].filter(Wo).join(`
`)),o=Ah(o),o=Dd(o,e),o=Id(o,e),a=Ah(a),a=Dd(a,e),a=Id(a,e),o=Ud(o),a=Ud(a),e.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,f=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+f,h=["#define varying in",e.glslVersion===Iu?"":"layout(location = 0) out highp vec4 pc_fragColor;",e.glslVersion===Iu?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h,_>0&&(f=["#extension GL_OVR_multiview : require","layout(num_views = "+_+") in;","#define VIEW_ID gl_ViewID_OVR"].join(`
`)+`
`+f,f=f.replace(["uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;"].join(`
`),["uniform mat4 modelViewMatrices["+_+"];","uniform mat4 projectionMatrices["+_+"];","uniform mat4 viewMatrices["+_+"];","uniform mat3 normalMatrices["+_+"];","#define modelViewMatrix modelViewMatrices[VIEW_ID]","#define projectionMatrix projectionMatrices[VIEW_ID]","#define viewMatrix viewMatrices[VIEW_ID]","#define normalMatrix normalMatrices[VIEW_ID]"].join(`
`)),h=["#extension GL_OVR_multiview : require","#define VIEW_ID gl_ViewID_OVR"].join(`
`)+`
`+h,h=h.replace("uniform mat4 viewMatrix;",["uniform mat4 viewMatrices["+_+"];","#define viewMatrix viewMatrices[VIEW_ID]"].join(`
`))));const b=M+f+o,S=M+h+a,y=Cd(s,s.VERTEX_SHADER,b),E=Cd(s,s.FRAGMENT_SHADER,S);s.attachShader(x,y),s.attachShader(x,E),e.index0AttributeName!==void 0?s.bindAttribLocation(x,0,e.index0AttributeName):e.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function R(I){if(n.debug.checkShaderErrors){const F=s.getProgramInfoLog(x)||"",V=s.getShaderInfoLog(y)||"",Y=s.getShaderInfoLog(E)||"",P=F.trim(),H=V.trim(),W=Y.trim();let j=!0,N=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(j=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,x,y,E);else{const tt=Pd(s,y,"vertex"),$=Pd(s,E,"fragment");Cn("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+P+`
`+tt+`
`+$)}else P!==""?ve("WebGLProgram: Program Info Log:",P):(H===""||W==="")&&(N=!1);N&&(I.diagnostics={runnable:j,programLog:P,vertexShader:{log:H,prefix:f},fragmentShader:{log:W,prefix:h}})}s.deleteShader(y),s.deleteShader(E),w=new uc(s,x),T=_b(s,x)}let w;this.getUniforms=function(){return w===void 0&&R(this),w};let T;this.getAttributes=function(){return T===void 0&&R(this),T};let C=e.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(x,lb)),C},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=e.shaderType,this.name=e.shaderName,this.id=hb++,this.cacheKey=t,this.usedTimes=1,this.program=x,this.vertexShader=y,this.fragmentShader=E,this.numMultiviewViews=_,this}let Lb=0;class Pb{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(t){const e=t.vertexShader,i=t.fragmentShader,s=this._getShaderStage(e),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(t);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(t){const e=this.materialCache.get(t);for(const i of e)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(t),this}getVertexShaderID(t){return this._getShaderStage(t.vertexShader).id}getFragmentShaderID(t){return this._getShaderStage(t.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(t){const e=this.materialCache;let i=e.get(t);return i===void 0&&(i=new Set,e.set(t,i)),i}_getShaderStage(t){const e=this.shaderCache;let i=e.get(t);return i===void 0&&(i=new Db(t),e.set(t,i)),i}}class Db{constructor(t){this.id=Lb++,this.code=t,this.usedTimes=0}}function Ib(n,t,e,i,s,r,o){const a=new kf,l=new Pb,c=new Set,u=[],d=s.logarithmicDepthBuffer,p=s.vertexTextures;let m=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(w){return c.add(w),w===0?"uv":`uv${w}`}function f(w,T,C,I,F){const V=I.fog,Y=F.geometry,P=w.isMeshStandardMaterial?I.environment:null,H=(w.isMeshStandardMaterial?e:t).get(w.envMap||P),W=H&&H.mapping===Rc?H.image.height:null,j=g[w.type];w.precision!==null&&(m=s.getMaxPrecision(w.precision),m!==w.precision&&ve("WebGLProgram.getParameters:",w.precision,"not supported, using",m,"instead."));const N=Y.morphAttributes.position||Y.morphAttributes.normal||Y.morphAttributes.color,tt=N!==void 0?N.length:0;let $=0;Y.morphAttributes.position!==void 0&&($=1),Y.morphAttributes.normal!==void 0&&($=2),Y.morphAttributes.color!==void 0&&($=3);let ut,st,nt,K;if(j){const jt=os[j];ut=jt.vertexShader,st=jt.fragmentShader}else ut=w.vertexShader,st=w.fragmentShader,l.update(w),nt=l.getVertexShaderID(w),K=l.getFragmentShaderID(w);const ct=n.getRenderTarget(),rt=n.state.buffers.depth.getReversed(),pt=ct&&ct.isWebGLMultiviewRenderTarget?ct.numViews:0,X=F.isInstancedMesh===!0,lt=F.isBatchedMesh===!0,J=!!w.map,mt=!!w.matcap,ot=!!H,Pt=!!w.aoMap,U=!!w.lightMap,yt=!!w.bumpMap,Dt=!!w.normalMap,It=!!w.displacementMap,ht=!!w.emissiveMap,Vt=!!w.metalnessMap,Et=!!w.roughnessMap,Lt=w.anisotropy>0,B=w.clearcoat>0,et=w.dispersion>0,gt=w.iridescence>0,k=w.sheen>0,A=w.transmission>0,v=Lt&&!!w.anisotropyMap,D=B&&!!w.clearcoatMap,q=B&&!!w.clearcoatNormalMap,Q=B&&!!w.clearcoatRoughnessMap,z=gt&&!!w.iridescenceMap,xt=gt&&!!w.iridescenceThicknessMap,bt=k&&!!w.sheenColorMap,Ut=k&&!!w.sheenRoughnessMap,ee=!!w.specularMap,Rt=!!w.specularColorMap,O=!!w.specularIntensityMap,wt=A&&!!w.transmissionMap,vt=A&&!!w.thicknessMap,At=!!w.gradientMap,Gt=!!w.alphaMap,Ct=w.alphaTest>0,pe=!!w.alphaHash,ge=!!w.extensions;let Ae=tr;w.toneMapped&&(ct===null||ct.isXRRenderTarget===!0)&&(Ae=n.toneMapping);const Bt={shaderID:j,shaderType:w.type,shaderName:w.name,vertexShader:ut,fragmentShader:st,defines:w.defines,customVertexShaderID:nt,customFragmentShaderID:K,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:m,batching:lt,batchingColor:lt&&F._colorsTexture!==null,instancing:X,instancingColor:X&&F.instanceColor!==null,instancingMorph:X&&F.morphTexture!==null,supportsVertexTextures:p,numMultiviewViews:pt,outputColorSpace:ct===null?n.outputColorSpace:ct.isXRRenderTarget===!0?ct.texture.colorSpace:uo,alphaToCoverage:!!w.alphaToCoverage,map:J,matcap:mt,envMap:ot,envMapMode:ot&&H.mapping,envMapCubeUVHeight:W,aoMap:Pt,lightMap:U,bumpMap:yt,normalMap:Dt,displacementMap:p&&It,emissiveMap:ht,normalMapObjectSpace:Dt&&w.normalMapType===am,normalMapTangentSpace:Dt&&w.normalMapType===Uf,metalnessMap:Vt,roughnessMap:Et,anisotropy:Lt,anisotropyMap:v,clearcoat:B,clearcoatMap:D,clearcoatNormalMap:q,clearcoatRoughnessMap:Q,dispersion:et,iridescence:gt,iridescenceMap:z,iridescenceThicknessMap:xt,sheen:k,sheenColorMap:bt,sheenRoughnessMap:Ut,specularMap:ee,specularColorMap:Rt,specularIntensityMap:O,transmission:A,transmissionMap:wt,thicknessMap:vt,gradientMap:At,opaque:w.transparent===!1&&w.blending===Jr&&w.alphaToCoverage===!1,alphaMap:Gt,alphaTest:Ct,alphaHash:pe,combine:w.combine,mapUv:J&&x(w.map.channel),aoMapUv:Pt&&x(w.aoMap.channel),lightMapUv:U&&x(w.lightMap.channel),bumpMapUv:yt&&x(w.bumpMap.channel),normalMapUv:Dt&&x(w.normalMap.channel),displacementMapUv:It&&x(w.displacementMap.channel),emissiveMapUv:ht&&x(w.emissiveMap.channel),metalnessMapUv:Vt&&x(w.metalnessMap.channel),roughnessMapUv:Et&&x(w.roughnessMap.channel),anisotropyMapUv:v&&x(w.anisotropyMap.channel),clearcoatMapUv:D&&x(w.clearcoatMap.channel),clearcoatNormalMapUv:q&&x(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Q&&x(w.clearcoatRoughnessMap.channel),iridescenceMapUv:z&&x(w.iridescenceMap.channel),iridescenceThicknessMapUv:xt&&x(w.iridescenceThicknessMap.channel),sheenColorMapUv:bt&&x(w.sheenColorMap.channel),sheenRoughnessMapUv:Ut&&x(w.sheenRoughnessMap.channel),specularMapUv:ee&&x(w.specularMap.channel),specularColorMapUv:Rt&&x(w.specularColorMap.channel),specularIntensityMapUv:O&&x(w.specularIntensityMap.channel),transmissionMapUv:wt&&x(w.transmissionMap.channel),thicknessMapUv:vt&&x(w.thicknessMap.channel),alphaMapUv:Gt&&x(w.alphaMap.channel),vertexTangents:!!Y.attributes.tangent&&(Dt||Lt),vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!Y.attributes.color&&Y.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!Y.attributes.uv&&(J||Gt),fog:!!V,useFog:w.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:w.flatShading===!0&&w.wireframe===!1,sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:rt,skinning:F.isSkinnedMesh===!0,morphTargets:Y.morphAttributes.position!==void 0,morphNormals:Y.morphAttributes.normal!==void 0,morphColors:Y.morphAttributes.color!==void 0,morphTargetsCount:tt,morphTextureStride:$,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:w.dithering,shadowMapEnabled:n.shadowMap.enabled&&C.length>0,shadowMapType:n.shadowMap.type,toneMapping:Ae,decodeVideoTexture:J&&w.map.isVideoTexture===!0&&en.getTransfer(w.map.colorSpace)===un,decodeVideoTextureEmissive:ht&&w.emissiveMap.isVideoTexture===!0&&en.getTransfer(w.emissiveMap.colorSpace)===un,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===As,flipSided:w.side===xi,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:ge&&w.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ge&&w.extensions.multiDraw===!0||lt)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return Bt.vertexUv1s=c.has(1),Bt.vertexUv2s=c.has(2),Bt.vertexUv3s=c.has(3),c.clear(),Bt}function h(w){const T=[];if(w.shaderID?T.push(w.shaderID):(T.push(w.customVertexShaderID),T.push(w.customFragmentShaderID)),w.defines!==void 0)for(const C in w.defines)T.push(C),T.push(w.defines[C]);return w.isRawShaderMaterial===!1&&(M(T,w),_(T,w),T.push(n.outputColorSpace)),T.push(w.customProgramCacheKey),T.join()}function M(w,T){w.push(T.precision),w.push(T.outputColorSpace),w.push(T.envMapMode),w.push(T.envMapCubeUVHeight),w.push(T.mapUv),w.push(T.alphaMapUv),w.push(T.lightMapUv),w.push(T.aoMapUv),w.push(T.bumpMapUv),w.push(T.normalMapUv),w.push(T.displacementMapUv),w.push(T.emissiveMapUv),w.push(T.metalnessMapUv),w.push(T.roughnessMapUv),w.push(T.anisotropyMapUv),w.push(T.clearcoatMapUv),w.push(T.clearcoatNormalMapUv),w.push(T.clearcoatRoughnessMapUv),w.push(T.iridescenceMapUv),w.push(T.iridescenceThicknessMapUv),w.push(T.sheenColorMapUv),w.push(T.sheenRoughnessMapUv),w.push(T.specularMapUv),w.push(T.specularColorMapUv),w.push(T.specularIntensityMapUv),w.push(T.transmissionMapUv),w.push(T.thicknessMapUv),w.push(T.combine),w.push(T.fogExp2),w.push(T.sizeAttenuation),w.push(T.morphTargetsCount),w.push(T.morphAttributeCount),w.push(T.numDirLights),w.push(T.numPointLights),w.push(T.numSpotLights),w.push(T.numSpotLightMaps),w.push(T.numHemiLights),w.push(T.numRectAreaLights),w.push(T.numDirLightShadows),w.push(T.numPointLightShadows),w.push(T.numSpotLightShadows),w.push(T.numSpotLightShadowsWithMaps),w.push(T.numLightProbes),w.push(T.shadowMapType),w.push(T.toneMapping),w.push(T.numClippingPlanes),w.push(T.numClipIntersection),w.push(T.depthPacking)}function _(w,T){a.disableAll(),T.supportsVertexTextures&&a.enable(0),T.instancing&&a.enable(1),T.instancingColor&&a.enable(2),T.instancingMorph&&a.enable(3),T.matcap&&a.enable(4),T.envMap&&a.enable(5),T.normalMapObjectSpace&&a.enable(6),T.normalMapTangentSpace&&a.enable(7),T.clearcoat&&a.enable(8),T.iridescence&&a.enable(9),T.alphaTest&&a.enable(10),T.vertexColors&&a.enable(11),T.vertexAlphas&&a.enable(12),T.vertexUv1s&&a.enable(13),T.vertexUv2s&&a.enable(14),T.vertexUv3s&&a.enable(15),T.vertexTangents&&a.enable(16),T.anisotropy&&a.enable(17),T.alphaHash&&a.enable(18),T.batching&&a.enable(19),T.dispersion&&a.enable(20),T.batchingColor&&a.enable(21),T.gradientMap&&a.enable(22),w.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),T.numMultiviewViews&&a.enable(22),w.push(a.mask)}function b(w){const T=g[w.type];let C;if(T){const I=os[T];C=Qm.clone(I.uniforms)}else C=w.uniforms;return C}function S(w,T){let C;for(let I=0,F=u.length;I<F;I++){const V=u[I];if(V.cacheKey===T){C=V,++C.usedTimes;break}}return C===void 0&&(C=new Cb(n,T,w,r),u.push(C)),C}function y(w){if(--w.usedTimes===0){const T=u.indexOf(w);u[T]=u[u.length-1],u.pop(),w.destroy()}}function E(w){l.remove(w)}function R(){l.dispose()}return{getParameters:f,getProgramCacheKey:h,getUniforms:b,acquireProgram:S,releaseProgram:y,releaseShaderCache:E,programs:u,dispose:R}}function Ub(){let n=new WeakMap;function t(o){return n.has(o)}function e(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:t,get:e,remove:i,update:s,dispose:r}}function Nb(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.material.id!==t.material.id?n.material.id-t.material.id:n.z!==t.z?n.z-t.z:n.id-t.id}function Od(n,t){return n.groupOrder!==t.groupOrder?n.groupOrder-t.groupOrder:n.renderOrder!==t.renderOrder?n.renderOrder-t.renderOrder:n.z!==t.z?t.z-n.z:n.id-t.id}function Fd(){const n=[];let t=0;const e=[],i=[],s=[];function r(){t=0,e.length=0,i.length=0,s.length=0}function o(d,p,m,g,x,f){let h=n[t];return h===void 0?(h={id:d.id,object:d,geometry:p,material:m,groupOrder:g,renderOrder:d.renderOrder,z:x,group:f},n[t]=h):(h.id=d.id,h.object=d,h.geometry=p,h.material=m,h.groupOrder=g,h.renderOrder=d.renderOrder,h.z=x,h.group=f),t++,h}function a(d,p,m,g,x,f){const h=o(d,p,m,g,x,f);m.transmission>0?i.push(h):m.transparent===!0?s.push(h):e.push(h)}function l(d,p,m,g,x,f){const h=o(d,p,m,g,x,f);m.transmission>0?i.unshift(h):m.transparent===!0?s.unshift(h):e.unshift(h)}function c(d,p){e.length>1&&e.sort(d||Nb),i.length>1&&i.sort(p||Od),s.length>1&&s.sort(p||Od)}function u(){for(let d=t,p=n.length;d<p;d++){const m=n[d];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:e,transmissive:i,transparent:s,init:r,push:a,unshift:l,finish:u,sort:c}}function Ob(){let n=new WeakMap;function t(i,s){const r=n.get(i);let o;return r===void 0?(o=new Fd,n.set(i,[o])):s>=r.length?(o=new Fd,r.push(o)):o=r[s],o}function e(){n=new WeakMap}return{get:t,dispose:e}}function Fb(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={direction:new dt,color:new He};break;case"SpotLight":e={position:new dt,direction:new dt,color:new He,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":e={position:new dt,color:new He,distance:0,decay:0};break;case"HemisphereLight":e={direction:new dt,skyColor:new He,groundColor:new He};break;case"RectAreaLight":e={color:new He,position:new dt,halfWidth:new dt,halfHeight:new dt};break}return n[t.id]=e,e}}}function kb(){const n={};return{get:function(t){if(n[t.id]!==void 0)return n[t.id];let e;switch(t.type){case"DirectionalLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ne};break;case"SpotLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ne};break;case"PointLight":e={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ne,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[t.id]=e,e}}}let zb=0;function Bb(n,t){return(t.castShadow?2:0)-(n.castShadow?2:0)+(t.map?1:0)-(n.map?1:0)}function Vb(n){const t=new Fb,e=kb(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new dt);const s=new dt,r=new ke,o=new ke;function a(c){let u=0,d=0,p=0;for(let w=0;w<9;w++)i.probe[w].set(0,0,0);let m=0,g=0,x=0,f=0,h=0,M=0,_=0,b=0,S=0,y=0,E=0;c.sort(Bb);for(let w=0,T=c.length;w<T;w++){const C=c[w],I=C.color,F=C.intensity,V=C.distance,Y=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)u+=I.r*F,d+=I.g*F,p+=I.b*F;else if(C.isLightProbe){for(let P=0;P<9;P++)i.probe[P].addScaledVector(C.sh.coefficients[P],F);E++}else if(C.isDirectionalLight){const P=t.get(C);if(P.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const H=C.shadow,W=e.get(C);W.shadowIntensity=H.intensity,W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,i.directionalShadow[m]=W,i.directionalShadowMap[m]=Y,i.directionalShadowMatrix[m]=C.shadow.matrix,M++}i.directional[m]=P,m++}else if(C.isSpotLight){const P=t.get(C);P.position.setFromMatrixPosition(C.matrixWorld),P.color.copy(I).multiplyScalar(F),P.distance=V,P.coneCos=Math.cos(C.angle),P.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),P.decay=C.decay,i.spot[x]=P;const H=C.shadow;if(C.map&&(i.spotLightMap[S]=C.map,S++,H.updateMatrices(C),C.castShadow&&y++),i.spotLightMatrix[x]=H.matrix,C.castShadow){const W=e.get(C);W.shadowIntensity=H.intensity,W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,i.spotShadow[x]=W,i.spotShadowMap[x]=Y,b++}x++}else if(C.isRectAreaLight){const P=t.get(C);P.color.copy(I).multiplyScalar(F),P.halfWidth.set(C.width*.5,0,0),P.halfHeight.set(0,C.height*.5,0),i.rectArea[f]=P,f++}else if(C.isPointLight){const P=t.get(C);if(P.color.copy(C.color).multiplyScalar(C.intensity),P.distance=C.distance,P.decay=C.decay,C.castShadow){const H=C.shadow,W=e.get(C);W.shadowIntensity=H.intensity,W.shadowBias=H.bias,W.shadowNormalBias=H.normalBias,W.shadowRadius=H.radius,W.shadowMapSize=H.mapSize,W.shadowCameraNear=H.camera.near,W.shadowCameraFar=H.camera.far,i.pointShadow[g]=W,i.pointShadowMap[g]=Y,i.pointShadowMatrix[g]=C.shadow.matrix,_++}i.point[g]=P,g++}else if(C.isHemisphereLight){const P=t.get(C);P.skyColor.copy(C.color).multiplyScalar(F),P.groundColor.copy(C.groundColor).multiplyScalar(F),i.hemi[h]=P,h++}}f>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=Kt.LTC_FLOAT_1,i.rectAreaLTC2=Kt.LTC_FLOAT_2):(i.rectAreaLTC1=Kt.LTC_HALF_1,i.rectAreaLTC2=Kt.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=d,i.ambient[2]=p;const R=i.hash;(R.directionalLength!==m||R.pointLength!==g||R.spotLength!==x||R.rectAreaLength!==f||R.hemiLength!==h||R.numDirectionalShadows!==M||R.numPointShadows!==_||R.numSpotShadows!==b||R.numSpotMaps!==S||R.numLightProbes!==E)&&(i.directional.length=m,i.spot.length=x,i.rectArea.length=f,i.point.length=g,i.hemi.length=h,i.directionalShadow.length=M,i.directionalShadowMap.length=M,i.pointShadow.length=_,i.pointShadowMap.length=_,i.spotShadow.length=b,i.spotShadowMap.length=b,i.directionalShadowMatrix.length=M,i.pointShadowMatrix.length=_,i.spotLightMatrix.length=b+S-y,i.spotLightMap.length=S,i.numSpotLightShadowsWithMaps=y,i.numLightProbes=E,R.directionalLength=m,R.pointLength=g,R.spotLength=x,R.rectAreaLength=f,R.hemiLength=h,R.numDirectionalShadows=M,R.numPointShadows=_,R.numSpotShadows=b,R.numSpotMaps=S,R.numLightProbes=E,i.version=zb++)}function l(c,u){let d=0,p=0,m=0,g=0,x=0;const f=u.matrixWorldInverse;for(let h=0,M=c.length;h<M;h++){const _=c[h];if(_.isDirectionalLight){const b=i.directional[d];b.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(f),d++}else if(_.isSpotLight){const b=i.spot[m];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(f),b.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(f),m++}else if(_.isRectAreaLight){const b=i.rectArea[g];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(f),o.identity(),r.copy(_.matrixWorld),r.premultiply(f),o.extractRotation(r),b.halfWidth.set(_.width*.5,0,0),b.halfHeight.set(0,_.height*.5,0),b.halfWidth.applyMatrix4(o),b.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const b=i.point[p];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(f),p++}else if(_.isHemisphereLight){const b=i.hemi[x];b.direction.setFromMatrixPosition(_.matrixWorld),b.direction.transformDirection(f),x++}}}return{setup:a,setupView:l,state:i}}function kd(n){const t=new Vb(n),e=[],i=[];function s(u){c.camera=u,e.length=0,i.length=0}function r(u){e.push(u)}function o(u){i.push(u)}function a(){t.setup(e)}function l(u){t.setupView(e,u)}const c={lightsArray:e,shadowsArray:i,camera:null,lights:t,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function Hb(n){let t=new WeakMap;function e(s,r=0){const o=t.get(s);let a;return o===void 0?(a=new kd(n),t.set(s,[a])):r>=o.length?(a=new kd(n),o.push(a)):a=o[r],a}function i(){t=new WeakMap}return{get:e,dispose:i}}const Gb=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Wb=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`;function Xb(n,t,e){let i=new Jh;const s=new Ne,r=new Ne,o=new Mn,a=new dg({depthPacking:om}),l=new fg,c={},u=e.maxTextureSize,d={[er]:xi,[xi]:er,[As]:As},p=new Us({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ne},radius:{value:4}},vertexShader:Gb,fragmentShader:Wb}),m=p.clone();m.defines.HORIZONTAL_PASS=1;const g=new Hi;g.setAttribute("position",new Ri(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new ts(g,p),f=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=wf;let h=this.type;this.render=function(y,E,R){if(f.enabled===!1||f.autoUpdate===!1&&f.needsUpdate===!1||y.length===0)return;const w=n.getRenderTarget(),T=n.getActiveCubeFace(),C=n.getActiveMipmapLevel(),I=n.state;I.setBlending(Ls),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const F=h!==Es&&this.type===Es,V=h===Es&&this.type!==Es;for(let Y=0,P=y.length;Y<P;Y++){const H=y[Y],W=H.shadow;if(W===void 0){ve("WebGLShadowMap:",H,"has no shadow.");continue}if(W.autoUpdate===!1&&W.needsUpdate===!1)continue;s.copy(W.mapSize);const j=W.getFrameExtents();if(s.multiply(j),r.copy(W.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/j.x),s.x=r.x*j.x,W.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/j.y),s.y=r.y*j.y,W.mapSize.y=r.y)),W.map===null||F===!0||V===!0){const tt=this.type!==Es?{minFilter:Ai,magFilter:Ai}:{};W.map!==null&&W.map.dispose(),W.map=new nr(s.x,s.y,tt),W.map.texture.name=H.name+".shadowMap",W.camera.updateProjectionMatrix()}n.setRenderTarget(W.map),n.clear();const N=W.getViewportCount();for(let tt=0;tt<N;tt++){const $=W.getViewport(tt);o.set(r.x*$.x,r.y*$.y,r.x*$.z,r.y*$.w),I.viewport(o),W.updateMatrices(H,tt),i=W.getFrustum(),b(E,R,W.camera,H,this.type)}W.isPointLightShadow!==!0&&this.type===Es&&M(W,R),W.needsUpdate=!1}h=this.type,f.needsUpdate=!1,n.setRenderTarget(w,T,C)};function M(y,E){const R=t.update(x);p.defines.VSM_SAMPLES!==y.blurSamples&&(p.defines.VSM_SAMPLES=y.blurSamples,m.defines.VSM_SAMPLES=y.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),y.mapPass===null&&(y.mapPass=new nr(s.x,s.y)),p.uniforms.shadow_pass.value=y.map.texture,p.uniforms.resolution.value=y.mapSize,p.uniforms.radius.value=y.radius,n.setRenderTarget(y.mapPass),n.clear(),n.renderBufferDirect(E,null,R,p,x,null),m.uniforms.shadow_pass.value=y.mapPass.texture,m.uniforms.resolution.value=y.mapSize,m.uniforms.radius.value=y.radius,n.setRenderTarget(y.map),n.clear(),n.renderBufferDirect(E,null,R,m,x,null)}function _(y,E,R,w){let T=null;const C=R.isPointLight===!0?y.customDistanceMaterial:y.customDepthMaterial;if(C!==void 0)T=C;else if(T=R.isPointLight===!0?l:a,n.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){const I=T.uuid,F=E.uuid;let V=c[I];V===void 0&&(V={},c[I]=V);let Y=V[F];Y===void 0&&(Y=T.clone(),V[F]=Y,E.addEventListener("dispose",S)),T=Y}if(T.visible=E.visible,T.wireframe=E.wireframe,w===Es?T.side=E.shadowSide!==null?E.shadowSide:E.side:T.side=E.shadowSide!==null?E.shadowSide:d[E.side],T.alphaMap=E.alphaMap,T.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,T.map=E.map,T.clipShadows=E.clipShadows,T.clippingPlanes=E.clippingPlanes,T.clipIntersection=E.clipIntersection,T.displacementMap=E.displacementMap,T.displacementScale=E.displacementScale,T.displacementBias=E.displacementBias,T.wireframeLinewidth=E.wireframeLinewidth,T.linewidth=E.linewidth,R.isPointLight===!0&&T.isMeshDistanceMaterial===!0){const I=n.properties.get(T);I.light=R}return T}function b(y,E,R,w,T){if(y.visible===!1)return;if(y.layers.test(E.layers)&&(y.isMesh||y.isLine||y.isPoints)&&(y.castShadow||y.receiveShadow&&T===Es)&&(!y.frustumCulled||i.intersectsObject(y))){y.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,y.matrixWorld);const F=t.update(y),V=y.material;if(Array.isArray(V)){const Y=F.groups;for(let P=0,H=Y.length;P<H;P++){const W=Y[P],j=V[W.materialIndex];if(j&&j.visible){const N=_(y,j,w,T);y.onBeforeShadow(n,y,E,R,F,N,W),n.renderBufferDirect(R,null,F,N,y,W),y.onAfterShadow(n,y,E,R,F,N,W)}}}else if(V.visible){const Y=_(y,V,w,T);y.onBeforeShadow(n,y,E,R,F,Y,null),n.renderBufferDirect(R,null,F,Y,y,null),y.onAfterShadow(n,y,E,R,F,Y,null)}}const I=y.children;for(let F=0,V=I.length;F<V;F++)b(I[F],E,R,w,T)}function S(y){y.target.removeEventListener("dispose",S);for(const R in c){const w=c[R],T=y.target.uuid;T in w&&(w[T].dispose(),delete w[T])}}}const qb={[Hl]:Gl,[Wl]:Yl,[Xl]:jl,[ao]:ql,[Gl]:Hl,[Yl]:Wl,[jl]:Xl,[ql]:ao};function Yb(n,t){function e(){let O=!1;const wt=new Mn;let vt=null;const At=new Mn(0,0,0,0);return{setMask:function(Gt){vt!==Gt&&!O&&(n.colorMask(Gt,Gt,Gt,Gt),vt=Gt)},setLocked:function(Gt){O=Gt},setClear:function(Gt,Ct,pe,ge,Ae){Ae===!0&&(Gt*=ge,Ct*=ge,pe*=ge),wt.set(Gt,Ct,pe,ge),At.equals(wt)===!1&&(n.clearColor(Gt,Ct,pe,ge),At.copy(wt))},reset:function(){O=!1,vt=null,At.set(-1,0,0,0)}}}function i(){let O=!1,wt=!1,vt=null,At=null,Gt=null;return{setReversed:function(Ct){if(wt!==Ct){const pe=t.get("EXT_clip_control");Ct?pe.clipControlEXT(pe.LOWER_LEFT_EXT,pe.ZERO_TO_ONE_EXT):pe.clipControlEXT(pe.LOWER_LEFT_EXT,pe.NEGATIVE_ONE_TO_ONE_EXT),wt=Ct;const ge=Gt;Gt=null,this.setClear(ge)}},getReversed:function(){return wt},setTest:function(Ct){Ct?ct(n.DEPTH_TEST):rt(n.DEPTH_TEST)},setMask:function(Ct){vt!==Ct&&!O&&(n.depthMask(Ct),vt=Ct)},setFunc:function(Ct){if(wt&&(Ct=qb[Ct]),At!==Ct){switch(Ct){case Hl:n.depthFunc(n.NEVER);break;case Gl:n.depthFunc(n.ALWAYS);break;case Wl:n.depthFunc(n.LESS);break;case ao:n.depthFunc(n.LEQUAL);break;case Xl:n.depthFunc(n.EQUAL);break;case ql:n.depthFunc(n.GEQUAL);break;case Yl:n.depthFunc(n.GREATER);break;case jl:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}At=Ct}},setLocked:function(Ct){O=Ct},setClear:function(Ct){Gt!==Ct&&(wt&&(Ct=1-Ct),n.clearDepth(Ct),Gt=Ct)},reset:function(){O=!1,vt=null,At=null,Gt=null,wt=!1}}}function s(){let O=!1,wt=null,vt=null,At=null,Gt=null,Ct=null,pe=null,ge=null,Ae=null;return{setTest:function(Bt){O||(Bt?ct(n.STENCIL_TEST):rt(n.STENCIL_TEST))},setMask:function(Bt){wt!==Bt&&!O&&(n.stencilMask(Bt),wt=Bt)},setFunc:function(Bt,jt,_e){(vt!==Bt||At!==jt||Gt!==_e)&&(n.stencilFunc(Bt,jt,_e),vt=Bt,At=jt,Gt=_e)},setOp:function(Bt,jt,_e){(Ct!==Bt||pe!==jt||ge!==_e)&&(n.stencilOp(Bt,jt,_e),Ct=Bt,pe=jt,ge=_e)},setLocked:function(Bt){O=Bt},setClear:function(Bt){Ae!==Bt&&(n.clearStencil(Bt),Ae=Bt)},reset:function(){O=!1,wt=null,vt=null,At=null,Gt=null,Ct=null,pe=null,ge=null,Ae=null}}}const r=new e,o=new i,a=new s,l=new WeakMap,c=new WeakMap;let u={},d={},p=new WeakMap,m=[],g=null,x=!1,f=null,h=null,M=null,_=null,b=null,S=null,y=null,E=new He(0,0,0),R=0,w=!1,T=null,C=null,I=null,F=null,V=null;const Y=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let P=!1,H=0;const W=n.getParameter(n.VERSION);W.indexOf("WebGL")!==-1?(H=parseFloat(/^WebGL (\d)/.exec(W)[1]),P=H>=1):W.indexOf("OpenGL ES")!==-1&&(H=parseFloat(/^OpenGL ES (\d)/.exec(W)[1]),P=H>=2);let j=null,N={};const tt=n.getParameter(n.SCISSOR_BOX),$=n.getParameter(n.VIEWPORT),ut=new Mn().fromArray(tt),st=new Mn().fromArray($);function nt(O,wt,vt,At){const Gt=new Uint8Array(4),Ct=n.createTexture();n.bindTexture(O,Ct),n.texParameteri(O,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(O,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let pe=0;pe<vt;pe++)O===n.TEXTURE_3D||O===n.TEXTURE_2D_ARRAY?n.texImage3D(wt,0,n.RGBA,1,1,At,0,n.RGBA,n.UNSIGNED_BYTE,Gt):n.texImage2D(wt+pe,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,Gt);return Ct}const K={};K[n.TEXTURE_2D]=nt(n.TEXTURE_2D,n.TEXTURE_2D,1),K[n.TEXTURE_CUBE_MAP]=nt(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[n.TEXTURE_2D_ARRAY]=nt(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),K[n.TEXTURE_3D]=nt(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ct(n.DEPTH_TEST),o.setFunc(ao),U(!1),yt(Tu),ct(n.CULL_FACE),ot(Ls);function ct(O){u[O]!==!0&&(n.enable(O),u[O]=!0)}function rt(O){u[O]!==!1&&(n.disable(O),u[O]=!1)}function pt(O,wt){return d[O]!==wt?(n.bindFramebuffer(O,wt),d[O]=wt,O===n.DRAW_FRAMEBUFFER&&(d[n.FRAMEBUFFER]=wt),O===n.FRAMEBUFFER&&(d[n.DRAW_FRAMEBUFFER]=wt),!0):!1}function X(O,wt){let vt=m,At=!1;if(O){vt=p.get(wt),vt===void 0&&(vt=[],p.set(wt,vt));const Gt=O.textures;if(vt.length!==Gt.length||vt[0]!==n.COLOR_ATTACHMENT0){for(let Ct=0,pe=Gt.length;Ct<pe;Ct++)vt[Ct]=n.COLOR_ATTACHMENT0+Ct;vt.length=Gt.length,At=!0}}else vt[0]!==n.BACK&&(vt[0]=n.BACK,At=!0);At&&n.drawBuffers(vt)}function lt(O){return g!==O?(n.useProgram(O),g=O,!0):!1}const J={[pr]:n.FUNC_ADD,[Pp]:n.FUNC_SUBTRACT,[Dp]:n.FUNC_REVERSE_SUBTRACT};J[Ip]=n.MIN,J[Up]=n.MAX;const mt={[Np]:n.ZERO,[Op]:n.ONE,[Fp]:n.SRC_COLOR,[Bl]:n.SRC_ALPHA,[Gp]:n.SRC_ALPHA_SATURATE,[Vp]:n.DST_COLOR,[zp]:n.DST_ALPHA,[kp]:n.ONE_MINUS_SRC_COLOR,[Vl]:n.ONE_MINUS_SRC_ALPHA,[Hp]:n.ONE_MINUS_DST_COLOR,[Bp]:n.ONE_MINUS_DST_ALPHA,[Wp]:n.CONSTANT_COLOR,[Xp]:n.ONE_MINUS_CONSTANT_COLOR,[qp]:n.CONSTANT_ALPHA,[Yp]:n.ONE_MINUS_CONSTANT_ALPHA};function ot(O,wt,vt,At,Gt,Ct,pe,ge,Ae,Bt){if(O===Ls){x===!0&&(rt(n.BLEND),x=!1);return}if(x===!1&&(ct(n.BLEND),x=!0),O!==Lp){if(O!==f||Bt!==w){if((h!==pr||b!==pr)&&(n.blendEquation(n.FUNC_ADD),h=pr,b=pr),Bt)switch(O){case Jr:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Au:n.blendFunc(n.ONE,n.ONE);break;case Ru:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Cu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Cn("WebGLState: Invalid blending: ",O);break}else switch(O){case Jr:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case Au:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Ru:Cn("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Cu:Cn("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Cn("WebGLState: Invalid blending: ",O);break}M=null,_=null,S=null,y=null,E.set(0,0,0),R=0,f=O,w=Bt}return}Gt=Gt||wt,Ct=Ct||vt,pe=pe||At,(wt!==h||Gt!==b)&&(n.blendEquationSeparate(J[wt],J[Gt]),h=wt,b=Gt),(vt!==M||At!==_||Ct!==S||pe!==y)&&(n.blendFuncSeparate(mt[vt],mt[At],mt[Ct],mt[pe]),M=vt,_=At,S=Ct,y=pe),(ge.equals(E)===!1||Ae!==R)&&(n.blendColor(ge.r,ge.g,ge.b,Ae),E.copy(ge),R=Ae),f=O,w=!1}function Pt(O,wt){O.side===As?rt(n.CULL_FACE):ct(n.CULL_FACE);let vt=O.side===xi;wt&&(vt=!vt),U(vt),O.blending===Jr&&O.transparent===!1?ot(Ls):ot(O.blending,O.blendEquation,O.blendSrc,O.blendDst,O.blendEquationAlpha,O.blendSrcAlpha,O.blendDstAlpha,O.blendColor,O.blendAlpha,O.premultipliedAlpha),o.setFunc(O.depthFunc),o.setTest(O.depthTest),o.setMask(O.depthWrite),r.setMask(O.colorWrite);const At=O.stencilWrite;a.setTest(At),At&&(a.setMask(O.stencilWriteMask),a.setFunc(O.stencilFunc,O.stencilRef,O.stencilFuncMask),a.setOp(O.stencilFail,O.stencilZFail,O.stencilZPass)),It(O.polygonOffset,O.polygonOffsetFactor,O.polygonOffsetUnits),O.alphaToCoverage===!0?ct(n.SAMPLE_ALPHA_TO_COVERAGE):rt(n.SAMPLE_ALPHA_TO_COVERAGE)}function U(O){T!==O&&(O?n.frontFace(n.CW):n.frontFace(n.CCW),T=O)}function yt(O){O!==Ap?(ct(n.CULL_FACE),O!==C&&(O===Tu?n.cullFace(n.BACK):O===Rp?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):rt(n.CULL_FACE),C=O}function Dt(O){O!==I&&(P&&n.lineWidth(O),I=O)}function It(O,wt,vt){O?(ct(n.POLYGON_OFFSET_FILL),(F!==wt||V!==vt)&&(n.polygonOffset(wt,vt),F=wt,V=vt)):rt(n.POLYGON_OFFSET_FILL)}function ht(O){O?ct(n.SCISSOR_TEST):rt(n.SCISSOR_TEST)}function Vt(O){O===void 0&&(O=n.TEXTURE0+Y-1),j!==O&&(n.activeTexture(O),j=O)}function Et(O,wt,vt){vt===void 0&&(j===null?vt=n.TEXTURE0+Y-1:vt=j);let At=N[vt];At===void 0&&(At={type:void 0,texture:void 0},N[vt]=At),(At.type!==O||At.texture!==wt)&&(j!==vt&&(n.activeTexture(vt),j=vt),n.bindTexture(O,wt||K[O]),At.type=O,At.texture=wt)}function Lt(){const O=N[j];O!==void 0&&O.type!==void 0&&(n.bindTexture(O.type,null),O.type=void 0,O.texture=void 0)}function B(){try{n.compressedTexImage2D(...arguments)}catch(O){O("WebGLState:",O)}}function et(){try{n.compressedTexImage3D(...arguments)}catch(O){O("WebGLState:",O)}}function gt(){try{n.texSubImage2D(...arguments)}catch(O){O("WebGLState:",O)}}function k(){try{n.texSubImage3D(...arguments)}catch(O){O("WebGLState:",O)}}function A(){try{n.compressedTexSubImage2D(...arguments)}catch(O){O("WebGLState:",O)}}function v(){try{n.compressedTexSubImage3D(...arguments)}catch(O){O("WebGLState:",O)}}function D(){try{n.texStorage2D(...arguments)}catch(O){O("WebGLState:",O)}}function q(){try{n.texStorage3D(...arguments)}catch(O){O("WebGLState:",O)}}function Q(){try{n.texImage2D(...arguments)}catch(O){O("WebGLState:",O)}}function z(){try{n.texImage3D(...arguments)}catch(O){O("WebGLState:",O)}}function xt(O){ut.equals(O)===!1&&(n.scissor(O.x,O.y,O.z,O.w),ut.copy(O))}function bt(O){st.equals(O)===!1&&(n.viewport(O.x,O.y,O.z,O.w),st.copy(O))}function Ut(O,wt){let vt=c.get(wt);vt===void 0&&(vt=new WeakMap,c.set(wt,vt));let At=vt.get(O);At===void 0&&(At=n.getUniformBlockIndex(wt,O.name),vt.set(O,At))}function ee(O,wt){const At=c.get(wt).get(O);l.get(wt)!==At&&(n.uniformBlockBinding(wt,At,O.__bindingPointIndex),l.set(wt,At))}function Rt(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},j=null,N={},d={},p=new WeakMap,m=[],g=null,x=!1,f=null,h=null,M=null,_=null,b=null,S=null,y=null,E=new He(0,0,0),R=0,w=!1,T=null,C=null,I=null,F=null,V=null,ut.set(0,0,n.canvas.width,n.canvas.height),st.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ct,disable:rt,bindFramebuffer:pt,drawBuffers:X,useProgram:lt,setBlending:ot,setMaterial:Pt,setFlipSided:U,setCullFace:yt,setLineWidth:Dt,setPolygonOffset:It,setScissorTest:ht,activeTexture:Vt,bindTexture:Et,unbindTexture:Lt,compressedTexImage2D:B,compressedTexImage3D:et,texImage2D:Q,texImage3D:z,updateUBOMapping:Ut,uniformBlockBinding:ee,texStorage2D:D,texStorage3D:q,texSubImage2D:gt,texSubImage3D:k,compressedTexSubImage2D:A,compressedTexSubImage3D:v,scissor:xt,viewport:bt,reset:Rt}}function jb(n,t,e,i,s,r,o){const a=t.has("WEBGL_multisampled_render_to_texture")?t.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=t.has("OCULUS_multiview")?t.get("OCULUS_multiview"):null,u=new Ne,d=new WeakMap;let p;const m=new WeakMap;let g=[],x=!1,f=!1;try{f=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function h(A,v){return f?new OffscreenCanvas(A,v):_c("canvas")}function M(A,v,D){let q=1;const Q=k(A);if((Q.width>D||Q.height>D)&&(q=D/Math.max(Q.width,Q.height)),q<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const z=Math.floor(q*Q.width),xt=Math.floor(q*Q.height);p===void 0&&(p=h(z,xt));const bt=v?h(z,xt):p;return bt.width=z,bt.height=xt,bt.getContext("2d").drawImage(A,0,0,z,xt),ve("WebGLRenderer: Texture has been resized from ("+Q.width+"x"+Q.height+") to ("+z+"x"+xt+")."),bt}else return"data"in A&&ve("WebGLRenderer: Image in DataTexture is too big ("+Q.width+"x"+Q.height+")."),A;return A}function _(A){return A.generateMipmaps}function b(A){n.generateMipmap(A)}function S(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function y(A,v,D,q,Q=!1){if(A!==null){if(n[A]!==void 0)return n[A];ve("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let z=v;if(v===n.RED&&(D===n.FLOAT&&(z=n.R32F),D===n.HALF_FLOAT&&(z=n.R16F),D===n.UNSIGNED_BYTE&&(z=n.R8)),v===n.RED_INTEGER&&(D===n.UNSIGNED_BYTE&&(z=n.R8UI),D===n.UNSIGNED_SHORT&&(z=n.R16UI),D===n.UNSIGNED_INT&&(z=n.R32UI),D===n.BYTE&&(z=n.R8I),D===n.SHORT&&(z=n.R16I),D===n.INT&&(z=n.R32I)),v===n.RG&&(D===n.FLOAT&&(z=n.RG32F),D===n.HALF_FLOAT&&(z=n.RG16F),D===n.UNSIGNED_BYTE&&(z=n.RG8)),v===n.RG_INTEGER&&(D===n.UNSIGNED_BYTE&&(z=n.RG8UI),D===n.UNSIGNED_SHORT&&(z=n.RG16UI),D===n.UNSIGNED_INT&&(z=n.RG32UI),D===n.BYTE&&(z=n.RG8I),D===n.SHORT&&(z=n.RG16I),D===n.INT&&(z=n.RG32I)),v===n.RGB_INTEGER&&(D===n.UNSIGNED_BYTE&&(z=n.RGB8UI),D===n.UNSIGNED_SHORT&&(z=n.RGB16UI),D===n.UNSIGNED_INT&&(z=n.RGB32UI),D===n.BYTE&&(z=n.RGB8I),D===n.SHORT&&(z=n.RGB16I),D===n.INT&&(z=n.RGB32I)),v===n.RGBA_INTEGER&&(D===n.UNSIGNED_BYTE&&(z=n.RGBA8UI),D===n.UNSIGNED_SHORT&&(z=n.RGBA16UI),D===n.UNSIGNED_INT&&(z=n.RGBA32UI),D===n.BYTE&&(z=n.RGBA8I),D===n.SHORT&&(z=n.RGBA16I),D===n.INT&&(z=n.RGBA32I)),v===n.RGB&&(D===n.UNSIGNED_INT_5_9_9_9_REV&&(z=n.RGB9_E5),D===n.UNSIGNED_INT_10F_11F_11F_REV&&(z=n.R11F_G11F_B10F)),v===n.RGBA){const xt=Q?gc:en.getTransfer(q);D===n.FLOAT&&(z=n.RGBA32F),D===n.HALF_FLOAT&&(z=n.RGBA16F),D===n.UNSIGNED_BYTE&&(z=xt===un?n.SRGB8_ALPHA8:n.RGBA8),D===n.UNSIGNED_SHORT_4_4_4_4&&(z=n.RGBA4),D===n.UNSIGNED_SHORT_5_5_5_1&&(z=n.RGB5_A1)}return(z===n.R16F||z===n.R32F||z===n.RG16F||z===n.RG32F||z===n.RGBA16F||z===n.RGBA32F)&&t.get("EXT_color_buffer_float"),z}function E(A,v){let D;return A?v===null||v===br||v===to?D=n.DEPTH24_STENCIL8:v===zi?D=n.DEPTH32F_STENCIL8:v===ia&&(D=n.DEPTH24_STENCIL8,ve("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===br||v===to?D=n.DEPTH_COMPONENT24:v===zi?D=n.DEPTH_COMPONENT32F:v===ia&&(D=n.DEPTH_COMPONENT16),D}function R(A,v){return _(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ai&&A.minFilter!==Bi?Math.log2(Math.max(v.width,v.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?v.mipmaps.length:1}function w(A){const v=A.target;v.removeEventListener("dispose",w),C(v),v.isVideoTexture&&d.delete(v)}function T(A){const v=A.target;v.removeEventListener("dispose",T),F(v)}function C(A){const v=i.get(A);if(v.__webglInit===void 0)return;const D=A.source,q=m.get(D);if(q){const Q=q[v.__cacheKey];Q.usedTimes--,Q.usedTimes===0&&I(A),Object.keys(q).length===0&&m.delete(D)}i.remove(A)}function I(A){const v=i.get(A);n.deleteTexture(v.__webglTexture);const D=A.source,q=m.get(D);delete q[v.__cacheKey],o.memory.textures--}function F(A){const v=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let q=0;q<6;q++){if(Array.isArray(v.__webglFramebuffer[q]))for(let Q=0;Q<v.__webglFramebuffer[q].length;Q++)n.deleteFramebuffer(v.__webglFramebuffer[q][Q]);else n.deleteFramebuffer(v.__webglFramebuffer[q]);v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer[q])}else{if(Array.isArray(v.__webglFramebuffer))for(let q=0;q<v.__webglFramebuffer.length;q++)n.deleteFramebuffer(v.__webglFramebuffer[q]);else n.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&n.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&n.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let q=0;q<v.__webglColorRenderbuffer.length;q++)v.__webglColorRenderbuffer[q]&&n.deleteRenderbuffer(v.__webglColorRenderbuffer[q]);v.__webglDepthRenderbuffer&&n.deleteRenderbuffer(v.__webglDepthRenderbuffer)}const D=A.textures;for(let q=0,Q=D.length;q<Q;q++){const z=i.get(D[q]);z.__webglTexture&&(n.deleteTexture(z.__webglTexture),o.memory.textures--),i.remove(D[q])}i.remove(A)}let V=0;function Y(){V=0}function P(){const A=V;return A>=s.maxTextures&&ve("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),V+=1,A}function H(A){const v=[];return v.push(A.wrapS),v.push(A.wrapT),v.push(A.wrapR||0),v.push(A.magFilter),v.push(A.minFilter),v.push(A.anisotropy),v.push(A.internalFormat),v.push(A.format),v.push(A.type),v.push(A.generateMipmaps),v.push(A.premultiplyAlpha),v.push(A.flipY),v.push(A.unpackAlignment),v.push(A.colorSpace),v.join()}function W(A,v){const D=i.get(A);if(A.isVideoTexture&&et(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&D.__version!==A.version){const q=A.image;if(q===null)ve("WebGLRenderer: Texture marked for update but no image data found.");else if(q.complete===!1)ve("WebGLRenderer: Texture marked for update but image is incomplete");else if(lt(D,A,v))return}else A.isExternalTexture&&(D.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D,D.__webglTexture,n.TEXTURE0+v)}function j(A,v){const D=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&D.__version!==A.version){lt(D,A,v);return}else A.isExternalTexture&&(D.__webglTexture=A.sourceTexture?A.sourceTexture:null);e.bindTexture(n.TEXTURE_2D_ARRAY,D.__webglTexture,n.TEXTURE0+v)}function N(A,v){const D=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&D.__version!==A.version){lt(D,A,v);return}e.bindTexture(n.TEXTURE_3D,D.__webglTexture,n.TEXTURE0+v)}function tt(A,v){const D=i.get(A);if(A.version>0&&D.__version!==A.version){J(D,A,v);return}e.bindTexture(n.TEXTURE_CUBE_MAP,D.__webglTexture,n.TEXTURE0+v)}const $={[Zl]:n.REPEAT,[Rs]:n.CLAMP_TO_EDGE,[Ql]:n.MIRRORED_REPEAT},ut={[Ai]:n.NEAREST,[sm]:n.NEAREST_MIPMAP_NEAREST,[ya]:n.NEAREST_MIPMAP_LINEAR,[Bi]:n.LINEAR,[Wc]:n.LINEAR_MIPMAP_NEAREST,[gr]:n.LINEAR_MIPMAP_LINEAR},st={[cm]:n.NEVER,[pm]:n.ALWAYS,[lm]:n.LESS,[Nf]:n.LEQUAL,[hm]:n.EQUAL,[fm]:n.GEQUAL,[um]:n.GREATER,[dm]:n.NOTEQUAL};function nt(A,v){if(v.type===zi&&t.has("OES_texture_float_linear")===!1&&(v.magFilter===Bi||v.magFilter===Wc||v.magFilter===ya||v.magFilter===gr||v.minFilter===Bi||v.minFilter===Wc||v.minFilter===ya||v.minFilter===gr)&&ve("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,$[v.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,$[v.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,$[v.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,ut[v.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,ut[v.minFilter]),v.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,st[v.compareFunction])),t.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Ai||v.minFilter!==ya&&v.minFilter!==gr||v.type===zi&&t.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||i.get(v).__currentAnisotropy){const D=t.get("EXT_texture_filter_anisotropic");n.texParameterf(A,D.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),i.get(v).__currentAnisotropy=v.anisotropy}}}function K(A,v){let D=!1;A.__webglInit===void 0&&(A.__webglInit=!0,v.addEventListener("dispose",w));const q=v.source;let Q=m.get(q);Q===void 0&&(Q={},m.set(q,Q));const z=H(v);if(z!==A.__cacheKey){Q[z]===void 0&&(Q[z]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,D=!0),Q[z].usedTimes++;const xt=Q[A.__cacheKey];xt!==void 0&&(Q[A.__cacheKey].usedTimes--,xt.usedTimes===0&&I(v)),A.__cacheKey=z,A.__webglTexture=Q[z].texture}return D}function ct(A,v,D){return Math.floor(Math.floor(A/D)/v)}function rt(A,v,D,q){const z=A.updateRanges;if(z.length===0)e.texSubImage2D(n.TEXTURE_2D,0,0,0,v.width,v.height,D,q,v.data);else{z.sort((Rt,O)=>Rt.start-O.start);let xt=0;for(let Rt=1;Rt<z.length;Rt++){const O=z[xt],wt=z[Rt],vt=O.start+O.count,At=ct(wt.start,v.width,4),Gt=ct(O.start,v.width,4);wt.start<=vt+1&&At===Gt&&ct(wt.start+wt.count-1,v.width,4)===At?O.count=Math.max(O.count,wt.start+wt.count-O.start):(++xt,z[xt]=wt)}z.length=xt+1;const bt=n.getParameter(n.UNPACK_ROW_LENGTH),Ut=n.getParameter(n.UNPACK_SKIP_PIXELS),ee=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,v.width);for(let Rt=0,O=z.length;Rt<O;Rt++){const wt=z[Rt],vt=Math.floor(wt.start/4),At=Math.ceil(wt.count/4),Gt=vt%v.width,Ct=Math.floor(vt/v.width),pe=At,ge=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,Gt),n.pixelStorei(n.UNPACK_SKIP_ROWS,Ct),e.texSubImage2D(n.TEXTURE_2D,0,Gt,Ct,pe,ge,D,q,v.data)}A.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,bt),n.pixelStorei(n.UNPACK_SKIP_PIXELS,Ut),n.pixelStorei(n.UNPACK_SKIP_ROWS,ee)}}function pt(A){x=A}function X(){const A=x;x=!1;for(const v of g)lt(v.textureProperties,v.texture,v.slot),v.texture.isPendingDeferredUpload=!1;g=[],x=A}function lt(A,v,D){if(x)return v.isPendingDeferredUpload||(v.isPendingDeferredUpload=!0,g.push({textureProperties:A,texture:v,slot:D})),!1;let q=n.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(q=n.TEXTURE_2D_ARRAY),v.isData3DTexture&&(q=n.TEXTURE_3D);const Q=K(A,v),z=v.source;e.bindTexture(q,A.__webglTexture,n.TEXTURE0+D);const xt=i.get(z);if(z.version!==xt.__version||Q===!0){e.activeTexture(n.TEXTURE0+D);const bt=en.getPrimaries(en.workingColorSpace),Ut=v.colorSpace===Ks?null:en.getPrimaries(v.colorSpace),ee=v.colorSpace===Ks||bt===Ut?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,ee);let Rt=M(v.image,!1,s.maxTextureSize);Rt=gt(v,Rt);const O=r.convert(v.format,v.colorSpace),wt=r.convert(v.type);let vt=y(v.internalFormat,O,wt,v.colorSpace,v.isVideoTexture);nt(q,v);let At;const Gt=v.mipmaps,Ct=v.isVideoTexture!==!0,pe=xt.__version===void 0||Q===!0,ge=z.dataReady,Ae=R(v,Rt);if(v.isDepthTexture)vt=E(v.format===eo,v.type),pe&&(Ct?e.texStorage2D(n.TEXTURE_2D,1,vt,Rt.width,Rt.height):e.texImage2D(n.TEXTURE_2D,0,vt,Rt.width,Rt.height,0,O,wt,null));else if(v.isDataTexture)if(Gt.length>0){Ct&&pe&&e.texStorage2D(n.TEXTURE_2D,Ae,vt,Gt[0].width,Gt[0].height);for(let Bt=0,jt=Gt.length;Bt<jt;Bt++)At=Gt[Bt],Ct?ge&&e.texSubImage2D(n.TEXTURE_2D,Bt,0,0,At.width,At.height,O,wt,At.data):e.texImage2D(n.TEXTURE_2D,Bt,vt,At.width,At.height,0,O,wt,At.data);v.generateMipmaps=!1}else Ct?(pe&&e.texStorage2D(n.TEXTURE_2D,Ae,vt,Rt.width,Rt.height),ge&&rt(v,Rt,O,wt)):e.texImage2D(n.TEXTURE_2D,0,vt,Rt.width,Rt.height,0,O,wt,Rt.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Ct&&pe&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Ae,vt,Gt[0].width,Gt[0].height,Rt.depth);for(let Bt=0,jt=Gt.length;Bt<jt;Bt++)if(At=Gt[Bt],v.format!==Vi)if(O!==null)if(Ct){if(ge)if(v.layerUpdates.size>0){const _e=md(At.width,At.height,v.format,v.type);for(const Mt of v.layerUpdates){const Ot=At.data.subarray(Mt*_e/At.data.BYTES_PER_ELEMENT,(Mt+1)*_e/At.data.BYTES_PER_ELEMENT);e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Bt,0,0,Mt,At.width,At.height,1,O,Ot)}v.clearLayerUpdates()}else e.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,Bt,0,0,0,At.width,At.height,Rt.depth,O,At.data)}else e.compressedTexImage3D(n.TEXTURE_2D_ARRAY,Bt,vt,At.width,At.height,Rt.depth,0,At.data,0,0);else ve("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ct?ge&&e.texSubImage3D(n.TEXTURE_2D_ARRAY,Bt,0,0,0,At.width,At.height,Rt.depth,O,wt,At.data):e.texImage3D(n.TEXTURE_2D_ARRAY,Bt,vt,At.width,At.height,Rt.depth,0,O,wt,At.data)}else{Ct&&pe&&e.texStorage2D(n.TEXTURE_2D,Ae,vt,Gt[0].width,Gt[0].height);for(let Bt=0,jt=Gt.length;Bt<jt;Bt++)At=Gt[Bt],v.format!==Vi?O!==null?Ct?ge&&e.compressedTexSubImage2D(n.TEXTURE_2D,Bt,0,0,At.width,At.height,O,At.data):e.compressedTexImage2D(n.TEXTURE_2D,Bt,vt,At.width,At.height,0,At.data):ve("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ct?ge&&e.texSubImage2D(n.TEXTURE_2D,Bt,0,0,At.width,At.height,O,wt,At.data):e.texImage2D(n.TEXTURE_2D,Bt,vt,At.width,At.height,0,O,wt,At.data)}else if(v.isDataArrayTexture)if(Ct){if(pe&&e.texStorage3D(n.TEXTURE_2D_ARRAY,Ae,vt,Rt.width,Rt.height,Rt.depth),ge)if(v.layerUpdates.size>0){const Bt=md(Rt.width,Rt.height,v.format,v.type);for(const jt of v.layerUpdates){const _e=Rt.data.subarray(jt*Bt/Rt.data.BYTES_PER_ELEMENT,(jt+1)*Bt/Rt.data.BYTES_PER_ELEMENT);e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,jt,Rt.width,Rt.height,1,O,wt,_e)}v.clearLayerUpdates()}else e.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Rt.width,Rt.height,Rt.depth,O,wt,Rt.data)}else e.texImage3D(n.TEXTURE_2D_ARRAY,0,vt,Rt.width,Rt.height,Rt.depth,0,O,wt,Rt.data);else if(v.isData3DTexture)Ct?(pe&&e.texStorage3D(n.TEXTURE_3D,Ae,vt,Rt.width,Rt.height,Rt.depth),ge&&e.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Rt.width,Rt.height,Rt.depth,O,wt,Rt.data)):e.texImage3D(n.TEXTURE_3D,0,vt,Rt.width,Rt.height,Rt.depth,0,O,wt,Rt.data);else if(v.isFramebufferTexture){if(pe)if(Ct)e.texStorage2D(n.TEXTURE_2D,Ae,vt,Rt.width,Rt.height);else{let Bt=Rt.width,jt=Rt.height;for(let _e=0;_e<Ae;_e++)e.texImage2D(n.TEXTURE_2D,_e,vt,Bt,jt,0,O,wt,null),Bt>>=1,jt>>=1}}else if(Gt.length>0){if(Ct&&pe){const Bt=k(Gt[0]);e.texStorage2D(n.TEXTURE_2D,Ae,vt,Bt.width,Bt.height)}for(let Bt=0,jt=Gt.length;Bt<jt;Bt++)At=Gt[Bt],Ct?ge&&e.texSubImage2D(n.TEXTURE_2D,Bt,0,0,O,wt,At):e.texImage2D(n.TEXTURE_2D,Bt,vt,O,wt,At);v.generateMipmaps=!1}else if(Ct){if(pe){const Bt=k(Rt);e.texStorage2D(n.TEXTURE_2D,Ae,vt,Bt.width,Bt.height)}ge&&e.texSubImage2D(n.TEXTURE_2D,0,0,0,O,wt,Rt)}else e.texImage2D(n.TEXTURE_2D,0,vt,O,wt,Rt);_(v)&&b(q),xt.__version=z.version,v.onUpdate&&v.onUpdate(v)}return A.__version=v.version,!0}function J(A,v,D){if(v.image.length!==6)return;const q=K(A,v),Q=v.source;e.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+D);const z=i.get(Q);if(Q.version!==z.__version||q===!0){e.activeTexture(n.TEXTURE0+D);const xt=en.getPrimaries(en.workingColorSpace),bt=v.colorSpace===Ks?null:en.getPrimaries(v.colorSpace),Ut=v.colorSpace===Ks||xt===bt?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,v.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,v.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Ut);const ee=v.isCompressedTexture||v.image[0].isCompressedTexture,Rt=v.image[0]&&v.image[0].isDataTexture,O=[];for(let jt=0;jt<6;jt++)!ee&&!Rt?O[jt]=M(v.image[jt],!0,s.maxCubemapSize):O[jt]=Rt?v.image[jt].image:v.image[jt],O[jt]=gt(v,O[jt]);const wt=O[0],vt=r.convert(v.format,v.colorSpace),At=r.convert(v.type),Gt=y(v.internalFormat,vt,At,v.colorSpace),Ct=v.isVideoTexture!==!0,pe=z.__version===void 0||q===!0,ge=Q.dataReady;let Ae=R(v,wt);nt(n.TEXTURE_CUBE_MAP,v);let Bt;if(ee){Ct&&pe&&e.texStorage2D(n.TEXTURE_CUBE_MAP,Ae,Gt,wt.width,wt.height);for(let jt=0;jt<6;jt++){Bt=O[jt].mipmaps;for(let _e=0;_e<Bt.length;_e++){const Mt=Bt[_e];v.format!==Vi?vt!==null?Ct?ge&&e.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e,0,0,Mt.width,Mt.height,vt,Mt.data):e.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e,Gt,Mt.width,Mt.height,0,Mt.data):ve("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Ct?ge&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e,0,0,Mt.width,Mt.height,vt,At,Mt.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e,Gt,Mt.width,Mt.height,0,vt,At,Mt.data)}}}else{if(Bt=v.mipmaps,Ct&&pe){Bt.length>0&&Ae++;const jt=k(O[0]);e.texStorage2D(n.TEXTURE_CUBE_MAP,Ae,Gt,jt.width,jt.height)}for(let jt=0;jt<6;jt++)if(Rt){Ct?ge&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,0,0,0,O[jt].width,O[jt].height,vt,At,O[jt].data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,0,Gt,O[jt].width,O[jt].height,0,vt,At,O[jt].data);for(let _e=0;_e<Bt.length;_e++){const Ot=Bt[_e].image[jt].image;Ct?ge&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e+1,0,0,Ot.width,Ot.height,vt,At,Ot.data):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e+1,Gt,Ot.width,Ot.height,0,vt,At,Ot.data)}}else{Ct?ge&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,0,0,0,vt,At,O[jt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,0,Gt,vt,At,O[jt]);for(let _e=0;_e<Bt.length;_e++){const Mt=Bt[_e];Ct?ge&&e.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e+1,0,0,vt,At,Mt.image[jt]):e.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+jt,_e+1,Gt,vt,At,Mt.image[jt])}}}_(v)&&b(n.TEXTURE_CUBE_MAP),z.__version=Q.version,v.onUpdate&&v.onUpdate(v)}A.__version=v.version}function mt(A,v,D,q,Q,z){const xt=r.convert(D.format,D.colorSpace),bt=r.convert(D.type),Ut=y(D.internalFormat,xt,bt,D.colorSpace),ee=i.get(v),Rt=i.get(D);if(Rt.__renderTarget=v,!ee.__hasExternalTextures){const wt=Math.max(1,v.width>>z),vt=Math.max(1,v.height>>z);v.isWebGLMultiviewRenderTarget===!0?e.texStorage3D(n.TEXTURE_2D_ARRAY,0,Ut,v.width,v.height,v.numViews):Q===n.TEXTURE_3D||Q===n.TEXTURE_2D_ARRAY?e.texImage3D(Q,z,Ut,wt,vt,v.depth,0,xt,bt,null):e.texImage2D(Q,z,Ut,wt,vt,0,xt,bt,null)}e.bindFramebuffer(n.FRAMEBUFFER,A);const O=B(v);v.isWebGLMultiviewRenderTarget===!0?O?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,Rt.__webglTexture,0,Lt(v),0,v.numViews):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,Rt.__webglTexture,0,0,v.numViews):(Q===n.TEXTURE_2D||Q>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&Q<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&(O?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,q,Q,Rt.__webglTexture,0,Lt(v)):n.framebufferTexture2D(n.FRAMEBUFFER,q,Q,Rt.__webglTexture,z)),e.bindFramebuffer(n.FRAMEBUFFER,null)}function ot(A,v,D){if(n.bindRenderbuffer(n.RENDERBUFFER,A),v.isWebGLMultiviewRenderTarget===!0){const q=B(v),Q=v.numViews,z=v.depthTexture;let xt=n.DEPTH_COMPONENT24,bt=n.DEPTH_ATTACHMENT;z&&z.isDepthTexture&&(z.type===zi?xt=n.DEPTH_COMPONENT32F:z.type===to&&(xt=n.DEPTH24_STENCIL8,bt=n.DEPTH_STENCIL_ATTACHMENT));let Ut=i.get(v.depthTexture).__webglTexture;Ut===void 0&&(Ut=n.createTexture(),n.bindTexture(n.TEXTURE_2D_ARRAY,Ut),n.texStorage3D(n.TEXTURE_2D_ARRAY,1,xt,v.width,v.height,Q)),q?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,bt,Ut,0,Lt(v),0,Q):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,bt,Ut,0,0,Q)}else if(v.depthBuffer){const q=v.depthTexture,Q=q&&q.isDepthTexture?q.type:null,z=E(v.stencilBuffer,Q),xt=v.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,bt=Lt(v);B(v)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,bt,z,v.width,v.height):D?n.renderbufferStorageMultisample(n.RENDERBUFFER,bt,z,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,z,v.width,v.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,xt,n.RENDERBUFFER,A)}else{const q=v.textures;for(let Q=0;Q<q.length;Q++){const z=q[Q],xt=r.convert(z.format,z.colorSpace),bt=r.convert(z.type),Ut=y(z.internalFormat,xt,bt,z.colorSpace),ee=Lt(v);D&&B(v)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,ee,Ut,v.width,v.height):B(v)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,ee,Ut,v.width,v.height):n.renderbufferStorage(n.RENDERBUFFER,Ut,v.width,v.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function Pt(A,v){if(v&&v.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(e.bindFramebuffer(n.FRAMEBUFFER,A),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const q=i.get(v.depthTexture);q.__renderTarget=v,(!q.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),v.depthTexture.image.depth!=1?j(v.depthTexture,0):W(v.depthTexture,0);const Q=q.__webglTexture,z=Lt(v);if(v.isWebGLMultiviewRenderTarget===!0){const xt=B(v),bt=v.numViews;if(v.depthTexture.format===ho)xt?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,Q,0,z,0,bt):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,Q,0,0,bt);else if(v.depthTexture.format===eo)xt?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,Q,0,z,0,bt):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,Q,0,0,bt);else throw new Error("Unknown depthTexture format")}else if(v.depthTexture.format===ho)B(v)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,Q,0,z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,Q,0);else if(v.depthTexture.format===eo)B(v)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,Q,0,z):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,Q,0);else throw new Error("Unknown depthTexture format")}function U(A){const v=i.get(A),D=A.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==A.depthTexture){const q=A.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),q){const Q=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,q.removeEventListener("dispose",Q)};q.addEventListener("dispose",Q),v.__depthDisposeCallback=Q}v.__boundDepthTexture=q}if(A.depthTexture&&!v.__autoAllocateDepthBuffer){if(D)throw new Error("target.depthTexture not supported in Cube render targets");const q=A.texture.mipmaps;q&&q.length>0?Pt(v.__webglFramebuffer[0],A):Pt(v.__webglFramebuffer,A)}else if(D){v.__webglDepthbuffer=[];for(let q=0;q<6;q++)if(e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[q]),v.__webglDepthbuffer[q]===void 0)v.__webglDepthbuffer[q]=n.createRenderbuffer(),ot(v.__webglDepthbuffer[q],A,!1);else{const Q=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,z=v.__webglDepthbuffer[q];n.bindRenderbuffer(n.RENDERBUFFER,z),n.framebufferRenderbuffer(n.FRAMEBUFFER,Q,n.RENDERBUFFER,z)}}else{const q=A.texture.mipmaps;if(q&&q.length>0?e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer[0]):e.bindFramebuffer(n.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=n.createRenderbuffer(),ot(v.__webglDepthbuffer,A,!1);else{const Q=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,z=v.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,z),n.framebufferRenderbuffer(n.FRAMEBUFFER,Q,n.RENDERBUFFER,z)}}e.bindFramebuffer(n.FRAMEBUFFER,null)}function yt(A,v,D){const q=i.get(A);v!==void 0&&mt(q.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),D!==void 0&&U(A)}function Dt(A){const v=A.texture,D=i.get(A),q=i.get(v);A.addEventListener("dispose",T);const Q=A.textures,z=A.isWebGLCubeRenderTarget===!0,xt=Q.length>1;if(xt||(q.__webglTexture===void 0&&(q.__webglTexture=n.createTexture()),q.__version=v.version,o.memory.textures++),z){D.__webglFramebuffer=[];for(let bt=0;bt<6;bt++)if(v.mipmaps&&v.mipmaps.length>0){D.__webglFramebuffer[bt]=[];for(let Ut=0;Ut<v.mipmaps.length;Ut++)D.__webglFramebuffer[bt][Ut]=n.createFramebuffer()}else D.__webglFramebuffer[bt]=n.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){D.__webglFramebuffer=[];for(let bt=0;bt<v.mipmaps.length;bt++)D.__webglFramebuffer[bt]=n.createFramebuffer()}else D.__webglFramebuffer=n.createFramebuffer();if(xt)for(let bt=0,Ut=Q.length;bt<Ut;bt++){const ee=i.get(Q[bt]);ee.__webglTexture===void 0&&(ee.__webglTexture=n.createTexture(),o.memory.textures++)}if(A.samples>0&&B(A)===!1){D.__webglMultisampledFramebuffer=n.createFramebuffer(),D.__webglColorRenderbuffer=[],e.bindFramebuffer(n.FRAMEBUFFER,D.__webglMultisampledFramebuffer);for(let bt=0;bt<Q.length;bt++){const Ut=Q[bt];D.__webglColorRenderbuffer[bt]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,D.__webglColorRenderbuffer[bt]);const ee=r.convert(Ut.format,Ut.colorSpace),Rt=r.convert(Ut.type),O=y(Ut.internalFormat,ee,Rt,Ut.colorSpace,A.isXRRenderTarget===!0),wt=Lt(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,wt,O,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+bt,n.RENDERBUFFER,D.__webglColorRenderbuffer[bt])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(D.__webglDepthRenderbuffer=n.createRenderbuffer(),ot(D.__webglDepthRenderbuffer,A,!0)),e.bindFramebuffer(n.FRAMEBUFFER,null)}}if(z){e.bindTexture(n.TEXTURE_CUBE_MAP,q.__webglTexture),nt(n.TEXTURE_CUBE_MAP,v);for(let bt=0;bt<6;bt++)if(v.mipmaps&&v.mipmaps.length>0)for(let Ut=0;Ut<v.mipmaps.length;Ut++)mt(D.__webglFramebuffer[bt][Ut],A,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+bt,Ut);else mt(D.__webglFramebuffer[bt],A,v,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+bt,0);_(v)&&b(n.TEXTURE_CUBE_MAP),e.unbindTexture()}else if(xt){for(let bt=0,Ut=Q.length;bt<Ut;bt++){const ee=Q[bt],Rt=i.get(ee);let O=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(O=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),e.bindTexture(O,Rt.__webglTexture),nt(O,ee),mt(D.__webglFramebuffer,A,ee,n.COLOR_ATTACHMENT0+bt,O,0),_(ee)&&b(O)}e.unbindTexture()}else{let bt=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(bt=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),A.isWebGLMultiviewRenderTarget===!0&&(bt=n.TEXTURE_2D_ARRAY),e.bindTexture(bt,q.__webglTexture),nt(bt,v),v.mipmaps&&v.mipmaps.length>0)for(let Ut=0;Ut<v.mipmaps.length;Ut++)mt(D.__webglFramebuffer[Ut],A,v,n.COLOR_ATTACHMENT0,bt,Ut);else mt(D.__webglFramebuffer,A,v,n.COLOR_ATTACHMENT0,bt,0);_(v)&&b(bt),e.unbindTexture()}(A.depthBuffer||A.isWebGLMultiviewRenderTarget===!0)&&this.setupDepthRenderbuffer(A)}function It(A){const v=A.textures;for(let D=0,q=v.length;D<q;D++){const Q=v[D];if(_(Q)){const z=S(A),xt=i.get(Q).__webglTexture;e.bindTexture(z,xt),b(z),e.unbindTexture()}}}const ht=[],Vt=[];function Et(A){if(A.samples>0){if(B(A)===!1){const v=A.textures,D=A.width,q=A.height;let Q=n.COLOR_BUFFER_BIT;const z=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,xt=i.get(A),bt=v.length>1;if(bt)for(let ee=0;ee<v.length;ee++)e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ee,n.RENDERBUFFER,null),e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ee,n.TEXTURE_2D,null,0);e.bindFramebuffer(n.READ_FRAMEBUFFER,xt.__webglMultisampledFramebuffer);const Ut=A.texture.mipmaps;Ut&&Ut.length>0?e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglFramebuffer[0]):e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglFramebuffer);for(let ee=0;ee<v.length;ee++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(Q|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(Q|=n.STENCIL_BUFFER_BIT)),bt){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,xt.__webglColorRenderbuffer[ee]);const Rt=i.get(v[ee]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Rt,0)}n.blitFramebuffer(0,0,D,q,0,0,D,q,Q,n.NEAREST),l===!0&&(ht.length=0,Vt.length=0,ht.push(n.COLOR_ATTACHMENT0+ee),A.depthBuffer&&A.resolveDepthBuffer===!1&&(ht.push(z),Vt.push(z),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Vt)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,ht))}if(e.bindFramebuffer(n.READ_FRAMEBUFFER,null),e.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),bt)for(let ee=0;ee<v.length;ee++){e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+ee,n.RENDERBUFFER,xt.__webglColorRenderbuffer[ee]);const Rt=i.get(v[ee]).__webglTexture;e.bindFramebuffer(n.FRAMEBUFFER,xt.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+ee,n.TEXTURE_2D,Rt,0)}e.bindFramebuffer(n.DRAW_FRAMEBUFFER,xt.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const v=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[v])}}}function Lt(A){return Math.min(s.maxSamples,A.samples)}function B(A){const v=i.get(A);return A.samples>0&&t.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function et(A){const v=o.render.frame;d.get(A)!==v&&(d.set(A,v),A.update())}function gt(A,v){const D=A.colorSpace,q=A.format,Q=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||D!==uo&&D!==Ks&&(en.getTransfer(D)===un?(q!==Vi||Q!==hs)&&ve("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Cn("WebGLTextures: Unsupported texture color space:",D)),v}function k(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(u.width=A.naturalWidth||A.width,u.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(u.width=A.displayWidth,u.height=A.displayHeight):(u.width=A.width,u.height=A.height),u}this.allocateTextureUnit=P,this.resetTextureUnits=Y,this.setTexture2D=W,this.setTexture2DArray=j,this.setTexture3D=N,this.setTextureCube=tt,this.rebindTextures=yt,this.uploadTexture=lt,this.setupRenderTarget=Dt,this.updateRenderTargetMipmap=It,this.updateMultisampleRenderTarget=Et,this.setupDepthTexture=Pt,this.setupDepthRenderbuffer=U,this.setupFrameBufferTexture=mt,this.useMultisampledRTT=B,this.runDeferredUploads=X,this.setDeferTextureUploads=pt}function $b(n,t){function e(i,s=Ks){let r;const o=en.getTransfer(s);if(i===hs)return n.UNSIGNED_BYTE;if(i===Gh)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Wh)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Lf)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Pf)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Rf)return n.BYTE;if(i===Cf)return n.SHORT;if(i===ia)return n.UNSIGNED_SHORT;if(i===Hh)return n.INT;if(i===br)return n.UNSIGNED_INT;if(i===zi)return n.FLOAT;if(i===_o)return n.HALF_FLOAT;if(i===Df)return n.ALPHA;if(i===If)return n.RGB;if(i===Vi)return n.RGBA;if(i===ho)return n.DEPTH_COMPONENT;if(i===eo)return n.DEPTH_STENCIL;if(i===Xh)return n.RED;if(i===qh)return n.RED_INTEGER;if(i===Yh)return n.RG;if(i===jh)return n.RG_INTEGER;if(i===$h)return n.RGBA_INTEGER;if(i===ac||i===cc||i===lc||i===hc)if(o===un)if(r=t.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===ac)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===cc)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===lc)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===hc)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=t.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===ac)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===cc)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===lc)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===hc)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Jl||i===th||i===eh||i===nh)if(r=t.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Jl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===th)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===eh)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===nh)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===ih||i===sh||i===rh)if(r=t.get("WEBGL_compressed_texture_etc"),r!==null){if(i===ih||i===sh)return o===un?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===rh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===oh||i===ah||i===ch||i===lh||i===hh||i===uh||i===dh||i===fh||i===ph||i===mh||i===gh||i===xh||i===_h||i===bh)if(r=t.get("WEBGL_compressed_texture_astc"),r!==null){if(i===oh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===ah)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===ch)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===lh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===hh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===uh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===dh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===fh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===ph)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===mh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===gh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===xh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===_h)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===bh)return o===un?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===Mh||i===vh||i===yh)if(r=t.get("EXT_texture_compression_bptc"),r!==null){if(i===Mh)return o===un?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===vh)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===yh)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===Sh||i===Eh||i===wh||i===Th)if(r=t.get("EXT_texture_compression_rgtc"),r!==null){if(i===Sh)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Eh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===wh)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Th)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===to?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:e}}class i0 extends nr{constructor(t,e,i,s={}){super(t,e,s),this.depthBuffer=!1,this.stencilBuffer=!1,this.numViews=i}copy(t){return super.copy(t),this.numViews=t.numViews,this}}i0.prototype.isWebGLMultiviewRenderTarget=!0;const Kb=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Zb=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Qb{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(t,e){if(this.texture===null){const i=new $f(t.texture);(t.depthNear!==e.depthNear||t.depthFar!==e.depthFar)&&(this.depthNear=t.depthNear,this.depthFar=t.depthFar),this.texture=i}}getMesh(t){if(this.texture!==null&&this.mesh===null){const e=t.cameras[0].viewport,i=new Us({vertexShader:Kb,fragmentShader:Zb,uniforms:{depthColor:{value:this.texture},depthWidth:{value:e.z},depthHeight:{value:e.w}}});this.mesh=new ts(new Lc(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Jb extends vr{constructor(t,e,i,s){super();const r=this;let o=null,a=1;var l=null;let c=null,u="local-floor",d=1,p=null,m=null;var g=[];let x=null,f=null,h=null,M=null;const _=typeof XRWebGLBinding<"u",b=new Qb,S={},y=e.getContextAttributes();let E=null,R=null;const w=[],T=[],C=new Ne;let I=null;const F=new ji;F.viewport=new Mn;const V=new ji;V.viewport=new Mn;const Y=[F,V],P=new gg;let H=null,W=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.layersEnabled=!1,this.isPresenting=!1,this.isMultiview=!1,this.getCameraPose=function(){return m},this.getController=function(X){let lt=w[X];return lt===void 0&&(lt=new ul,w[X]=lt),lt.getTargetRaySpace()},this.getControllerGrip=function(X){let lt=w[X];return lt===void 0&&(lt=new ul,w[X]=lt),lt.getGripSpace()},this.getHand=function(X){let lt=w[X];return lt===void 0&&(lt=new ul,w[X]=lt),lt.getHandSpace()};function j(X){const lt=T.indexOf(X.inputSource);if(lt===-1)return;const J=w[lt];J!==void 0&&(J.update(X.inputSource,X.frame,p||c),J.dispatchEvent({type:X.type,data:X.inputSource}))}function N(){o.removeEventListener("select",j),o.removeEventListener("selectstart",j),o.removeEventListener("selectend",j),o.removeEventListener("squeeze",j),o.removeEventListener("squeezestart",j),o.removeEventListener("squeezeend",j),o.removeEventListener("end",N),o.removeEventListener("inputsourceschange",tt);for(let X=0;X<w.length;X++){const lt=T[X];lt!==null&&(T[X]=null,w[X].disconnect(lt))}H=null,W=null,b.reset();for(const X in S)delete S[X];r.isPresenting=!1,t.setRenderTarget(E),h=null,f=null,x=null,o=null,R=null,pt.stop(),t.setPixelRatio(I),t.setSize(C.width,C.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(X){a=X,r.isPresenting===!0&&ve("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(X){u=X,r.isPresenting===!0&&ve("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return p||c},this.setReferenceSpace=function(X){p=X},this.getBaseLayer=function(){return f!==null?f:h},this.getBinding=function(){return x===null&&_&&(x=new XRWebGLBinding(o,e)),x},this.getFrame=function(){return M},this.getRenderTarget=function(){return R},this.getSession=function(){return o},this.setSession=async function(X){if(o=X,o!==null){if(E=t.getRenderTarget(),o.addEventListener("select",j),o.addEventListener("selectstart",j),o.addEventListener("selectend",j),o.addEventListener("squeeze",j),o.addEventListener("squeezestart",j),o.addEventListener("squeezeend",j),o.addEventListener("end",N),o.addEventListener("inputsourceschange",tt),y.xrCompatible!==!0&&await e.makeXRCompatible(),I=t.getPixelRatio(),t.getSize(C),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let J=null,mt=null,ot=null;y.depth&&(ot=y.stencil?e.DEPTH24_STENCIL8:e.DEPTH_COMPONENT24,J=y.stencil?eo:ho,mt=y.stencil?to:br),r.isMultiview=s&&i.has("OCULUS_multiview");const Pt={colorFormat:e.RGBA8,depthFormat:ot,scaleFactor:a};r.isMultiview&&(Pt.textureType="texture-array"),x=this.getBinding(),f=x.createProjectionLayer(Pt),o.updateRenderState({layers:[f]}),t.setPixelRatio(1),t.setSize(f.textureWidth,f.textureHeight,!1);const U={format:Vi,type:hs,depthTexture:new jf(f.textureWidth,f.textureHeight,mt,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:y.stencil,colorSpace:t.outputColorSpace,samples:y.antialias?4:0,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1};if(r.isMultiview){const yt=i.get("OCULUS_multiview");this.maxNumViews=e.getParameter(yt.MAX_VIEWS_OVR),R=new i0(f.textureWidth,f.textureHeight,2,U)}else R=new nr(f.textureWidth,f.textureHeight,U)}else{const J={antialias:y.antialias,alpha:!0,depth:y.depth,stencil:y.stencil,framebufferScaleFactor:a};h=new XRWebGLLayer(o,e,J),o.updateRenderState({baseLayer:h}),t.setPixelRatio(1),t.setSize(h.framebufferWidth,h.framebufferHeight,!1),R=new nr(h.framebufferWidth,h.framebufferHeight,{format:Vi,type:hs,colorSpace:t.outputColorSpace,stencilBuffer:y.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}R.isXRRenderTarget=!0,this.setFoveation(d),p=null,c=await o.requestReferenceSpace(u),pt.setContext(o),pt.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.addLayer=function(X){!window.XRWebGLBinding||!this.layersEnabled||!o||(g.push(X),this.updateLayers())},this.removeLayer=function(X){g.splice(g.indexOf(X),1),!(!window.XRWebGLBinding||!this.layersEnabled||!o)&&this.updateLayers()},this.updateLayers=function(){var X=g.map(function(lt){return lt});X.unshift(o.renderState.layers[0]),o.updateRenderState({layers:X})},this.getDepthTexture=function(){return b.getDepthTexture()};function tt(X){for(let lt=0;lt<X.removed.length;lt++){const J=X.removed[lt],mt=T.indexOf(J);mt>=0&&(T[mt]=null,w[mt].disconnect(J))}for(let lt=0;lt<X.added.length;lt++){const J=X.added[lt];let mt=T.indexOf(J);if(mt===-1){for(let Pt=0;Pt<w.length;Pt++)if(Pt>=T.length){T.push(J),mt=Pt;break}else if(T[Pt]===null){T[Pt]=J,mt=Pt;break}if(mt===-1)break}const ot=w[mt];ot&&ot.connect(J)}}const $=new dt,ut=new dt;function st(X,lt,J){$.setFromMatrixPosition(lt.matrixWorld),ut.setFromMatrixPosition(J.matrixWorld);const mt=$.distanceTo(ut),ot=lt.projectionMatrix.elements,Pt=J.projectionMatrix.elements,U=ot[14]/(ot[10]-1),yt=ot[14]/(ot[10]+1),Dt=(ot[9]+1)/ot[5],It=(ot[9]-1)/ot[5],ht=(ot[8]-1)/ot[0],Vt=(Pt[8]+1)/Pt[0],Et=U*ht,Lt=U*Vt,B=mt/(-ht+Vt),et=B*-ht;if(lt.matrixWorld.decompose(X.position,X.quaternion,X.scale),X.translateX(et),X.translateZ(B),X.matrixWorld.compose(X.position,X.quaternion,X.scale),X.matrixWorldInverse.copy(X.matrixWorld).invert(),ot[10]===-1)X.projectionMatrix.copy(lt.projectionMatrix),X.projectionMatrixInverse.copy(lt.projectionMatrixInverse);else{const gt=U+B,k=yt+B,A=Et-et,v=Lt+(mt-et),D=Dt*yt/k*gt,q=It*yt/k*gt;X.projectionMatrix.makePerspective(A,v,D,q,gt,k),X.projectionMatrixInverse.copy(X.projectionMatrix).invert()}}function nt(X,lt){lt===null?X.matrixWorld.copy(X.matrix):X.matrixWorld.multiplyMatrices(lt.matrixWorld,X.matrix),X.matrixWorldInverse.copy(X.matrixWorld).invert()}this.setPoseTarget=function(X){X!==void 0&&(l=X)},this.updateCamera=function(X){if(o===null)return;let lt=X.near,J=X.far;b.texture!==null&&(b.depthNear>0&&(lt=b.depthNear),b.depthFar>0&&(J=b.depthFar)),P.near=V.near=F.near=lt,P.far=V.far=F.far=J,(H!==P.near||W!==P.far)&&(o.updateRenderState({depthNear:P.near,depthFar:P.far}),H=P.near,W=P.far),P.layers.mask=X.layers.mask|6,F.layers.mask=P.layers.mask&3,V.layers.mask=P.layers.mask&5;const mt=P.cameras;var ot=l||X;const Pt=ot.parent;nt(P,Pt);for(let U=0;U<mt.length;U++)nt(mt[U],Pt);mt.length===2?st(P,F,V):P.projectionMatrix.copy(F.projectionMatrix),K(X,P,ot)};function K(X,lt,J){lt.matrixWorld.decompose(lt.position,lt.quaternion,lt.scale),J.parent===null?J.matrix.copy(lt.matrixWorld):(J.matrix.copy(J.parent.matrixWorld),J.matrix.invert(),J.matrix.multiply(lt.matrixWorld)),J.matrix.decompose(J.position,J.quaternion,J.scale),J.updateMatrixWorld(!0),X.projectionMatrix.copy(lt.projectionMatrix),X.projectionMatrixInverse.copy(lt.projectionMatrixInverse),X.isPerspectiveCamera&&(X.fov=ra*2*Math.atan(1/X.projectionMatrix.elements[5]),X.zoom=1)}this.getCamera=function(){return P},this.getFoveation=function(){if(!(f===null&&h===null))return d},this.setFoveation=function(X){d=X,f!==null&&(f.fixedFoveation=X),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=X)},this.hasDepthSensing=function(){return b.texture!==null},this.getDepthSensingMesh=function(){return b.getMesh(P)},this.getCameraTexture=function(X){return S[X]};let ct=null;function rt(X,lt){if(m=lt.getViewerPose(p||c),M=lt,m!==null){const J=m.views;h!==null&&(t.setRenderTargetFramebuffer(R,h.framebuffer),t.setRenderTarget(R));let mt=!1;J.length!==P.cameras.length&&(P.cameras.length=0,mt=!0);for(let yt=0;yt<J.length;yt++){const Dt=J[yt];let It=null;if(h!==null)It=h.getViewport(Dt);else{const Vt=x.getViewSubImage(f,Dt);It=Vt.viewport,yt===0&&(t.setRenderTargetTextures(R,Vt.colorTexture,Vt.depthStencilTexture),t.setRenderTarget(R))}let ht=Y[yt];ht===void 0&&(ht=new ji,ht.layers.enable(yt),ht.viewport=new Mn,Y[yt]=ht),ht.matrix.fromArray(Dt.transform.matrix),ht.matrix.decompose(ht.position,ht.quaternion,ht.scale),ht.projectionMatrix.fromArray(Dt.projectionMatrix),ht.projectionMatrixInverse.copy(ht.projectionMatrix).invert(),ht.viewport.set(It.x,It.y,It.width,It.height),yt===0&&(P.matrix.copy(ht.matrix),P.matrix.decompose(P.position,P.quaternion,P.scale)),mt===!0&&P.cameras.push(ht)}const ot=o.enabledFeatures;if(ot&&ot.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&_){x=r.getBinding();const yt=x.getDepthInformation(J[0]);yt&&yt.isValid&&yt.texture&&b.init(yt,o.renderState)}if(ot&&ot.includes("camera-access")&&_){t.state.unbindTexture(),x=r.getBinding();for(let yt=0;yt<J.length;yt++){const Dt=J[yt].camera;if(Dt){let It=S[Dt];It||(It=new $f,S[Dt]=It);const ht=x.getCameraImage(Dt);It.sourceTexture=ht}}}}for(let J=0;J<w.length;J++){const mt=T[J],ot=w[J];mt!==null&&ot!==void 0&&ot.update(mt,lt,p||c)}ct&&ct(X,lt),lt.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:lt}),M=null}const pt=new Qf;pt.setAnimationLoop(rt),this.setAnimationLoop=function(X){ct=X},this.dispose=function(){}}}const ur=new us,tM=new ke;function eM(n,t){function e(f,h){f.matrixAutoUpdate===!0&&f.updateMatrix(),h.value.copy(f.matrix)}function i(f,h){h.color.getRGB(f.fogColor.value,Gf(n)),h.isFog?(f.fogNear.value=h.near,f.fogFar.value=h.far):h.isFogExp2&&(f.fogDensity.value=h.density)}function s(f,h,M,_,b){h.isMeshBasicMaterial||h.isMeshLambertMaterial?r(f,h):h.isMeshToonMaterial?(r(f,h),d(f,h)):h.isMeshPhongMaterial?(r(f,h),u(f,h)):h.isMeshStandardMaterial?(r(f,h),p(f,h),h.isMeshPhysicalMaterial&&m(f,h,b)):h.isMeshMatcapMaterial?(r(f,h),g(f,h)):h.isMeshDepthMaterial?r(f,h):h.isMeshDistanceMaterial?(r(f,h),x(f,h)):h.isMeshNormalMaterial?r(f,h):h.isLineBasicMaterial?(o(f,h),h.isLineDashedMaterial&&a(f,h)):h.isPointsMaterial?l(f,h,M,_):h.isSpriteMaterial?c(f,h):h.isShadowMaterial?(f.color.value.copy(h.color),f.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function r(f,h){f.opacity.value=h.opacity,h.color&&f.diffuse.value.copy(h.color),h.emissive&&f.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(f.map.value=h.map,e(h.map,f.mapTransform)),h.alphaMap&&(f.alphaMap.value=h.alphaMap,e(h.alphaMap,f.alphaMapTransform)),h.bumpMap&&(f.bumpMap.value=h.bumpMap,e(h.bumpMap,f.bumpMapTransform),f.bumpScale.value=h.bumpScale,h.side===xi&&(f.bumpScale.value*=-1)),h.normalMap&&(f.normalMap.value=h.normalMap,e(h.normalMap,f.normalMapTransform),f.normalScale.value.copy(h.normalScale),h.side===xi&&f.normalScale.value.negate()),h.displacementMap&&(f.displacementMap.value=h.displacementMap,e(h.displacementMap,f.displacementMapTransform),f.displacementScale.value=h.displacementScale,f.displacementBias.value=h.displacementBias),h.emissiveMap&&(f.emissiveMap.value=h.emissiveMap,e(h.emissiveMap,f.emissiveMapTransform)),h.specularMap&&(f.specularMap.value=h.specularMap,e(h.specularMap,f.specularMapTransform)),h.alphaTest>0&&(f.alphaTest.value=h.alphaTest);const M=t.get(h),_=M.envMap,b=M.envMapRotation;_&&(f.envMap.value=_,ur.copy(b),ur.x*=-1,ur.y*=-1,ur.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(ur.y*=-1,ur.z*=-1),f.envMapRotation.value.setFromMatrix4(tM.makeRotationFromEuler(ur)),f.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,f.reflectivity.value=h.reflectivity,f.ior.value=h.ior,f.refractionRatio.value=h.refractionRatio),h.lightMap&&(f.lightMap.value=h.lightMap,f.lightMapIntensity.value=h.lightMapIntensity,e(h.lightMap,f.lightMapTransform)),h.aoMap&&(f.aoMap.value=h.aoMap,f.aoMapIntensity.value=h.aoMapIntensity,e(h.aoMap,f.aoMapTransform))}function o(f,h){f.diffuse.value.copy(h.color),f.opacity.value=h.opacity,h.map&&(f.map.value=h.map,e(h.map,f.mapTransform))}function a(f,h){f.dashSize.value=h.dashSize,f.totalSize.value=h.dashSize+h.gapSize,f.scale.value=h.scale}function l(f,h,M,_){f.diffuse.value.copy(h.color),f.opacity.value=h.opacity,f.size.value=h.size*M,f.scale.value=_*.5,h.map&&(f.map.value=h.map,e(h.map,f.uvTransform)),h.alphaMap&&(f.alphaMap.value=h.alphaMap,e(h.alphaMap,f.alphaMapTransform)),h.alphaTest>0&&(f.alphaTest.value=h.alphaTest)}function c(f,h){f.diffuse.value.copy(h.color),f.opacity.value=h.opacity,f.rotation.value=h.rotation,h.map&&(f.map.value=h.map,e(h.map,f.mapTransform)),h.alphaMap&&(f.alphaMap.value=h.alphaMap,e(h.alphaMap,f.alphaMapTransform)),h.alphaTest>0&&(f.alphaTest.value=h.alphaTest)}function u(f,h){f.specular.value.copy(h.specular),f.shininess.value=Math.max(h.shininess,1e-4)}function d(f,h){h.gradientMap&&(f.gradientMap.value=h.gradientMap)}function p(f,h){f.metalness.value=h.metalness,h.metalnessMap&&(f.metalnessMap.value=h.metalnessMap,e(h.metalnessMap,f.metalnessMapTransform)),f.roughness.value=h.roughness,h.roughnessMap&&(f.roughnessMap.value=h.roughnessMap,e(h.roughnessMap,f.roughnessMapTransform)),h.envMap&&(f.envMapIntensity.value=h.envMapIntensity)}function m(f,h,M){f.ior.value=h.ior,h.sheen>0&&(f.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),f.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(f.sheenColorMap.value=h.sheenColorMap,e(h.sheenColorMap,f.sheenColorMapTransform)),h.sheenRoughnessMap&&(f.sheenRoughnessMap.value=h.sheenRoughnessMap,e(h.sheenRoughnessMap,f.sheenRoughnessMapTransform))),h.clearcoat>0&&(f.clearcoat.value=h.clearcoat,f.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(f.clearcoatMap.value=h.clearcoatMap,e(h.clearcoatMap,f.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(f.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,e(h.clearcoatRoughnessMap,f.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(f.clearcoatNormalMap.value=h.clearcoatNormalMap,e(h.clearcoatNormalMap,f.clearcoatNormalMapTransform),f.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===xi&&f.clearcoatNormalScale.value.negate())),h.dispersion>0&&(f.dispersion.value=h.dispersion),h.iridescence>0&&(f.iridescence.value=h.iridescence,f.iridescenceIOR.value=h.iridescenceIOR,f.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],f.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(f.iridescenceMap.value=h.iridescenceMap,e(h.iridescenceMap,f.iridescenceMapTransform)),h.iridescenceThicknessMap&&(f.iridescenceThicknessMap.value=h.iridescenceThicknessMap,e(h.iridescenceThicknessMap,f.iridescenceThicknessMapTransform))),h.transmission>0&&(f.transmission.value=h.transmission,f.transmissionSamplerMap.value=M.texture,f.transmissionSamplerSize.value.set(M.width,M.height),h.transmissionMap&&(f.transmissionMap.value=h.transmissionMap,e(h.transmissionMap,f.transmissionMapTransform)),f.thickness.value=h.thickness,h.thicknessMap&&(f.thicknessMap.value=h.thicknessMap,e(h.thicknessMap,f.thicknessMapTransform)),f.attenuationDistance.value=h.attenuationDistance,f.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(f.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(f.anisotropyMap.value=h.anisotropyMap,e(h.anisotropyMap,f.anisotropyMapTransform))),f.specularIntensity.value=h.specularIntensity,f.specularColor.value.copy(h.specularColor),h.specularColorMap&&(f.specularColorMap.value=h.specularColorMap,e(h.specularColorMap,f.specularColorMapTransform)),h.specularIntensityMap&&(f.specularIntensityMap.value=h.specularIntensityMap,e(h.specularIntensityMap,f.specularIntensityMapTransform))}function g(f,h){h.matcap&&(f.matcap.value=h.matcap)}function x(f,h){const M=t.get(h).light;f.referencePosition.value.setFromMatrixPosition(M.matrixWorld),f.nearDistance.value=M.shadow.camera.near,f.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function nM(n,t,e,i){let s={},r={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,_){const b=_.program;i.uniformBlockBinding(M,b)}function c(M,_){let b=s[M.id];b===void 0&&(g(M),b=u(M),s[M.id]=b,M.addEventListener("dispose",f));const S=_.program;i.updateUBOMapping(M,S);const y=t.render.frame;r[M.id]!==y&&(p(M),r[M.id]=y)}function u(M){const _=d();M.__bindingPointIndex=_;const b=n.createBuffer(),S=M.__size,y=M.usage;return n.bindBuffer(n.UNIFORM_BUFFER,b),n.bufferData(n.UNIFORM_BUFFER,S,y),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,_,b),b}function d(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return Cn("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(M){const _=s[M.id],b=M.uniforms,S=M.__cache;n.bindBuffer(n.UNIFORM_BUFFER,_);for(let y=0,E=b.length;y<E;y++){const R=Array.isArray(b[y])?b[y]:[b[y]];for(let w=0,T=R.length;w<T;w++){const C=R[w];if(m(C,y,w,S)===!0){const I=C.__offset,F=Array.isArray(C.value)?C.value:[C.value];let V=0;for(let Y=0;Y<F.length;Y++){const P=F[Y],H=x(P);typeof P=="number"||typeof P=="boolean"?(C.__data[0]=P,n.bufferSubData(n.UNIFORM_BUFFER,I+V,C.__data)):P.isMatrix3?(C.__data[0]=P.elements[0],C.__data[1]=P.elements[1],C.__data[2]=P.elements[2],C.__data[3]=0,C.__data[4]=P.elements[3],C.__data[5]=P.elements[4],C.__data[6]=P.elements[5],C.__data[7]=0,C.__data[8]=P.elements[6],C.__data[9]=P.elements[7],C.__data[10]=P.elements[8],C.__data[11]=0):(P.toArray(C.__data,V),V+=H.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,I,C.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(M,_,b,S){const y=M.value,E=_+"_"+b;if(S[E]===void 0)return typeof y=="number"||typeof y=="boolean"?S[E]=y:S[E]=y.clone(),!0;{const R=S[E];if(typeof y=="number"||typeof y=="boolean"){if(R!==y)return S[E]=y,!0}else if(R.equals(y)===!1)return R.copy(y),!0}return!1}function g(M){const _=M.uniforms;let b=0;const S=16;for(let E=0,R=_.length;E<R;E++){const w=Array.isArray(_[E])?_[E]:[_[E]];for(let T=0,C=w.length;T<C;T++){const I=w[T],F=Array.isArray(I.value)?I.value:[I.value];for(let V=0,Y=F.length;V<Y;V++){const P=F[V],H=x(P),W=b%S,j=W%H.boundary,N=W+j;b+=j,N!==0&&S-N<H.storage&&(b+=S-N),I.__data=new Float32Array(H.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=b,b+=H.storage}}}const y=b%S;return y>0&&(b+=S-y),M.__size=b,M.__cache={},this}function x(M){const _={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(_.boundary=4,_.storage=4):M.isVector2?(_.boundary=8,_.storage=8):M.isVector3||M.isColor?(_.boundary=16,_.storage=12):M.isVector4?(_.boundary=16,_.storage=16):M.isMatrix3?(_.boundary=48,_.storage=48):M.isMatrix4?(_.boundary=64,_.storage=64):M.isTexture?ve("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ve("WebGLRenderer: Unsupported uniform value type.",M),_}function f(M){const _=M.target;_.removeEventListener("dispose",f);const b=o.indexOf(_.__bindingPointIndex);o.splice(b,1),n.deleteBuffer(s[_.id]),delete s[_.id],delete r[_.id]}function h(){for(const M in s)n.deleteBuffer(s[M]);o=[],s={},r={}}return{bind:l,update:c,dispose:h}}const iM=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let ys=null;function sM(){return ys===null&&(ys=new Qh(iM,32,32,Yh,_o),ys.minFilter=Bi,ys.magFilter=Bi,ys.wrapS=Rs,ys.wrapT=Rs,ys.generateMipmaps=!1,ys.needsUpdate=!0),ys}class ES{constructor(t={}){const{canvas:e=mm(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:p=!1,multiviewStereo:m=!1}=t;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=o;const x=new Set([$h,jh,qh]),f=new Set([hs,br,ia,to,Gh,Wh]),h=new Uint32Array(4),M=new Int32Array(4);let _=null,b=null;const S=[],y=[];this.domElement=e,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=tr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let R=!1;this._outputColorSpace=ki;let w=0,T=0,C=null,I=-1,F=null;const V=new Mn,Y=new Mn;let P=null;const H=new He(0);let W=0,j=e.width,N=e.height,tt=1,$=null,ut=null;const st=new Mn(0,0,j,N),nt=new Mn(0,0,j,N);let K=!1;const ct=new Jh;let rt=!1,pt=!1;const X=new ke,lt=new dt,J=new Mn,mt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let ot=!1;function Pt(){return C===null?tt:1}let U=i;function yt(L,it){return e.getContext(L,it)}try{const L={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:d};if("setAttribute"in e&&e.setAttribute("data-engine","three.js r181"),e.addEventListener("webglcontextlost",pe,!1),e.addEventListener("webglcontextrestored",ge,!1),e.addEventListener("webglcontextcreationerror",Ae,!1),U===null){const it="webgl2";if(U=yt(it,L),U===null)throw yt(it)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw L("WebGLRenderer: "+L.message),L}let Dt,It,ht,Vt,Et,Lt,B,et,gt,k,A,v,D,q,Q,z,xt,bt,Ut,ee,Rt,O,wt,vt,At;function Gt(){Dt=new d_(U),Dt.init(),wt=new $b(U,Dt),It=new i_(U,Dt,t,wt),ht=new Yb(U,Dt),It.reversedDepthBuffer&&p&&ht.buffers.depth.setReversed(!0),Vt=new m_(U),Et=new Ub,Lt=new jb(U,Dt,ht,Et,It,wt,Vt),B=new r_(E),et=new u_(E),gt=new bg(U),vt=new e_(U,gt),k=new f_(U,gt,Vt,vt),A=new __(U,k,gt,Vt),ee=new g_(U,It,Lt),z=new s_(Et),v=new Ib(E,B,et,Dt,It,vt,z),D=new eM(E,Et),q=new Ob,Q=new Hb(Dt),Ut=new t_(E,B,et,ht,A,g,l),bt=new x_(E,Dt,U),xt=new Xb(E,A,It),At=new nM(U,Vt,It,ht),Rt=new n_(U,Dt,Vt),O=new p_(U,Dt,Vt),Vt.programs=v.programs,E.capabilities=It,E.extensions=Dt,E.properties=Et,E.renderLists=q,E.shadowMap=xt,E.state=ht,E.info=Vt}Gt();const Ct=new Jb(E,U,Dt,m);this.xr=Ct,this.getContext=function(){return U},this.getContextAttributes=function(){return U.getContextAttributes()},this.forceContextLoss=function(){const L=Dt.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=Dt.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return tt},this.setPixelRatio=function(L){L!==void 0&&(tt=L,this.setSize(j,N,!1))},this.getSize=function(L){return L.set(j,N)},this.setSize=function(L,it,ft=!0){if(Ct.isPresenting){ve("WebGLRenderer: Can't change size while VR device is presenting.");return}j=L,N=it,e.width=Math.floor(L*tt),e.height=Math.floor(it*tt),ft===!0&&(e.style.width=L+"px",e.style.height=it+"px"),this.setViewport(0,0,L,it)},this.getDrawingBufferSize=function(L){return L.set(j*tt,N*tt).floor()},this.setDrawingBufferSize=function(L,it,ft){j=L,N=it,tt=ft,e.width=Math.floor(L*ft),e.height=Math.floor(it*ft),this.setViewport(0,0,L,it)},this.getCurrentViewport=function(L){return L.copy(V)},this.getViewport=function(L){return L.copy(st)},this.setViewport=function(L,it,ft,at){L.isVector4?st.set(L.x,L.y,L.z,L.w):st.set(L,it,ft,at),ht.viewport(V.copy(st).multiplyScalar(tt).round())},this.getScissor=function(L){return L.copy(nt)},this.setScissor=function(L,it,ft,at){L.isVector4?nt.set(L.x,L.y,L.z,L.w):nt.set(L,it,ft,at),ht.scissor(Y.copy(nt).multiplyScalar(tt).round())},this.getScissorTest=function(){return K},this.setScissorTest=function(L){ht.setScissorTest(K=L)},this.setOpaqueSort=function(L){$=L},this.setTransparentSort=function(L){ut=L},this.getClearColor=function(L){return L.copy(Ut.getClearColor())},this.setClearColor=function(){Ut.setClearColor(...arguments)},this.getClearAlpha=function(){return Ut.getClearAlpha()},this.setClearAlpha=function(){Ut.setClearAlpha(...arguments)},this.clear=function(L=!0,it=!0,ft=!0){let at=0;if(L){let Z=!1;if(C!==null){const Ft=C.texture.format;Z=x.has(Ft)}if(Z){const Ft=C.texture.type,Yt=f.has(Ft),ie=Ut.getClearColor(),Zt=Ut.getClearAlpha(),le=ie.r,Xt=ie.g,de=ie.b;Yt?(h[0]=le,h[1]=Xt,h[2]=de,h[3]=Zt,U.clearBufferuiv(U.COLOR,0,h)):(M[0]=le,M[1]=Xt,M[2]=de,M[3]=Zt,U.clearBufferiv(U.COLOR,0,M))}else at|=U.COLOR_BUFFER_BIT}it&&(at|=U.DEPTH_BUFFER_BIT),ft&&(at|=U.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),U.clear(at)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",pe,!1),e.removeEventListener("webglcontextrestored",ge,!1),e.removeEventListener("webglcontextcreationerror",Ae,!1),Ut.dispose(),q.dispose(),Q.dispose(),Et.dispose(),B.dispose(),et.dispose(),A.dispose(),vt.dispose(),At.dispose(),v.dispose(),Ct.dispose(),Ct.removeEventListener("sessionstart",$t),Ct.removeEventListener("sessionend",qt),Wt.stop()};function pe(L){L.preventDefault(),Nu("WebGLRenderer: Context Lost."),R=!0}function ge(){Nu("WebGLRenderer: Context Restored."),R=!1;const L=Vt.autoReset,it=xt.enabled,ft=xt.autoUpdate,at=xt.needsUpdate,Z=xt.type;Gt(),Vt.autoReset=L,xt.enabled=it,xt.autoUpdate=ft,xt.needsUpdate=at,xt.type=Z}function Ae(L){Cn("WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function Bt(L){const it=L.target;it.removeEventListener("dispose",Bt),jt(it)}function jt(L){_e(L),Et.remove(L)}function _e(L){const it=Et.get(L).programs;it!==void 0&&(it.forEach(function(ft){v.releaseProgram(ft)}),L.isShaderMaterial&&v.releaseShaderCache(L))}this.renderBufferDirect=function(L,it,ft,at,Z,Ft){it===null&&(it=mt);const Yt=Z.isMesh&&Z.matrixWorld.determinant()<0,ie=Kn(L,it,ft,at,Z);ht.setMaterial(at,Yt);let Zt=ft.index,le=1;if(at.wireframe===!0){if(Zt=k.getWireframeAttribute(ft),Zt===void 0)return;le=2}const Xt=ft.drawRange,de=ft.attributes.position;let Le=Xt.start*le,Ke=(Xt.start+Xt.count)*le;Ft!==null&&(Le=Math.max(Le,Ft.start*le),Ke=Math.min(Ke,(Ft.start+Ft.count)*le)),Zt!==null?(Le=Math.max(Le,0),Ke=Math.min(Ke,Zt.count)):de!=null&&(Le=Math.max(Le,0),Ke=Math.min(Ke,de.count));const _n=Ke-Le;if(_n<0||_n===1/0)return;vt.setup(Z,at,ie,ft,Zt);let pn,sn=Rt;if(Zt!==null&&(pn=gt.get(Zt),sn=O,sn.setIndex(pn)),Z.isMesh)at.wireframe===!0?(ht.setLineWidth(at.wireframeLinewidth*Pt()),sn.setMode(U.LINES)):sn.setMode(U.TRIANGLES);else if(Z.isLine){let Dn=at.linewidth;Dn===void 0&&(Dn=1),ht.setLineWidth(Dn*Pt()),Z.isLineSegments?sn.setMode(U.LINES):Z.isLineLoop?sn.setMode(U.LINE_LOOP):sn.setMode(U.LINE_STRIP)}else Z.isPoints?sn.setMode(U.POINTS):Z.isSprite&&sn.setMode(U.TRIANGLES);if(Z.isBatchedMesh)if(Z._multiDrawInstances!==null)sa("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),sn.renderMultiDrawInstances(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount,Z._multiDrawInstances);else if(Dt.get("WEBGL_multi_draw"))sn.renderMultiDraw(Z._multiDrawStarts,Z._multiDrawCounts,Z._multiDrawCount);else{const Dn=Z._multiDrawStarts,ue=Z._multiDrawCounts,Gi=Z._multiDrawCount,We=Zt?gt.get(Zt).bytesPerElement:1,Yn=Et.get(at).currentProgram.getUniforms();for(let Pi=0;Pi<Gi;Pi++)Yn.setValue(U,"_gl_DrawID",Pi),sn.render(Dn[Pi]/We,ue[Pi])}else if(Z.isInstancedMesh)sn.renderInstances(Le,_n,Z.count);else if(ft.isInstancedBufferGeometry){const Dn=ft._maxInstanceCount!==void 0?ft._maxInstanceCount:1/0,ue=Math.min(ft.instanceCount,Dn);sn.renderInstances(Le,_n,ue)}else sn.render(Le,_n)};function Mt(L,it,ft){L.transparent===!0&&L.side===As&&L.forceSinglePass===!1?(L.side=xi,L.needsUpdate=!0,Oe(L,it,ft),L.side=er,L.needsUpdate=!0,Oe(L,it,ft),L.side=As):Oe(L,it,ft)}this.compile=function(L,it,ft=null){ft===null&&(ft=L),b=Q.get(ft),b.init(it),y.push(b),ft.traverseVisible(function(Z){Z.isLight&&Z.layers.test(it.layers)&&(b.pushLight(Z),Z.castShadow&&b.pushShadow(Z))}),L!==ft&&L.traverseVisible(function(Z){Z.isLight&&Z.layers.test(it.layers)&&(b.pushLight(Z),Z.castShadow&&b.pushShadow(Z))}),b.setupLights();const at=new Set;return L.traverse(function(Z){if(!(Z.isMesh||Z.isPoints||Z.isLine||Z.isSprite))return;const Ft=Z.material;if(Ft)if(Array.isArray(Ft))for(let Yt=0;Yt<Ft.length;Yt++){const ie=Ft[Yt];Mt(ie,ft,Z),at.add(ie)}else Mt(Ft,ft,Z),at.add(Ft)}),b=y.pop(),at},this.compileAsync=function(L,it,ft=null){const at=this.compile(L,it,ft);return new Promise(Z=>{function Ft(){if(at.forEach(function(Yt){Et.get(Yt).currentProgram.isReady()&&at.delete(Yt)}),at.size===0){Z(L);return}setTimeout(Ft,10)}Dt.get("KHR_parallel_shader_compile")!==null?Ft():setTimeout(Ft,10)})};let Ot=null;function Jt(L){Ot&&Ot(L)}function $t(){Wt.stop()}function qt(){Wt.start()}const Wt=new Qf;Wt.setAnimationLoop(Jt),typeof self<"u"&&Wt.setContext(self),this.setAnimationLoop=function(L){Ot=L,Ct.setAnimationLoop(L),L===null?Wt.stop():Wt.start()},Ct.addEventListener("sessionstart",$t),Ct.addEventListener("sessionend",qt),this.render=function(L,it){if(it!==void 0&&it.isCamera!==!0){Cn("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),it.parent===null&&it.matrixWorldAutoUpdate===!0&&it.updateMatrixWorld(),Ct.enabled===!0&&Ct.isPresenting===!0&&(Ct.cameraAutoUpdate===!0&&Ct.updateCamera(it),it=Ct.getCamera()),L.isScene===!0&&L.onBeforeRender(E,L,it,C),b=Q.get(L,y.length),b.init(it),y.push(b),X.multiplyMatrices(it.projectionMatrix,it.matrixWorldInverse),ct.setFromProjectionMatrix(X,ls,it.reversedDepth),pt=this.localClippingEnabled,rt=z.init(this.clippingPlanes,pt),_=q.get(L,S.length),_.init(),S.push(_),Ct.enabled===!0&&Ct.isPresenting===!0){const Ft=E.xr.getDepthSensingMesh();Ft!==null&&ae(Ft,it,-1/0,E.sortObjects)}ae(L,it,0,E.sortObjects),_.finish(),E.sortObjects===!0&&_.sort($,ut),ot=Ct.enabled===!1||Ct.isPresenting===!1||Ct.hasDepthSensing()===!1,ot&&Ut.addToRenderList(_,L),this.info.render.frame++,rt===!0&&z.beginShadows();const ft=b.state.shadowsArray;xt.render(ft,L,it),rt===!0&&z.endShadows(),this.info.autoReset===!0&&this.info.reset();const at=_.opaque,Z=_.transmissive;if(b.setupLights(),it.isArrayCamera){const Ft=it.cameras;if(Z.length>0)for(let Yt=0,ie=Ft.length;Yt<ie;Yt++){const Zt=Ft[Yt];he(at,Z,L,Zt)}if(ot&&Ut.render(L),Ct.enabled&&Ct.isMultiview)Lt.setDeferTextureUploads(!0),Re(_,L,it,it.cameras[0].viewport);else for(let Yt=0,ie=Ft.length;Yt<ie;Yt++){const Zt=Ft[Yt];Re(_,L,Zt,Zt.viewport)}}else Z.length>0&&he(at,Z,L,it),ot&&Ut.render(L),Re(_,L,it);C!==null&&T===0&&(Lt.updateMultisampleRenderTarget(C),Lt.updateRenderTargetMipmap(C)),L.isScene===!0&&L.onAfterRender(E,L,it),Lt.runDeferredUploads(),vt.resetDefaultState(),I=-1,F=null,y.pop(),y.length>0?(b=y[y.length-1],rt===!0&&z.setGlobalState(E.clippingPlanes,b.state.camera)):b=null,S.pop(),S.length>0?_=S[S.length-1]:_=null};function ae(L,it,ft,at){if(L.visible===!1)return;if(L.layers.test(it.layers)){if(L.isGroup)ft=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(it);else if(L.isLight)b.pushLight(L),L.castShadow&&b.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||ct.intersectsSprite(L)){at&&J.setFromMatrixPosition(L.matrixWorld).applyMatrix4(X);const Yt=A.update(L),ie=L.material;ie.visible&&_.push(L,Yt,ie,ft,J.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||ct.intersectsObject(L))){const Yt=A.update(L),ie=L.material;if(at&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),J.copy(L.boundingSphere.center)):(Yt.boundingSphere===null&&Yt.computeBoundingSphere(),J.copy(Yt.boundingSphere.center)),J.applyMatrix4(L.matrixWorld).applyMatrix4(X)),Array.isArray(ie)){const Zt=Yt.groups;for(let le=0,Xt=Zt.length;le<Xt;le++){const de=Zt[le],Le=ie[de.materialIndex];Le&&Le.visible&&_.push(L,Yt,Le,ft,J.z,de)}}else ie.visible&&_.push(L,Yt,ie,ft,J.z,null)}}const Ft=L.children;for(let Yt=0,ie=Ft.length;Yt<ie;Yt++)ae(Ft[Yt],it,ft,at)}function Re(L,it,ft,at){const{opaque:Z,transmissive:Ft,transparent:Yt}=L;b.setupLightsView(ft),rt===!0&&z.setGlobalState(E.clippingPlanes,ft),at&&ht.viewport(V.copy(at)),Z.length>0&&Ce(Z,it,ft),Ft.length>0&&Ce(Ft,it,ft),Yt.length>0&&Ce(Yt,it,ft),ht.buffers.depth.setTest(!0),ht.buffers.depth.setMask(!0),ht.buffers.color.setMask(!0),ht.setPolygonOffset(!1)}function he(L,it,ft,at){if((ft.isScene===!0?ft.overrideMaterial:null)!==null)return;b.state.transmissionRenderTarget[at.id]===void 0&&(b.state.transmissionRenderTarget[at.id]=new nr(1,1,{generateMipmaps:!0,type:Dt.has("EXT_color_buffer_half_float")||Dt.has("EXT_color_buffer_float")?_o:hs,minFilter:gr,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:en.workingColorSpace}));const Ft=b.state.transmissionRenderTarget[at.id],Yt=at.viewport||V;Ft.setSize(Yt.z*E.transmissionResolutionScale,Yt.w*E.transmissionResolutionScale);const ie=E.getRenderTarget(),Zt=E.getActiveCubeFace(),le=E.getActiveMipmapLevel();E.setRenderTarget(Ft),E.getClearColor(H),W=E.getClearAlpha(),W<1&&E.setClearColor(16777215,.5),E.clear(),ot&&Ut.render(ft);const Xt=E.toneMapping;E.toneMapping=tr;const de=at.viewport;if(at.viewport!==void 0&&(at.viewport=void 0),b.setupLightsView(at),rt===!0&&z.setGlobalState(E.clippingPlanes,at),Ce(L,ft,at),Lt.updateMultisampleRenderTarget(Ft),Lt.updateRenderTargetMipmap(Ft),Dt.has("WEBGL_multisampled_render_to_texture")===!1){let Le=!1;for(let Ke=0,_n=it.length;Ke<_n;Ke++){const pn=it[Ke],{object:sn,geometry:Dn,material:ue,group:Gi}=pn;if(ue.side===As&&sn.layers.test(at.layers)){const We=ue.side;ue.side=xi,ue.needsUpdate=!0,xe(sn,ft,at,Dn,ue,Gi),ue.side=We,ue.needsUpdate=!0,Le=!0}}Le===!0&&(Lt.updateMultisampleRenderTarget(Ft),Lt.updateRenderTargetMipmap(Ft))}E.setRenderTarget(ie,Zt,le),E.setClearColor(H,W),de!==void 0&&(at.viewport=de),E.toneMapping=Xt}function Ce(L,it,ft){const at=it.isScene===!0?it.overrideMaterial:null;for(let Z=0,Ft=L.length;Z<Ft;Z++){const Yt=L[Z],{object:ie,geometry:Zt,group:le}=Yt;let Xt=Yt.material;Xt.allowOverride===!0&&at!==null&&(Xt=at),ie.layers.test(ft.layers)&&xe(ie,it,ft,Zt,Xt,le)}}function xe(L,it,ft,at,Z,Ft){L.onBeforeRender(E,it,ft,at,Z,Ft),L.modelViewMatrix.multiplyMatrices(ft.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),Z.onBeforeRender(E,it,ft,at,L,Ft),Z.transparent===!0&&Z.side===As&&Z.forceSinglePass===!1?(Z.side=xi,Z.needsUpdate=!0,E.renderBufferDirect(ft,it,at,Z,L,Ft),Z.side=er,Z.needsUpdate=!0,E.renderBufferDirect(ft,it,at,Z,L,Ft),Z.side=As):E.renderBufferDirect(ft,it,at,Z,L,Ft),L.onAfterRender(E,it,ft,at,Z,Ft)}function Oe(L,it,ft){it.isScene!==!0&&(it=mt);const at=Et.get(L),Z=b.state.lights,Ft=b.state.shadowsArray,Yt=Z.state.version,ie=v.getParameters(L,Z.state,Ft,it,ft),Zt=v.getProgramCacheKey(ie);let le=at.programs;at.environment=L.isMeshStandardMaterial?it.environment:null,at.fog=it.fog,at.envMap=(L.isMeshStandardMaterial?et:B).get(L.envMap||at.environment),at.envMapRotation=at.environment!==null&&L.envMap===null?it.environmentRotation:L.envMapRotation,le===void 0&&(L.addEventListener("dispose",Bt),le=new Map,at.programs=le);let Xt=le.get(Zt);if(Xt!==void 0){if(at.currentProgram===Xt&&at.lightsStateVersion===Yt)return Ge(L,ie),Xt}else ie.uniforms=v.getUniforms(L),L.onBeforeCompile(ie,E),Xt=v.acquireProgram(ie,Zt),le.set(Zt,Xt),at.uniforms=ie.uniforms;const de=at.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(de.clippingPlanes=z.uniform),Ge(L,ie),at.needsLights=Sr(L),at.lightsStateVersion=Yt,at.needsLights&&(de.ambientLightColor.value=Z.state.ambient,de.lightProbe.value=Z.state.probe,de.directionalLights.value=Z.state.directional,de.directionalLightShadows.value=Z.state.directionalShadow,de.spotLights.value=Z.state.spot,de.spotLightShadows.value=Z.state.spotShadow,de.rectAreaLights.value=Z.state.rectArea,de.ltc_1.value=Z.state.rectAreaLTC1,de.ltc_2.value=Z.state.rectAreaLTC2,de.pointLights.value=Z.state.point,de.pointLightShadows.value=Z.state.pointShadow,de.hemisphereLights.value=Z.state.hemi,de.directionalShadowMap.value=Z.state.directionalShadowMap,de.directionalShadowMatrix.value=Z.state.directionalShadowMatrix,de.spotShadowMap.value=Z.state.spotShadowMap,de.spotLightMatrix.value=Z.state.spotLightMatrix,de.spotLightMap.value=Z.state.spotLightMap,de.pointShadowMap.value=Z.state.pointShadowMap,de.pointShadowMatrix.value=Z.state.pointShadowMatrix),at.currentProgram=Xt,at.uniformsList=null,Xt}function $e(L){if(L.uniformsList===null){const it=L.currentProgram.getUniforms();L.uniformsList=uc.seqWithValue(it.seq,L.uniforms)}return L.uniformsList}function Ge(L,it){const ft=Et.get(L);ft.outputColorSpace=it.outputColorSpace,ft.batching=it.batching,ft.batchingColor=it.batchingColor,ft.instancing=it.instancing,ft.instancingColor=it.instancingColor,ft.instancingMorph=it.instancingMorph,ft.skinning=it.skinning,ft.morphTargets=it.morphTargets,ft.morphNormals=it.morphNormals,ft.morphColors=it.morphColors,ft.morphTargetsCount=it.morphTargetsCount,ft.numClippingPlanes=it.numClippingPlanes,ft.numIntersection=it.numClipIntersection,ft.vertexAlphas=it.vertexAlphas,ft.vertexTangents=it.vertexTangents,ft.toneMapping=it.toneMapping,ft.numMultiviewViews=it.numMultiviewViews}function Kn(L,it,ft,at,Z){it.isScene!==!0&&(it=mt),Lt.resetTextureUnits();const Ft=it.fog,Yt=at.isMeshStandardMaterial?it.environment:null,ie=C===null?E.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:uo,Zt=(at.isMeshStandardMaterial?et:B).get(at.envMap||Yt),le=at.vertexColors===!0&&!!ft.attributes.color&&ft.attributes.color.itemSize===4,Xt=!!ft.attributes.tangent&&(!!at.normalMap||at.anisotropy>0),de=!!ft.morphAttributes.position,Le=!!ft.morphAttributes.normal,Ke=!!ft.morphAttributes.color;let _n=tr;at.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(_n=E.toneMapping);const pn=C&&C.isWebGLMultiviewRenderTarget?C.numViews:0,sn=ft.morphAttributes.position||ft.morphAttributes.normal||ft.morphAttributes.color,Dn=sn!==void 0?sn.length:0,ue=Et.get(at),Gi=b.state.lights;if(rt===!0&&(pt===!0||L!==F)){const mn=L===F&&at.id===I;z.setState(at,L,mn)}let We=!1;at.version===ue.__version?(ue.needsLights&&ue.lightsStateVersion!==Gi.state.version||ue.outputColorSpace!==ie||Z.isBatchedMesh&&ue.batching===!1||!Z.isBatchedMesh&&ue.batching===!0||Z.isBatchedMesh&&ue.batchingColor===!0&&Z.colorTexture===null||Z.isBatchedMesh&&ue.batchingColor===!1&&Z.colorTexture!==null||Z.isInstancedMesh&&ue.instancing===!1||!Z.isInstancedMesh&&ue.instancing===!0||Z.isSkinnedMesh&&ue.skinning===!1||!Z.isSkinnedMesh&&ue.skinning===!0||Z.isInstancedMesh&&ue.instancingColor===!0&&Z.instanceColor===null||Z.isInstancedMesh&&ue.instancingColor===!1&&Z.instanceColor!==null||Z.isInstancedMesh&&ue.instancingMorph===!0&&Z.morphTexture===null||Z.isInstancedMesh&&ue.instancingMorph===!1&&Z.morphTexture!==null||ue.envMap!==Zt||at.fog===!0&&ue.fog!==Ft||ue.numClippingPlanes!==void 0&&(ue.numClippingPlanes!==z.numPlanes||ue.numIntersection!==z.numIntersection)||ue.vertexAlphas!==le||ue.vertexTangents!==Xt||ue.morphTargets!==de||ue.morphNormals!==Le||ue.morphColors!==Ke||ue.toneMapping!==_n||ue.morphTargetsCount!==Dn||ue.numMultiviewViews!==pn)&&(We=!0):(We=!0,ue.__version=at.version);let Yn=ue.currentProgram;We===!0&&(Yn=Oe(at,it,Z));let Pi=!1,ns=!1,ps=!1;const Qe=Yn.getUniforms(),wn=ue.uniforms;if(ht.useProgram(Yn.program)&&(Pi=!0,ns=!0,ps=!0),at.id!==I&&(I=at.id,ns=!0),Pi||F!==L){Yn.numMultiviewViews>0?(bt.updateCameraProjectionMatricesUniform(L,Qe),bt.updateCameraViewMatricesUniform(L,Qe)):(ht.buffers.depth.getReversed()&&L.reversedDepth!==!0&&(L._reversedDepth=!0,L.updateProjectionMatrix()),Qe.setValue(U,"projectionMatrix",L.projectionMatrix),Qe.setValue(U,"viewMatrix",L.matrixWorldInverse));const mn=Qe.map.cameraPosition;mn!==void 0&&mn.setValue(U,lt.setFromMatrixPosition(L.matrixWorld)),It.logarithmicDepthBuffer&&Qe.setValue(U,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(at.isMeshPhongMaterial||at.isMeshToonMaterial||at.isMeshLambertMaterial||at.isMeshBasicMaterial||at.isMeshStandardMaterial||at.isShaderMaterial)&&Qe.setValue(U,"isOrthographic",L.isOrthographicCamera===!0),F!==L&&(F=L,ns=!0,ps=!0)}if(Z.isSkinnedMesh){Qe.setOptional(U,Z,"bindMatrix"),Qe.setOptional(U,Z,"bindMatrixInverse");const mn=Z.skeleton;mn&&(mn.boneTexture===null&&mn.computeBoneTexture(),Qe.setValue(U,"boneTexture",mn.boneTexture,Lt))}Z.isBatchedMesh&&(Qe.setOptional(U,Z,"batchingTexture"),Qe.setValue(U,"batchingTexture",Z._matricesTexture,Lt),Qe.setOptional(U,Z,"batchingIdTexture"),Qe.setValue(U,"batchingIdTexture",Z._indirectTexture,Lt),Qe.setOptional(U,Z,"batchingColorTexture"),Z._colorsTexture!==null&&Qe.setValue(U,"batchingColorTexture",Z._colorsTexture,Lt));const is=ft.morphAttributes;if((is.position!==void 0||is.normal!==void 0||is.color!==void 0)&&ee.update(Z,ft,Yn),(ns||ue.receiveShadow!==Z.receiveShadow)&&(ue.receiveShadow=Z.receiveShadow,Qe.setValue(U,"receiveShadow",Z.receiveShadow)),at.isMeshGouraudMaterial&&at.envMap!==null&&(wn.envMap.value=Zt,wn.flipEnvMap.value=Zt.isCubeTexture&&Zt.isRenderTargetTexture===!1?-1:1),at.isMeshStandardMaterial&&at.envMap===null&&it.environment!==null&&(wn.envMapIntensity.value=it.environmentIntensity),wn.dfgLUT!==void 0&&(wn.dfgLUT.value=sM()),ns&&(Qe.setValue(U,"toneMappingExposure",E.toneMappingExposure),ue.needsLights&&es(wn,ps),Ft&&at.fog===!0&&D.refreshFogUniforms(wn,Ft),D.refreshMaterialUniforms(wn,at,tt,N,b.state.transmissionRenderTarget[L.id]),uc.upload(U,$e(ue),wn,Lt)),at.isShaderMaterial&&at.uniformsNeedUpdate===!0&&(uc.upload(U,$e(ue),wn,Lt),at.uniformsNeedUpdate=!1),at.isSpriteMaterial&&Qe.setValue(U,"center",Z.center),Yn.numMultiviewViews>0?bt.updateObjectMatricesUniforms(Z,L,Qe):(Qe.setValue(U,"modelViewMatrix",Z.modelViewMatrix),Qe.setValue(U,"normalMatrix",Z.normalMatrix)),Qe.setValue(U,"modelMatrix",Z.matrixWorld),at.isShaderMaterial||at.isRawShaderMaterial){const mn=at.uniformsGroups;for(let Os=0,ms=mn.length;Os<ms;Os++){const _a=mn[Os];At.update(_a,Yn),At.bind(_a,Yn)}}return Yn}function es(L,it){L.ambientLightColor.needsUpdate=it,L.lightProbe.needsUpdate=it,L.directionalLights.needsUpdate=it,L.directionalLightShadows.needsUpdate=it,L.pointLights.needsUpdate=it,L.pointLightShadows.needsUpdate=it,L.spotLights.needsUpdate=it,L.spotLightShadows.needsUpdate=it,L.rectAreaLights.needsUpdate=it,L.hemisphereLights.needsUpdate=it}function Sr(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.setTexture2D=(function(){var L=!1;return function(ft,at){ft&&ft.isWebGLRenderTarget&&(L||(console.warn("THREE.WebGLRenderer.setTexture2D: don't use render targets as textures. Use their .texture property instead."),L=!0),ft=ft.texture),Lt.setTexture2D(ft,at)}})(),this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(L,it,ft){const at=Et.get(L);at.__autoAllocateDepthBuffer=L.resolveDepthBuffer===!1,at.__autoAllocateDepthBuffer||(at.__useRenderToTexture=!1),Et.get(L.texture).__webglTexture=it,Et.get(L.depthTexture).__webglTexture=at.__autoAllocateDepthBuffer?void 0:ft,at.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(L,it){const ft=Et.get(L);ft.__webglFramebuffer=it,ft.__useDefaultFramebuffer=it===void 0};const Er=U.createFramebuffer();this.setRenderTarget=function(L,it=0,ft=0){L===null&&this.xr.isPresenting&&(L=this.xr.getRenderTarget()),C=L,w=it,T=ft;let at=!0,Z=null,Ft=!1,Yt=!1;if(L){const Zt=Et.get(L);if(Zt.__useDefaultFramebuffer!==void 0)ht.bindFramebuffer(U.FRAMEBUFFER,null),at=!1;else if(Zt.__webglFramebuffer===void 0)Lt.setupRenderTarget(L);else if(Zt.__hasExternalTextures)Lt.rebindTextures(L,Et.get(L.texture).__webglTexture,Et.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const de=L.depthTexture;if(Zt.__boundDepthTexture!==de){if(de!==null&&Et.has(de)&&(L.width!==de.image.width||L.height!==de.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Lt.setupDepthRenderbuffer(L)}}const le=L.texture;(le.isData3DTexture||le.isDataArrayTexture||le.isCompressedArrayTexture)&&(Yt=!0);const Xt=Et.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(Xt[it])?Z=Xt[it][ft]:Z=Xt[it],Ft=!0):L.samples>0&&Lt.useMultisampledRTT(L)===!1?Z=Et.get(L).__webglMultisampledFramebuffer:Array.isArray(Xt)?Z=Xt[ft]:Z=Xt,V.copy(L.viewport),Y.copy(L.scissor),P=L.scissorTest}else V.copy(st).multiplyScalar(tt).floor(),Y.copy(nt).multiplyScalar(tt).floor(),P=K;if(ft!==0&&(Z=Er),ht.bindFramebuffer(U.FRAMEBUFFER,Z)&&at&&ht.drawBuffers(L,Z),ht.viewport(V),ht.scissor(Y),ht.setScissorTest(P),Ft){const Zt=Et.get(L.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_CUBE_MAP_POSITIVE_X+it,Zt.__webglTexture,ft)}else if(Yt){const Zt=it;for(let le=0;le<L.textures.length;le++){const Xt=Et.get(L.textures[le]);U.framebufferTextureLayer(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0+le,Xt.__webglTexture,ft,Zt)}}else if(L!==null&&ft!==0){const Zt=Et.get(L.texture);U.framebufferTexture2D(U.FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,Zt.__webglTexture,ft)}I=-1},this.readRenderTargetPixels=function(L,it,ft,at,Z,Ft,Yt,ie=0){if(!(L&&L.isWebGLRenderTarget)){Cn("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Zt=Et.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Yt!==void 0&&(Zt=Zt[Yt]),Zt){ht.bindFramebuffer(U.FRAMEBUFFER,Zt);try{const le=L.textures[ie],Xt=le.format,de=le.type;if(!It.textureFormatReadable(Xt)){Cn("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!It.textureTypeReadable(de)){Cn("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}it>=0&&it<=L.width-at&&ft>=0&&ft<=L.height-Z&&(L.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+ie),U.readPixels(it,ft,at,Z,wt.convert(Xt),wt.convert(de),Ft))}finally{const le=C!==null?Et.get(C).__webglFramebuffer:null;ht.bindFramebuffer(U.FRAMEBUFFER,le)}}},this.readRenderTargetPixelsAsync=async function(L,it,ft,at,Z,Ft,Yt,ie=0){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Zt=Et.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&Yt!==void 0&&(Zt=Zt[Yt]),Zt)if(it>=0&&it<=L.width-at&&ft>=0&&ft<=L.height-Z){ht.bindFramebuffer(U.FRAMEBUFFER,Zt);const le=L.textures[ie],Xt=le.format,de=le.type;if(!It.textureFormatReadable(Xt))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!It.textureTypeReadable(de))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Le=U.createBuffer();U.bindBuffer(U.PIXEL_PACK_BUFFER,Le),U.bufferData(U.PIXEL_PACK_BUFFER,Ft.byteLength,U.STREAM_READ),L.textures.length>1&&U.readBuffer(U.COLOR_ATTACHMENT0+ie),U.readPixels(it,ft,at,Z,wt.convert(Xt),wt.convert(de),0);const Ke=C!==null?Et.get(C).__webglFramebuffer:null;ht.bindFramebuffer(U.FRAMEBUFFER,Ke);const _n=U.fenceSync(U.SYNC_GPU_COMMANDS_COMPLETE,0);return U.flush(),await gm(U,_n,4),U.bindBuffer(U.PIXEL_PACK_BUFFER,Le),U.getBufferSubData(U.PIXEL_PACK_BUFFER,0,Ft),U.deleteBuffer(Le),U.deleteSync(_n),Ft}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(L,it=null,ft=0){const at=Math.pow(2,-ft),Z=Math.floor(L.image.width*at),Ft=Math.floor(L.image.height*at),Yt=it!==null?it.x:0,ie=it!==null?it.y:0;Lt.setTexture2D(L,0),U.copyTexSubImage2D(U.TEXTURE_2D,ft,0,0,Yt,ie,Z,Ft),ht.unbindTexture()};const Ns=U.createFramebuffer(),wr=U.createFramebuffer();this.copyTextureToTexture=function(L,it,ft=null,at=null,Z=0,Ft=null){Ft===null&&(Z!==0?(sa("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Ft=Z,Z=0):Ft=0);let Yt,ie,Zt,le,Xt,de,Le,Ke,_n;const pn=L.isCompressedTexture?L.mipmaps[Ft]:L.image;if(ft!==null)Yt=ft.max.x-ft.min.x,ie=ft.max.y-ft.min.y,Zt=ft.isBox3?ft.max.z-ft.min.z:1,le=ft.min.x,Xt=ft.min.y,de=ft.isBox3?ft.min.z:0;else{const wn=Math.pow(2,-Z);Yt=Math.floor(pn.width*wn),ie=Math.floor(pn.height*wn),L.isDataArrayTexture?Zt=pn.depth:L.isData3DTexture?Zt=Math.floor(pn.depth*wn):Zt=1,le=0,Xt=0,de=0}at!==null?(Le=at.x,Ke=at.y,_n=at.z):(Le=0,Ke=0,_n=0);const sn=wt.convert(it.format),Dn=wt.convert(it.type);let ue;it.isData3DTexture?(Lt.setTexture3D(it,0),ue=U.TEXTURE_3D):it.isDataArrayTexture||it.isCompressedArrayTexture?(Lt.setTexture2DArray(it,0),ue=U.TEXTURE_2D_ARRAY):(Lt.setTexture2D(it,0),ue=U.TEXTURE_2D),U.pixelStorei(U.UNPACK_FLIP_Y_WEBGL,it.flipY),U.pixelStorei(U.UNPACK_PREMULTIPLY_ALPHA_WEBGL,it.premultiplyAlpha),U.pixelStorei(U.UNPACK_ALIGNMENT,it.unpackAlignment);const Gi=U.getParameter(U.UNPACK_ROW_LENGTH),We=U.getParameter(U.UNPACK_IMAGE_HEIGHT),Yn=U.getParameter(U.UNPACK_SKIP_PIXELS),Pi=U.getParameter(U.UNPACK_SKIP_ROWS),ns=U.getParameter(U.UNPACK_SKIP_IMAGES);U.pixelStorei(U.UNPACK_ROW_LENGTH,pn.width),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,pn.height),U.pixelStorei(U.UNPACK_SKIP_PIXELS,le),U.pixelStorei(U.UNPACK_SKIP_ROWS,Xt),U.pixelStorei(U.UNPACK_SKIP_IMAGES,de);const ps=L.isDataArrayTexture||L.isData3DTexture,Qe=it.isDataArrayTexture||it.isData3DTexture;if(L.isDepthTexture){const wn=Et.get(L),is=Et.get(it),mn=Et.get(wn.__renderTarget),Os=Et.get(is.__renderTarget);ht.bindFramebuffer(U.READ_FRAMEBUFFER,mn.__webglFramebuffer),ht.bindFramebuffer(U.DRAW_FRAMEBUFFER,Os.__webglFramebuffer);for(let ms=0;ms<Zt;ms++)ps&&(U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Et.get(L).__webglTexture,Z,de+ms),U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,Et.get(it).__webglTexture,Ft,_n+ms)),U.blitFramebuffer(le,Xt,Yt,ie,Le,Ke,Yt,ie,U.DEPTH_BUFFER_BIT,U.NEAREST);ht.bindFramebuffer(U.READ_FRAMEBUFFER,null),ht.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else if(Z!==0||L.isRenderTargetTexture||Et.has(L)){const wn=Et.get(L),is=Et.get(it);ht.bindFramebuffer(U.READ_FRAMEBUFFER,Ns),ht.bindFramebuffer(U.DRAW_FRAMEBUFFER,wr);for(let mn=0;mn<Zt;mn++)ps?U.framebufferTextureLayer(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,wn.__webglTexture,Z,de+mn):U.framebufferTexture2D(U.READ_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,wn.__webglTexture,Z),Qe?U.framebufferTextureLayer(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,is.__webglTexture,Ft,_n+mn):U.framebufferTexture2D(U.DRAW_FRAMEBUFFER,U.COLOR_ATTACHMENT0,U.TEXTURE_2D,is.__webglTexture,Ft),Z!==0?U.blitFramebuffer(le,Xt,Yt,ie,Le,Ke,Yt,ie,U.COLOR_BUFFER_BIT,U.NEAREST):Qe?U.copyTexSubImage3D(ue,Ft,Le,Ke,_n+mn,le,Xt,Yt,ie):U.copyTexSubImage2D(ue,Ft,Le,Ke,le,Xt,Yt,ie);ht.bindFramebuffer(U.READ_FRAMEBUFFER,null),ht.bindFramebuffer(U.DRAW_FRAMEBUFFER,null)}else Qe?L.isDataTexture||L.isData3DTexture?U.texSubImage3D(ue,Ft,Le,Ke,_n,Yt,ie,Zt,sn,Dn,pn.data):it.isCompressedArrayTexture?U.compressedTexSubImage3D(ue,Ft,Le,Ke,_n,Yt,ie,Zt,sn,pn.data):U.texSubImage3D(ue,Ft,Le,Ke,_n,Yt,ie,Zt,sn,Dn,pn):L.isDataTexture?U.texSubImage2D(U.TEXTURE_2D,Ft,Le,Ke,Yt,ie,sn,Dn,pn.data):L.isCompressedTexture?U.compressedTexSubImage2D(U.TEXTURE_2D,Ft,Le,Ke,pn.width,pn.height,sn,pn.data):U.texSubImage2D(U.TEXTURE_2D,Ft,Le,Ke,Yt,ie,sn,Dn,pn);U.pixelStorei(U.UNPACK_ROW_LENGTH,Gi),U.pixelStorei(U.UNPACK_IMAGE_HEIGHT,We),U.pixelStorei(U.UNPACK_SKIP_PIXELS,Yn),U.pixelStorei(U.UNPACK_SKIP_ROWS,Pi),U.pixelStorei(U.UNPACK_SKIP_IMAGES,ns),Ft===0&&it.generateMipmaps&&U.generateMipmap(ue),ht.unbindTexture()},this.initRenderTarget=function(L){Et.get(L).__webglFramebuffer===void 0&&Lt.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?Lt.setTextureCube(L,0):L.isData3DTexture?Lt.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?Lt.setTexture2DArray(L,0):Lt.setTexture2D(L,0),ht.unbindTexture()},this.resetState=function(){w=0,T=0,C=null,ht.reset(),vt.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return ls}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(t){this._outputColorSpace=t;const e=this.getContext();e.drawingBufferColorSpace=en._getDrawingBufferColorSpace(t),e.unpackColorSpace=en._getUnpackColorSpace()}}const zd={type:"change"},nu={type:"start"},s0={type:"end"},ja=new Cc,Bd=new $s,rM=Math.cos(70*Im.DEG2RAD),Nn=new dt,di=2*Math.PI,dn={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},Sl=1e-6;class wS extends xg{constructor(t,e=null){super(t,e),this.state=dn.NONE,this.target=new dt,this.cursor=new dt,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Qr.ROTATE,MIDDLE:Qr.DOLLY,RIGHT:Qr.PAN},this.touches={ONE:jr.ROTATE,TWO:jr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new dt,this._lastQuaternion=new fn,this._lastTargetPosition=new dt,this._quat=new fn().setFromUnitVectors(t.up,new dt(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new pd,this._sphericalDelta=new pd,this._scale=1,this._panOffset=new dt,this._rotateStart=new Ne,this._rotateEnd=new Ne,this._rotateDelta=new Ne,this._panStart=new Ne,this._panEnd=new Ne,this._panDelta=new Ne,this._dollyStart=new Ne,this._dollyEnd=new Ne,this._dollyDelta=new Ne,this._dollyDirection=new dt,this._mouse=new Ne,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=aM.bind(this),this._onPointerDown=oM.bind(this),this._onPointerUp=cM.bind(this),this._onContextMenu=mM.bind(this),this._onMouseWheel=uM.bind(this),this._onKeyDown=dM.bind(this),this._onTouchStart=fM.bind(this),this._onTouchMove=pM.bind(this),this._onMouseDown=lM.bind(this),this._onMouseMove=hM.bind(this),this._interceptControlDown=gM.bind(this),this._interceptControlUp=xM.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(t){super.connect(t),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(t){t.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=t}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(zd),this.update(),this.state=dn.NONE}update(t=null){const e=this.object.position;Nn.copy(e).sub(this.target),Nn.applyQuaternion(this._quat),this._spherical.setFromVector3(Nn),this.autoRotate&&this.state===dn.NONE&&this._rotateLeft(this._getAutoRotationAngle(t)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=di:i>Math.PI&&(i-=di),s<-Math.PI?s+=di:s>Math.PI&&(s-=di),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(Nn.setFromSpherical(this._spherical),Nn.applyQuaternion(this._quatInverse),e.copy(this.target).add(Nn),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=Nn.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new dt(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new dt(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=Nn.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(ja.origin.copy(this.object.position),ja.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(ja.direction))<rM?this.object.lookAt(this.target):(Bd.setFromNormalAndCoplanarPoint(this.object.up,this.target),ja.intersectPlane(Bd,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>Sl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>Sl||this._lastTargetPosition.distanceToSquared(this.target)>Sl?(this.dispatchEvent(zd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(t){return t!==null?di/60*this.autoRotateSpeed*t:di/60/60*this.autoRotateSpeed}_getZoomScale(t){const e=Math.abs(t*.01);return Math.pow(.95,this.zoomSpeed*e)}_rotateLeft(t){this._sphericalDelta.theta-=t}_rotateUp(t){this._sphericalDelta.phi-=t}_panLeft(t,e){Nn.setFromMatrixColumn(e,0),Nn.multiplyScalar(-t),this._panOffset.add(Nn)}_panUp(t,e){this.screenSpacePanning===!0?Nn.setFromMatrixColumn(e,1):(Nn.setFromMatrixColumn(e,0),Nn.crossVectors(this.object.up,Nn)),Nn.multiplyScalar(t),this._panOffset.add(Nn)}_pan(t,e){const i=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;Nn.copy(s).sub(this.target);let r=Nn.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*t*r/i.clientHeight,this.object.matrix),this._panUp(2*e*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(t*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(e*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(t){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=t:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(t,e){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),s=t-i.left,r=e-i.top,o=i.width,a=i.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(t){return Math.max(this.minDistance,Math.min(this.maxDistance,t))}_handleMouseDownRotate(t){this._rotateStart.set(t.clientX,t.clientY)}_handleMouseDownDolly(t){this._updateZoomParameters(t.clientX,t.clientX),this._dollyStart.set(t.clientX,t.clientY)}_handleMouseDownPan(t){this._panStart.set(t.clientX,t.clientY)}_handleMouseMoveRotate(t){this._rotateEnd.set(t.clientX,t.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(di*this._rotateDelta.x/e.clientHeight),this._rotateUp(di*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(t){this._dollyEnd.set(t.clientX,t.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(t){this._panEnd.set(t.clientX,t.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(t){this._updateZoomParameters(t.clientX,t.clientY),t.deltaY<0?this._dollyIn(this._getZoomScale(t.deltaY)):t.deltaY>0&&this._dollyOut(this._getZoomScale(t.deltaY)),this.update()}_handleKeyDown(t){let e=!1;switch(t.code){case this.keys.UP:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),e=!0;break;case this.keys.BOTTOM:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateUp(-di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),e=!0;break;case this.keys.LEFT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),e=!0;break;case this.keys.RIGHT:t.ctrlKey||t.metaKey||t.shiftKey?this.enableRotate&&this._rotateLeft(-di*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),e=!0;break}e&&(t.preventDefault(),this.update())}_handleTouchStartRotate(t){if(this._pointers.length===1)this._rotateStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(t){if(this._pointers.length===1)this._panStart.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panStart.set(i,s)}}_handleTouchStartDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enablePan&&this._handleTouchStartPan(t)}_handleTouchStartDollyRotate(t){this.enableZoom&&this._handleTouchStartDolly(t),this.enableRotate&&this._handleTouchStartRotate(t)}_handleTouchMoveRotate(t){if(this._pointers.length==1)this._rotateEnd.set(t.pageX,t.pageY);else{const i=this._getSecondPointerPosition(t),s=.5*(t.pageX+i.x),r=.5*(t.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const e=this.domElement;this._rotateLeft(di*this._rotateDelta.x/e.clientHeight),this._rotateUp(di*this._rotateDelta.y/e.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(t){if(this._pointers.length===1)this._panEnd.set(t.pageX,t.pageY);else{const e=this._getSecondPointerPosition(t),i=.5*(t.pageX+e.x),s=.5*(t.pageY+e.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(t){const e=this._getSecondPointerPosition(t),i=t.pageX-e.x,s=t.pageY-e.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(t.pageX+e.x)*.5,a=(t.pageY+e.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enablePan&&this._handleTouchMovePan(t)}_handleTouchMoveDollyRotate(t){this.enableZoom&&this._handleTouchMoveDolly(t),this.enableRotate&&this._handleTouchMoveRotate(t)}_addPointer(t){this._pointers.push(t.pointerId)}_removePointer(t){delete this._pointerPositions[t.pointerId];for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId){this._pointers.splice(e,1);return}}_isTrackingPointer(t){for(let e=0;e<this._pointers.length;e++)if(this._pointers[e]==t.pointerId)return!0;return!1}_trackPointer(t){let e=this._pointerPositions[t.pointerId];e===void 0&&(e=new Ne,this._pointerPositions[t.pointerId]=e),e.set(t.pageX,t.pageY)}_getSecondPointerPosition(t){const e=t.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[e]}_customWheelEvent(t){const e=t.deltaMode,i={clientX:t.clientX,clientY:t.clientY,deltaY:t.deltaY};switch(e){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return t.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function oM(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function aM(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function cM(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(s0),this.state=dn.NONE;break;case 1:const t=this._pointers[0],e=this._pointerPositions[t];this._onTouchStart({pointerId:t,pageX:e.x,pageY:e.y});break}}function lM(n){let t;switch(n.button){case 0:t=this.mouseButtons.LEFT;break;case 1:t=this.mouseButtons.MIDDLE;break;case 2:t=this.mouseButtons.RIGHT;break;default:t=-1}switch(t){case Qr.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=dn.DOLLY;break;case Qr.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=dn.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=dn.ROTATE}break;case Qr.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=dn.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=dn.PAN}break;default:this.state=dn.NONE}this.state!==dn.NONE&&this.dispatchEvent(nu)}function hM(n){switch(this.state){case dn.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case dn.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case dn.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function uM(n){this.enabled===!1||this.enableZoom===!1||this.state!==dn.NONE||(n.preventDefault(),this.dispatchEvent(nu),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(s0))}function dM(n){this.enabled!==!1&&this._handleKeyDown(n)}function fM(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case jr.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=dn.TOUCH_ROTATE;break;case jr.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=dn.TOUCH_PAN;break;default:this.state=dn.NONE}break;case 2:switch(this.touches.TWO){case jr.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=dn.TOUCH_DOLLY_PAN;break;case jr.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=dn.TOUCH_DOLLY_ROTATE;break;default:this.state=dn.NONE}break;default:this.state=dn.NONE}this.state!==dn.NONE&&this.dispatchEvent(nu)}function pM(n){switch(this._trackPointer(n),this.state){case dn.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case dn.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case dn.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case dn.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=dn.NONE}}function mM(n){this.enabled!==!1&&n.preventDefault()}function gM(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function xM(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const iu=["auto","plain","spots","rosettes","reticulated","stripes","bands","saddle","dorsal-stripe","dapple","piebald","roan","brindle"],yn={socks:1,mask:2,blaze:4,"tail-tip":8,"tail-rings":16,"ear-tips":32,"rump-patch":64,"juvenile-spots":128},TS=Object.keys(yn),r0=["earth","savanna","reptile","plumage","slate","ink"],o0=["tawny","rufous","dun","fawn","grey","sable","olive","ochre"],a0=[...r0,...o0],fa=["base","accent","belly","keratin","skin","eye","horn","plate"],_M={earth:{base:"#7a5a3c",accent:"#4a3322",belly:"#b89c78",keratin:"#2e2620",skin:"#8d6e5a",eye:"#120d0a",horn:"#6b6156",plate:"#5e4a36"},savanna:{base:"#c99a52",accent:"#6b3f1d",belly:"#ead8b0",keratin:"#2b241d",skin:"#8a6a4a",eye:"#100c08",horn:"#4a3a2a",plate:"#9a6a3a"},reptile:{base:"#5e7a3a",accent:"#37502a",belly:"#cfc890",keratin:"#3b3a2a",skin:"#6e7a4a",eye:"#2a2008",horn:"#8a8060",plate:"#7a6a3a"},plumage:{base:"#2f6fa8",accent:"#e0a020",belly:"#e8e2d0",keratin:"#e09a30",skin:"#c06040",eye:"#0a0a0a",horn:"#333038",plate:"#a03a2a"},slate:{base:"#6d6f70",accent:"#4c4e50",belly:"#8e8c88",keratin:"#3a3836",skin:"#7a7470",eye:"#0d0d0d",horn:"#9a948a",plate:"#585a5a"},ink:{base:"#2c2b31",accent:"#c84a2a",belly:"#5e5249",keratin:"#18161a",skin:"#6a5a50",eye:"#070707",horn:"#3a3030",plate:"#3a2c2c"},tawny:{base:"#a87c4f",accent:"#5a3a20",belly:"#d9c09a",keratin:"#2a2420",skin:"#8a6a52",eye:"#1a120a",horn:"#5a5048",plate:"#7a5a3a"},rufous:{base:"#8e4a2a",accent:"#3e2414",belly:"#e0cdb0",keratin:"#2a201a",skin:"#7a5040",eye:"#140c08",horn:"#4a4038",plate:"#6a3a22"},dun:{base:"#a8926a",accent:"#4a3a28",belly:"#d2c4a4",keratin:"#2e2822",skin:"#8a7660",eye:"#120e0a",horn:"#5a5048",plate:"#7a6a4e"},fawn:{base:"#b89a72",accent:"#6a4c32",belly:"#e6d8c0",keratin:"#2c2622",skin:"#9a7a64",eye:"#140e0a",horn:"#5c524a",plate:"#8a7256"},grey:{base:"#7b7872",accent:"#55524e",belly:"#96928a",keratin:"#3a3734",skin:"#827c76",eye:"#0e0d0c",horn:"#a09a90",plate:"#66625e"},sable:{base:"#4a3828",accent:"#241a12",belly:"#7a6450",keratin:"#1a1614",skin:"#5a4436",eye:"#0a0806",horn:"#3a3028",plate:"#3a2c20"},olive:{base:"#5f6a3a",accent:"#343c20",belly:"#c4be8c",keratin:"#34321f",skin:"#6a7048",eye:"#241c08",horn:"#807656",plate:"#6a6034"},ochre:{base:"#a8682f",accent:"#4a2a14",belly:"#e8dcc0",keratin:"#2a2018",skin:"#8a5c3c",eye:"#120c08",horn:"#3e3024",plate:"#8a5a30"}},bM={earth:"saddle",savanna:"reticulated",reptile:"bands",plumage:"plain",slate:"plain",ink:"plain",tawny:"plain",rufous:"plain",dun:"dorsal-stripe",fawn:"spots",grey:"plain",sable:"plain",olive:"bands",ochre:"reticulated"},MM=["torso","neck","head","muzzle","ear","limb-upper","limb-lower","foot","tail","tail-tip","horn","armor","wing","eye"];function c0(n){return typeof n=="string"&&iu.includes(n)}function l0(n){return typeof n=="string"&&a0.includes(n)}function vM(n,t){return n==="auto"?bM[t]:n}const AS="fauna-composer-eye-catalogue-1",h0=["round","horizontal","vertical-slit","compound","eyespot"],yM=["raptor","owl","cat","gecko","frog","chameleon","crocodile","sclera","nocturnal","cephalopod","insect","spider","stalk"],su=[...h0,...yM],SM=["dark-brown","brown","amber","gold","yellow","orange","red","green","pale"],EM=["blue","copper","grey-green"],wM=[...SM,...EM],TM=Object.freeze({blue:[.1,.22,.4],copper:[.48,.13,.02],"grey-green":[.26,.3,.13]}),AM=["muzzle","jaws","beak","flat-face","proboscis"],u0=Object.freeze({kind:"face",yawDeg:null,pitchDeg:null}),RM=Object.freeze([]),Si=n=>({structure:"camera",pupil:"round",pupilShape:null,size:1,placement:u0,lid:"almond",lidShape:null,brow:"none",sclera:"hidden",irisPattern:"plain",extras:"none",count:"pair",eyeshine:"none",irisBands:null,...n}),Uo=n=>({pupil:"none",pupilShape:null,size:1,placement:u0,lid:"none",lidShape:null,brow:"none",sclera:"hidden",irisPattern:"plain",extras:"none",count:"pair",eyeshine:"none",irisBands:RM,...n}),CM={round:Si({label:"Round (birds, primates, large predators)",group:"pupil",standIn:"round",nativeFaces:["beak","flat-face","proboscis","muzzle","jaws"]}),horizontal:Si({label:"Horizontal bar (goat, horse, deer, octopus)",group:"pupil",standIn:"horizontal",pupil:"horizontal",eyeshine:"silver-white",nativeFaces:["muzzle","proboscis"]}),"vertical-slit":Si({label:"Vertical slit (fox, viper, small lizard)",group:"pupil",standIn:"vertical-slit",pupil:"vertical-slit",nativeFaces:["muzzle","jaws"]}),compound:Uo({label:"Compound (centipede, generic arthropod)",group:"arthropod",standIn:"compound",structure:"compound",nativeFaces:["mandibles"]}),eyespot:Uo({label:"Eyespots (worm)",group:"arthropod",standIn:"eyespot",structure:"eyespot",nativeFaces:["blunt"]}),raptor:Si({label:"Raptor (eagle, hawk, falcon)",group:"animal",standIn:"round",size:1.15,placement:{kind:"forward",yawDeg:55,pitchDeg:0},lidShape:{w:1,above:.55,below:.62},brow:"shelf",irisBands:["yellow","gold","brown","orange","red"],nativeFaces:["beak","jaws"]}),owl:Si({label:"Owl (huge frontal eyes, facial disc)",group:"animal",standIn:"round",pupil:"dilated",pupilShape:{r:.45},size:1.6,placement:{kind:"frontal",yawDeg:12,pitchDeg:0},lid:"round",lidShape:{w:.95,above:.9,below:.9},brow:"disc",irisBands:["yellow","orange","dark-brown"],nativeFaces:["beak"]}),cat:Si({label:"Cat (large, mid-width slit)",group:"animal",standIn:"vertical-slit",pupil:"slit-wide",pupilShape:{rx:.12,ry:.48,point:.6},size:1.25,placement:{kind:"forward",yawDeg:30,pitchDeg:null},lidShape:{w:1,above:.72,below:.62,cornerUpDeg:8},irisPattern:"radial",eyeshine:"green-gold",irisBands:["gold","yellow","green","amber","copper","blue"],nativeFaces:["muzzle"]}),gecko:Si({label:"Gecko (beaded slit, lidless)",group:"animal",standIn:"vertical-slit",pupil:"beaded-slit",pupilShape:{beads:5,bead:.07,pinch:.022,ry:.48},size:1.4,lid:"spectacle",lidShape:{w:.95,above:.9,below:.9},irisPattern:"reticulated",irisBands:["gold","pale","green","copper","grey-green"],nativeFaces:["jaws"]}),frog:Si({label:"Frog or toad (bulging dorsal eyes)",group:"animal",standIn:"horizontal",pupil:"horizontal",pupilShape:{rx:.48,ry:.22,n:2.6},size:1.45,placement:{kind:"dorsal",yawDeg:55,pitchDeg:35},brow:"raised-orbit",irisPattern:"reticulated",extras:"nictitating-lower",irisBands:["gold","amber","copper","red","green"],nativeFaces:["jaws"]}),chameleon:Si({label:"Chameleon (turret eyes, independent gaze)",group:"animal",standIn:"round",pupil:"pinhole",pupilShape:{r:.09,iris:.16,limbus:.2},size:1.5,placement:{kind:"independent",yawDeg:35,pitchDeg:-8,right:{yawDeg:110,pitchDeg:12}},lid:"turret",lidShape:{w:.22,above:.22,below:.22,turretW:.8,turretLift:.55},irisBands:["gold","dark-brown"],nativeFaces:["jaws"]}),crocodile:Si({label:"Crocodile (slit on raised orbits, third eyelid)",group:"animal",standIn:"vertical-slit",pupil:"vertical-slit",size:1.1,placement:{kind:"dorsal",yawDeg:60,pitchDeg:30},brow:"raised-orbit-shelf",irisPattern:"reticulated-faint",extras:"nictitating",eyeshine:"red-orange",irisBands:["gold","grey-green","pale","amber"],nativeFaces:["jaws"]}),sclera:Si({label:"Human-like (white sclera)",group:"animal",standIn:"round",pupilShape:{r:.2,iris:.44,limbus:.52},lid:"wide-almond",lidShape:{w:1.25,above:.5,below:.45},sclera:"white",irisPattern:"radial",irisBands:["dark-brown","brown","amber","green","blue","grey-green"],nativeFaces:["flat-face"]}),nocturnal:Si({label:"Nocturnal (huge, wide pupils: tarsier, bushbaby)",group:"animal",standIn:"round",pupil:"dilated",pupilShape:{r:.58,iris:.72,limbus:.9},size:1.75,placement:{kind:"frontal",yawDeg:null,pitchDeg:null,yawByFace:{"flat-face":10,muzzle:30}},lid:"round",lidShape:{w:1,above:.85,below:.8},eyeshine:"silver-white",eyeshineByFace:{"flat-face":"none"},irisBands:["brown","amber","gold"],nativeFaces:["flat-face","muzzle"]}),cephalopod:Si({label:"Cuttlefish (W-shaped pupil)",group:"animal",standIn:"horizontal",pupil:"w",pupilShape:{iris:.72,limbus:.92},size:1.4,placement:{kind:"lateral",yawDeg:80,pitchDeg:null},lid:"round",lidShape:{w:1,above:.8,below:.75},irisBands:["pale","gold","grey-green"],nativeFaces:["blunt"]}),insect:Uo({label:"Insect (compound eyes and 3 ocelli)",group:"arthropod",standIn:"compound",structure:"compound",size:1.3,extras:"ocelli",count:"pair+3",nativeFaces:["mandibles"]}),spider:Uo({label:"Spider (8 simple eyes)",group:"arthropod",standIn:"compound",structure:"ocellus",placement:{kind:"frontal",yawDeg:8,pitchDeg:null},count:"8",eyeshine:"silver-white",nativeFaces:["mandibles"]}),stalk:Uo({label:"Stalk eyes (crab, snail)",group:"arthropod",standIn:"compound",structure:"stalk",placement:{kind:"stalk",yawDeg:40,pitchDeg:55},extras:"stalk",nativeFaces:["mandibles","blunt"]})},d0=n=>{if(n&&typeof n=="object"&&!Object.isFrozen(n)){for(const t of Object.values(n))d0(t);Object.freeze(n)}return n},pa=d0(Object.fromEntries(su.map(n=>[n,{kind:n,...CM[n]}])));function po(n){return typeof n=="string"&&h0.includes(n)}function Rh(n){return pa[n].structure==="camera"}function LM(n,t){return n==="eyespot"?t==="blunt"?"eyespot":"round":n==="stalk"?t==="blunt"?"eyespot":"compound":pa[n].standIn}function RS(n,t){return pa[n].nativeFaces.includes(t)||n==="round"&&AM.includes(t)}const CS="fauna-composer-face-2",PM=["auto",...su],Ic=2;function vc(n){return n.eyeRules===1?1:2}const DM=["auto",...wM],f0=Object.freeze({"dark-brown":[.035,.018,.008],brown:[.09,.045,.015],amber:[.4,.2,.03],gold:[.55,.38,.06],yellow:[.7,.55,.05],orange:[.7,.25,.03],red:[.5,.04,.02],green:[.18,.28,.06],pale:[.55,.55,.5],...TM});function Uc(n){return n==="proboscis"?"muzzle":n}const pi=n=>({built:n,effect:null}),as=n=>({built:"none",effect:n}),Vd="Not built: mammal skulls carry no bony crest.",Hd="Not built: birds and turtles never grow horns; only a casque (Crest).",El=n=>({none:pi("none"),nasal:as(n),paired:as(n),ossicones:as(n),crest:as(n)}),IM=Object.freeze({muzzle:{none:pi("none"),nasal:pi("nasal"),paired:pi("paired"),ossicones:pi("ossicones"),crest:as(`${Vd} Choose Paired horns or Ossicones.`)},proboscis:{none:pi("none"),paired:pi("paired"),nasal:as("Not built: a trunk face has no nose bones to carry a horn."),ossicones:as("Not built: ossicones grow only on giraffe-like muzzles."),crest:as(Vd)},jaws:{none:pi("none"),nasal:pi("nasal"),paired:pi("paired"),crest:pi("crest"),ossicones:{built:"paired",effect:"Built as brow horns: ossicones grow only on giraffe-like muzzles."}},beak:{none:pi("none"),crest:pi("crest"),nasal:{built:"crest",effect:"Built as a casque: a beak carries a casque, not a nose horn."},paired:as(Hd),ossicones:as(Hd)},"flat-face":El("Not built: primate faces carry no horns."),blunt:El("Not built: a worm head has no skull to carry horns."),mandibles:El("Not built: arthropod heads carry no bony horns.")});function ru(n){const t=IM[n.head],e=t?.[n.horns];return e?{...e}:pi("none")}const No=["round","horizontal","vertical-slit"],UM=Object.freeze({muzzle:No,proboscis:No,jaws:No,beak:No,"flat-face":No,blunt:["eyespot"],mandibles:["compound"]}),Ch=Object.freeze({"flat-face":{gazeYawDeg:15,k:.13},"muzzle-carnivore":{gazeYawDeg:35,k:.13},"muzzle-grazer":{gazeYawDeg:65,k:.14},"jaws-upright":{gazeYawDeg:45,k:.13},"jaws-sprawled":{gazeYawDeg:70,k:.13},proboscis:{gazeYawDeg:70,k:.07},beak:{gazeYawDeg:75,k:.16},mandibles:{gazeYawDeg:90,k:0},blunt:{gazeYawDeg:20,k:0},"mandibles-camera":{gazeYawDeg:70,k:.21},"blunt-camera":{gazeYawDeg:35,k:.19}}),NM=n=>n.feet==="hoof"||n.legs==="unguligrade"||n.legs==="pillar",ou=n=>n.layout==="sprawled"||n.layout==="limbless";function p0(n,t){if(t==="compound")return"mandibles";if(t==="eyespot")return"blunt";if(t&&(n.head==="mandibles"||n.head==="blunt"))return n.head==="mandibles"?"mandibles-camera":"blunt-camera";switch(n.head){case"muzzle":return NM(n)?"muzzle-grazer":"muzzle-carnivore";case"jaws":return ou(n)?"jaws-sprawled":"jaws-upright";default:return n.head}}function au(n){switch(n.head){case"mandibles":return"compound";case"blunt":return"eyespot";case"beak":case"flat-face":case"proboscis":return"round";case"muzzle":return n.feet==="hoof"||n.legs==="unguligrade"?"horizontal":n.legs==="pillar"?"round":n.bodyLength<.9?"vertical-slit":"round";case"jaws":return ou(n)?"vertical-slit":"round";default:return"round"}}function OM(n){switch(n.head){case"mandibles":return n.layout==="many-legged"&&n.legPairs===4?"spider":n.layout!=="many-legged"||n.legPairs===3?"insect":"compound";case"muzzle":return n.feet==="hoof"||n.legs==="unguligrade"?"horizontal":n.legs==="pillar"?"round":n.bodyLength<.9?"cat":"round";case"jaws":return n.layout==="sprawled"&&n.bodyLength>=1?"crocodile":ou(n)?"vertical-slit":"round";default:return au(n)}}function m0(n,t=vc(n)){return t===1?au(n):OM(n)}function FM(n,t){if(!Rh(t))return[];if(!po(t))return pa[t].irisBands??["dark-brown"];switch(n.head){case"muzzle":return t==="vertical-slit"?["amber","gold"]:["dark-brown","brown"];case"proboscis":return["dark-brown"];case"jaws":return["gold","amber","orange","green"];case"beak":return n.layout==="sprawled"?["dark-brown","green"]:["yellow","orange","red","dark-brown"];case"flat-face":return["dark-brown","brown"];case"mandibles":case"blunt":return["amber","gold"];default:return["dark-brown"]}}function kM(n,t){if(n.eyes!=="auto"||po(t)||!Rh(t))return t;const e=au(n);return Rh(e)?e:t}function Gd(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t^=t>>>16,t=Math.imul(t,2146121005),t^=t>>>15,t=Math.imul(t,2221713035),(t^t>>>16)>>>0}const zM="compound eyes belong to arthropod heads.",BM="eyespots belong to worm heads.";function yc(n){const t=vc(n),e=m0(n,t),i=n.eyes;let s=e,r=null;i!=="auto"&&(t===2||!po(i)||UM[n.head]?.includes(i)?s=i:n.head==="mandibles"?r="Built as compound: arthropod heads have compound eyes.":n.head==="blunt"?r="Built as eyespot: a worm head has only pigment eyespots.":r=`Built as ${e}: ${i==="compound"?zM:BM}`);const o=kM(n,s),a=FM(n,o);let l=null;a.length&&(l=n.iris!=="auto"?n.iris:po(o)?a[Gd(`face-eye-v1/${n.colorSeed}/${n.head}`)%a.length]:a[Gd(`face-eye-v2/${n.colorSeed}/${n.head}/${s}`)%a.length]);const c=LM(s,n.head),u=Ch[p0(n,c)];return{chosen:i,rules:t,kind:s,traits:pa[s],built:c,auto:i==="auto",iris:n.iris,irisBuilt:l,gazeYawDeg:u.gazeYawDeg,k:u.k,effect:r}}function VM(n){const t=[],e=ru(n);e.built!==n.horns&&t.push({part:"Horns",chosen:n.horns,effect:e.effect});const i=yc(n);return i.effect&&t.push({part:"Eyes",chosen:n.eyes,effect:i.effect}),n.iris!=="auto"&&i.irisBuilt===null&&t.push({part:"Iris colour",chosen:n.iris,effect:i.rules===1&&po(i.kind)?"Iris colour has no effect: compound eyes and eyespots have no iris.":"Iris colour has no effect: compound eyes, simple eyes, eye stalks and eyespots have no iris."}),t}const HM=["muzzle","jaws","beak","flat-face","blunt","mandibles"];function GM(n,t){if(n.trunk!=="trunk")return;const e=typeof n.head=="string"&&HM.includes(n.head)?n.head:"muzzle";e==="muzzle"?(n.head="proboscis",t.push("Trunk: now a face type; this muzzle became Face = Proboscis.")):(n.trunk="none",t.push(`Trunk: removed. A trunk is a nose and only grows on a mammal muzzle; this ${e} face is kept. Choose Face -> Proboscis for a trunk.`))}function WM(n){return n.head==="proboscis"?{...n,head:"muzzle"}:n}const Ji=4,Wd=1200,cu=["limbless","biped","quadruped","sprawled","many-legged"],Oi={layout:cu,torso:["slim","barrel","deep-chest","flat","annulated","segmented"],head:["muzzle","jaws","beak","flat-face","blunt","mandibles","proboscis"],horns:["none","nasal","paired","ossicones","crest"],legs:["pillar","plantigrade","digitigrade","unguligrade","arthropod"],feet:["hoof","paw","claw","pad","hand","spike"],arms:["none","small","grasping"],hands:["hand","claw","pincer"],tail:["none","stub","reptile","tufted","feather-fan","club"],armor:["none","dome","plates","osteoderms","bands"],wings:["none","feathered","membrane"],trunk:["none","trunk"],palette:a0,pattern:iu,sex:["auto","female","male"],eyes:PM,iris:DM},oa={legPairs:[0,12,1],bodyLength:[.2,6,.01],girth:[.5,1.6,.01],posture:[0,1,.01],neckLength:[0,1.5,.01],headSize:[.5,1.6,.01],snoutLength:[0,1.5,.01],legLength:[.1,1.8,.01],armLength:[.2,1.4,.01],tailLength:[0,2,.01],wingSpan:[.5,4,.01],trunkLength:[.2,1.4,.01],colorSeed:[0,9999,1],marks:[0,255,1],patternScale:[.5,2,.05],patternContrast:[0,1.5,.05],countershade:[0,1,.05],dimorphism:[0,1,.05],variability:[0,2,.05],allometry:[0,1,.05],individualSeed:[0,9999,1],maturity:[.2,1,.01],condition:[-1,1,.05],eyeRules:[1,2,1]},LS=Object.freeze(["legPairs","bodyLength","girth","posture","neckLength","headSize","snoutLength","legLength","armLength","tailLength","wingSpan","trunkLength","colorSeed","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","individualSeed","maturity","condition"]),vo=["layout","legPairs","bodyLength","girth","posture","torso","neckLength","head","headSize","snoutLength","horns","legs","legLength","feet","arms","armLength","hands","tail","tailLength","armor","wings","wingSpan","trunk","trunkLength","palette","colorSeed"],lu=Object.freeze([...vo,"pattern","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","individualSeed","sex","maturity","condition"]),g0=Object.freeze([...lu,"eyes","iris"]),hu=[...g0,"eyeRules"],x0=[...vo,"pattern","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","eyes","iris","eyeRules"],uu={version:4,layout:"quadruped",legPairs:2,bodyLength:1,girth:1,posture:.2,torso:"slim",neckLength:.4,head:"muzzle",headSize:1,snoutLength:.6,horns:"none",legs:"digitigrade",legLength:.8,feet:"paw",arms:"none",armLength:.6,hands:"hand",tail:"tufted",tailLength:.6,armor:"none",wings:"none",wingSpan:2,trunk:"none",trunkLength:.8,palette:"earth",colorSeed:1,pattern:"auto",marks:0,patternScale:1,patternContrast:1,countershade:.8,dimorphism:0,variability:0,allometry:0,individualSeed:0,sex:"auto",maturity:1,condition:0,eyes:"auto",iris:"auto",eyeRules:Ic},XM=Object.freeze(Object.fromEntries(lu.filter(n=>!vo.includes(n)).map(n=>[n,uu[n]]))),qM=Object.freeze({eyes:"auto",iris:"auto"}),YM=Object.freeze({eyeRules:Ic}),Ui=n=>Object.freeze({...uu,...n}),Ni={variability:1,allometry:1},mo={dinosaur:Ui({layout:"biped",legPairs:1,bodyLength:1.6,girth:1.05,posture:.12,torso:"deep-chest",neckLength:.45,head:"jaws",headSize:1.35,snoutLength:1,horns:"crest",legs:"digitigrade",legLength:1.05,feet:"claw",arms:"small",armLength:.38,hands:"claw",tail:"reptile",tailLength:1.6,palette:"reptile",colorSeed:17,marks:16,dimorphism:0,...Ni}),turtle:Ui({layout:"sprawled",bodyLength:.55,girth:1.1,posture:0,torso:"flat",neckLength:.35,head:"beak",headSize:.9,snoutLength:.25,legs:"pillar",legLength:.42,feet:"pad",tail:"stub",tailLength:.25,armor:"dome",palette:"reptile",colorSeed:211,dimorphism:0,...Ni}),giraffe:Ui({layout:"quadruped",bodyLength:1.5,girth:.9,posture:.7,torso:"slim",neckLength:1.5,head:"muzzle",headSize:.85,snoutLength:.8,horns:"ossicones",legs:"unguligrade",legLength:1.45,feet:"hoof",tail:"tufted",tailLength:.6,palette:"savanna",colorSeed:37,marks:0,dimorphism:.3,...Ni}),bird:Ui({layout:"biped",legPairs:1,bodyLength:.22,girth:1.2,posture:.45,torso:"barrel",neckLength:.45,head:"beak",headSize:1.2,snoutLength:.55,legs:"digitigrade",legLength:.85,feet:"claw",tail:"feather-fan",tailLength:.9,wings:"feathered",wingSpan:3.2,palette:"plumage",colorSeed:5,dimorphism:.6,...Ni}),ostrich:Ui({layout:"biped",legPairs:1,bodyLength:.8,girth:1.1,posture:.3,torso:"barrel",neckLength:1.5,head:"beak",headSize:.75,snoutLength:.45,legs:"digitigrade",legLength:1.8,feet:"claw",tail:"feather-fan",tailLength:.4,wings:"feathered",wingSpan:1.3,palette:"ink",colorSeed:88,marks:1,dimorphism:.8,...Ni}),rhinoceros:Ui({layout:"quadruped",bodyLength:2.1,girth:1.4,posture:.1,torso:"barrel",neckLength:.2,head:"muzzle",headSize:1.15,snoutLength:.75,horns:"nasal",legs:"pillar",legLength:.5,feet:"pad",tail:"tufted",tailLength:.25,armor:"osteoderms",palette:"slate",colorSeed:61,countershade:.3,dimorphism:.2,...Ni}),ape:Ui({layout:"biped",legPairs:1,bodyLength:.6,girth:1.15,posture:.85,torso:"deep-chest",neckLength:.1,head:"flat-face",headSize:1.1,snoutLength:.35,legs:"plantigrade",legLength:1.05,feet:"hand",arms:"grasping",armLength:1.25,hands:"hand",tail:"none",tailLength:0,palette:"ink",colorSeed:143,marks:2,dimorphism:.5,...Ni}),worm:Ui({layout:"limbless",legPairs:0,bodyLength:1.1,girth:1,posture:0,torso:"annulated",neckLength:0,head:"blunt",headSize:1,snoutLength:.2,legs:"pillar",feet:"pad",tail:"none",tailLength:0,palette:"earth",colorSeed:401,dimorphism:0,...Ni}),centipede:Ui({layout:"many-legged",legPairs:11,bodyLength:.55,girth:.9,posture:0,torso:"segmented",neckLength:0,head:"mandibles",headSize:1,snoutLength:.3,legs:"arthropod",legLength:.2,feet:"spike",tail:"none",tailLength:0,armor:"bands",palette:"ink",colorSeed:909,dimorphism:0,...Ni}),"shelled-giraffe-bird":Ui({layout:"biped",legPairs:1,bodyLength:.9,girth:1.2,posture:.3,torso:"barrel",neckLength:1.3,head:"beak",headSize:.9,snoutLength:.5,horns:"crest",legs:"unguligrade",legLength:1.3,feet:"hoof",tail:"stub",tailLength:.3,armor:"dome",wings:"feathered",wingSpan:1.6,palette:"savanna",colorSeed:2718,dimorphism:0,...Ni}),"trunked-centipede":Ui({layout:"many-legged",legPairs:7,bodyLength:1.4,girth:1.3,posture:0,torso:"segmented",neckLength:.3,head:"proboscis",headSize:1,snoutLength:.4,horns:"none",legs:"pillar",legLength:.24,feet:"pad",tail:"tufted",tailLength:.2,armor:"bands",trunk:"trunk",trunkLength:1,palette:"slate",colorSeed:3141,dimorphism:0,...Ni}),"winged-ape-rhino":Ui({layout:"quadruped",bodyLength:1.2,girth:1.25,posture:.25,torso:"deep-chest",neckLength:.15,head:"flat-face",headSize:1.1,snoutLength:.5,horns:"none",legs:"plantigrade",legLength:.7,feet:"hand",arms:"grasping",armLength:.8,hands:"hand",tail:"club",tailLength:.8,wings:"membrane",wingSpan:2.4,palette:"earth",colorSeed:1618,dimorphism:0,...Ni})},jM=Object.keys(mo),PS={dinosaur:"Dinosaur-like",turtle:"Turtle-like",giraffe:"Giraffe-like",bird:"Bird-like",ostrich:"Ostrich-like",rhinoceros:"Rhinoceros-like",ape:"Ape-like",worm:"Worm-like",centipede:"Centipede-like","shelled-giraffe-bird":"Hybrid: shelled giraffe-bird","trunked-centipede":"Hybrid: trunked centipede","winged-ape-rhino":"Hybrid: winged ape-rhino"};function DS(n){if(typeof n!="string"||!Object.hasOwn(mo,n))throw new Error(`Unknown composer preset: ${String(n).slice(0,40)}`);return{...mo[n]}}function IS(n){return typeof n=="string"&&Object.hasOwn(mo,n)}const $M={"shelled-giraffe-bird":{horns:"ossicones"},"trunked-centipede":{horns:"nasal"},"winged-ape-rhino":{horns:"nasal"}};function KM(n){return jM.find(t=>{const e={...mo[t],...$M[t]};return vo.every(i=>e[i]===n[i])})}const _0=(n,t)=>t>=1?Math.round(n):Math.round(n/t)*t,b0=n=>Number(n.toFixed(4));function M0(n){if(!cu.includes(n))throw new Error(`Unknown composer layout: ${String(n).slice(0,40)}`);return n==="limbless"?[0,0]:n==="biped"?[1,1]:n==="quadruped"||n==="sprawled"?[2,2]:[3,12]}function Mr(n){const t=[],e=!!n&&typeof n=="object"&&!Array.isArray(n);let i=e?n:{};e||t.push("Recipe was not a plain object; defaults used."),e&&"version"in i&&i.version!==1&&i.version!==2&&i.version!==3&&i.version!==Ji&&t.push(`Recipe version ${String(i.version).slice(0,12)} is not supported; fields were read as version ${Ji}.`),e&&(i.version===1||i.version===2)&&(i={...i},GM(i,t));const s={...uu},r=s;for(const l of Object.keys(Oi)){if(!(l in i))continue;const c=i[l],u=Oi[l];typeof c=="string"&&u.includes(c)?r[l]=c:t.push(`Unknown ${l} "${String(c).slice(0,40)}"; using ${String(r[l])}.`)}for(const l of Object.keys(oa)){if(!(l in i))continue;const[c,u,d]=oa[l],p=i[l],m=typeof p=="number"?p:typeof p=="string"&&p.trim()?Number(p):NaN;if(!Number.isFinite(m)){t.push(`${l} is not a finite number; using ${String(r[l])}.`);continue}const g=b0(Math.max(c,Math.min(u,_0(m,d))));Math.abs(g-m)>d*.5+1e-9&&t.push(`${l} ${m} limited to ${g}.`),r[l]=g}const[o,a]=M0(s.layout);if(s.legPairs<o||s.legPairs>a){const l=Math.max(o,Math.min(a,s.legPairs));"legPairs"in i&&t.push(`${s.layout} body uses ${o===a?o:`${o}-${a}`} leg pairs; ${s.legPairs} set to ${l}.`),s.legPairs=l}return s.trunk=s.head==="proboscis"?"trunk":"none",s.version=Ji,{recipe:s,issues:t}}function ZM(n){const t=[],e=n.layout!=="limbless";if(e||(t.push({part:"Legs and feet",chosen:`${n.legs} / ${n.feet}`,effect:"Not built: a limbless body has no legs. It crawls on its belly instead."}),n.neckLength>0&&t.push({part:"Neck",chosen:n.neckLength.toFixed(2),effect:"A limbless body has no separate neck; the front of the body is raised and lengthened instead."})),n.layout==="many-legged"&&n.legs!=="arthropod"&&n.legLength>.45&&t.push({part:"Leg length",chosen:n.legLength.toFixed(2),effect:"Shortened to 0.45 body lengths so neighbouring leg pairs do not cross."}),n.armor==="dome"&&(n.layout==="limbless"||n.layout==="many-legged")&&t.push({part:"Shell",chosen:"dome",effect:"Covers only the middle third so the long flexible body can still bend."}),n.armor==="dome"&&n.wings!=="none"&&t.push({part:"Wings",chosen:n.wings,effect:"Wing roots are moved to the shell rim instead of the back."}),n.armor==="plates"&&n.layout==="many-legged"&&t.push({part:"Armor",chosen:"plates",effect:"One plate per body segment."}),t.push(...VM(n)),n.arms!=="none"&&n.layout!=="biped"&&t.push({part:"Arms",chosen:n.arms,effect:n.layout==="limbless"?"Attached behind the head; the body still crawls.":"Added as an extra pair in front of the walking legs; they do not touch the ground."}),n.arms==="none"&&n.hands!=="hand"&&t.push({part:"Hands",chosen:n.hands,effect:"Not built because no arms are selected."}),n.wings!=="none"){const i=v0(n);n.wingSpan>i&&t.push({part:"Wing span",chosen:n.wingSpan.toFixed(2),effect:`Limited to ${i.toFixed(2)} body lengths so folded wings stay off the ground.`}),t.push({part:"Wings",chosen:n.wings,effect:"Folded at rest; articulated wingbeats and extended wings for flight and gliding."})}return n.tail==="none"&&n.tailLength>0&&t.push({part:"Tail length",chosen:n.tailLength.toFixed(2),effect:"Ignored because no tail is selected."}),n.feet==="spike"&&n.layout!=="many-legged"&&e&&t.push({part:"Feet",chosen:"spike",effect:"Pointed tips carry the weight on a very small contact area."}),n.layout==="biped"&&n.posture>.6&&n.tail!=="none"&&n.tailLength>1&&t.push({part:"Tail",chosen:n.tail,effect:"An upright body lets a long tail rest along the ground."}),t}function v0(n){return n.layout==="limbless"?1.5:n.layout==="many-legged"||n.layout==="sprawled"?2:4}function aa(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t^=t>>>16,t=Math.imul(t,2146121005),t^=t>>>15,t=Math.imul(t,2221713035),(t^t>>>16)>>>0}function du(n){let t=aa(n)||1;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}const QM=["muzzle","jaws","beak","flat-face","blunt","mandibles"];function JM(n){const t=du(`composer-random-v1/${String(n).slice(0,160)}`),e=(c,u)=>{if(!u)return c[Math.floor(t()*c.length)%c.length];const d=u.reduce((m,g)=>m+g,0);let p=t()*d;for(let m=0;m<c.length;m++)if(p-=u[m],p<=0)return c[m];return c[c.length-1]},i=(c,u,d)=>{const[p,m,g]=oa[c],x=u??p;return b0(_0(x+((d??m)-x)*t(),g))},s=e(cu,[1,2.2,2.2,1.3,1.3]),[r,o]=M0(s),a=s==="many-legged"?e(Oi.legs,[1,.5,.4,.3,2.5]):e(Oi.legs,[1,1,1.2,1,.4]),l={...XM,...qM,...YM,version:Ji,layout:s,legPairs:r+Math.floor(t()*(o-r+1)),bodyLength:s==="limbless"||s==="many-legged"?i("bodyLength",.4,2):i("bodyLength",.3,2.4),girth:i("girth",.75,1.4),posture:i("posture"),torso:e(s==="limbless"?["annulated","slim","segmented"]:s==="many-legged"?["segmented","annulated","flat"]:["slim","barrel","deep-chest","flat"]),neckLength:s==="limbless"?0:i("neckLength",0,1.5),head:e(QM),headSize:i("headSize",.7,1.4),snoutLength:i("snoutLength",.1,1.2),horns:e(Oi.horns,[2.5,1,1,1,1]),legs:a,legLength:s==="many-legged"?i("legLength",.12,.4):s==="sprawled"?i("legLength",.3,.7):i("legLength",.4,1.6),feet:a==="arthropod"?e(["spike","claw","hand"],[3,1,.5]):e(Oi.feet,[1,1,1,1,.6,.3]),arms:e(Oi.arms,s==="biped"?[1,1,1.5]:[3,.5,1]),armLength:i("armLength",.3,1.2),hands:e(Oi.hands),tail:e(Oi.tail,[.8,.8,1.5,1,.8,.6]),tailLength:i("tailLength",.2,1.6),armor:e(Oi.armor,[2,1,.8,.8,.8]),wings:e(Oi.wings,[2.2,1,1]),wingSpan:i("wingSpan",1,3),trunk:e(Oi.trunk,[3,1]),trunkLength:i("trunkLength",.4,1.2),palette:e(r0),colorSeed:Math.floor(t()*1e4)};return l.tail==="none"&&(l.tailLength=0),l}const tv=75;function ev(n,t){const e=`composer-wild-eyes-1/${String(n).slice(0,160)}`;if(aa(e)%1e3>=tv)return"auto";const i=m0(t,Ic),s=su.filter(r=>r!==i);return s[aa(`${e}/kind`)%s.length]}function US(n){const t=JM(n);return t.trunk==="trunk"&&(t.head==="muzzle"?t.head="proboscis":t.trunk="none"),t.horns=ru(t).built,t.eyeRules=Ic,t.eyes=ev(n,t),t.iris="auto",Mr(t).recipe}const nv=new Set(Object.keys(oa));function NS(n){const{recipe:t}=Mr(n);return[`v${Ji}`,...hu.map(e=>`${e}_${String(t[e])}`)].join("*")}function OS(n){if(typeof n!="string"||!n.trim())return{recipe:null,issues:[],error:"Empty composer recipe."};if(n.length>Wd)return{recipe:null,issues:[],error:`Composer recipe is longer than ${Wd} characters.`};const[t,...e]=n.split("*"),i=t==="v1"?1:t==="v2"?2:t==="v3"?3:t===`v${Ji}`?Ji:0;if(!i)return{recipe:null,issues:[],error:`Unsupported composer recipe version "${String(t).slice(0,12)}".`};const s=i===1,r=i===1?vo:i===2?lu:i===3?g0:hu,o={},a=[];for(const u of e){const d=u.indexOf("_"),p=d>0?u.slice(0,d):u,m=d>0?u.slice(d+1):"";if(!r.includes(p)){a.push(`Ignored unknown recipe field "${p.slice(0,24)}".`);continue}if(p in o){a.push(`Repeated recipe field "${p}"; first value kept.`);continue}o[p]=nv.has(p)?m.trim()?Number(m):NaN:m}const l=Mr({...o,version:i});i>=3&&"trunk"in o&&o.trunk!==l.recipe.trunk&&a.push("Trunk follows the Face; trunk field ignored."),s&&sv(l.recipe);const c=i<4?iv(l.recipe):null;return{recipe:l.recipe,issues:[...a,...l.issues,...c?[c]:[]],error:null}}function iv(n){const t=yc({...n,eyeRules:2}),e=yc({...n,eyeRules:1});if(t.kind===e.kind&&t.irisBuilt===e.irisBuilt)return null;const i=s=>`${s.kind}${s.irisBuilt?` (${s.irisBuilt})`:""}`;return`Eyes: upgraded to the current eye rules: ${i(t)} eyes, where the earlier rules built ${i(e)}. Eye rules -> Earlier restores them.`}function sv(n){const t=KM(n);if(!t)return;const e=n,i=mo[t];for(const s of x0)vo.includes(s)||(e[s]=i[s])}function FS(n,t){return n.version===Ji&&t.version===Ji&&hu.every(e=>n[e]===t[e])}function kS(n,t){return n.version===Ji&&t.version===Ji&&x0.every(e=>n[e]===t[e])}const rv="fauna-composer-individual-2",ov=["layout","torso","head","horns","legs","feet","arms","hands","tail","armor","wings","trunk"],cs=(n,t,e)=>Math.max(t,Math.min(e,n)),Ze=n=>{const t=Math.round(n*1e9)/1e9;return t===0?0:t},av=n=>n.toString(16).padStart(8,"0");function cv(n){const t=WM(n);return av(aa(ov.map(e=>`${e}_${String(t[e])}`).join("*")))}function lv(n,t){if(t===0)return{z:{size:0,limb:0,neck:0,head:0,tail:0,mass:0,carriage:0},sexU:0,horn:0,curl:0,asymMag:0,asymSign:0,ear:0,eye:0,limbR:0,fore:[0,0,0],hind:[0,0,0],torso:[0,0,0,0,0],headPitch:0,tailCarriage:0,phase:0,period:0,duty:0,lift:0,breath:0,look:0,osteoderm:.5,plate:.5,feather:.5,posture:0};const e=du(`composer-individual-v2/${n}/${t}`),i=()=>cs((e()+e()+e()-1.5)/.5,-2,2),s={size:i(),limb:i(),neck:i(),head:i(),tail:i(),mass:i(),carriage:i()},r=e(),o=i(),a=i(),l=e(),c=e(),u=i(),d=i(),p=i(),m=[i(),i(),i()],g=[i(),i(),i()],x=[i(),i(),i(),i(),i()],f=i(),h=i(),M=e(),_=i(),b=i(),S=i(),y=e(),E=e(),R=e(),w=e(),T=e(),C=i();return{z:s,sexU:r,horn:o,curl:a,asymMag:l,asymSign:c,ear:u,eye:d,limbR:p,fore:m,hind:g,torso:x,headPitch:f,tailCarriage:h,phase:M,period:_,duty:b,lift:S,breath:y,look:E,osteoderm:R,plate:w,feather:T,posture:C}}const rs=(n,t,e)=>cs(t*n+Math.sqrt(1-t*t)*e,-2,2);function hv(n,t){return n.sex==="female"||n.sex==="male"?n.sex:n.dimorphism>0&&n.individualSeed>0?t<.5?"female":"male":"none"}function Zo(n){const t=Mr(n).recipe,e=t.variability,i=t.dimorphism,s=t.maturity,r=t.individualSeed,o=cv(t),a=lv(o,r),l=a.z,c=hv(t,a.sexU),u=c==="male"?1+.35*i:c==="female"?1-.6*i:1,d=Math.round(t.bodyLength*1e3)/1e3,p=t.allometry,m=(f,h,M)=>{if(r===0||e===0)return 0;const _=h+Math.min(M-h,Math.floor(f*(M-h+1)));return Math.round(_*Math.min(1,e))||0},g=t.marks&yn["juvenile-spots"]?cs((.75-s)/.4,0,1):0;return{version:rv,individualSeed:r,speciesKey:o,sex:c,maturity:s,condition:t.condition,size:Ze(l.size),limb:Ze(l.limb),neck:Ze(l.neck),head:Ze(l.head),tail:Ze(l.tail),mass:Ze(l.mass),posture:Ze(rs(l.carriage,.4,a.posture)),hornScale:Ze(Math.max(.05,1+.15*e*a.horn)*u*s*s),hornCurl:Ze(.15*e*a.curl),hornAsym:Ze((a.asymSign<.5?-1:1)*(.02+.03*a.asymMag)*e*(r===0?0:1)),earScale:Ze((1+.075*e*a.ear)*(1+.2*(1-s))),eyeScale:Ze((1+.04*e*a.eye)*(1+.25*(1-s))),limbRadius:Ze(1+.05*e*rs(l.mass,.6,a.limbR)+.04*t.condition),segmentJitter:{fore:a.fore.map(f=>Ze(.025*e*f)),hind:a.hind.map(f=>Ze(.025*e*f))},torso:{chest:Ze(cs(e*rs(l.mass,.5,a.torso[0]),-2,2)),belly:Ze(cs(e*rs(l.mass,.5,a.torso[1]),-2,2)),rump:Ze(cs(e*rs(l.mass,.5,a.torso[2]),-2,2)),waist:Ze(cs(e*rs(l.mass,-.4,a.torso[3]),-2,2)),withers:Ze(cs(e*rs(l.neck,.5,a.torso[4]),-2,2))},carriage:{neck:Ze(.06*e*l.carriage),headPitch:Ze(.04*e*rs(l.carriage,-.5,a.headPitch)),tail:Ze(.075*e*rs(l.carriage,.3,a.tailCarriage))},motion:{phase:Ze(a.phase),periodScale:Ze(1+.03*e*rs(l.size,.5,a.period)),dutyDelta:Ze(.015*e*a.duty),liftScale:Ze(1+.05*e*a.lift),breathPhase:Ze(a.breath),lookPhase:Ze(a.look)},coat:{driftKey:`${o}/${r}`,juvenileSpots:Ze(g)},countScale:{osteoderm:m(a.osteoderm,-2,2),plate:m(a.plate,-2,2),feather:m(a.feather,-1,3)},allometry:{limbRobust:Ze(d**(.09*p)),headRel:Ze(d**(-.12*p)),eyeRel:Ze(d**(-.25*p))},neutral:r===0&&s===1&&t.condition===0&&c==="none"&&p===0}}const uv={bodyLength:["Body length"," m"],girth:["Girth",""],legLength:["Leg length",""],neckLength:["Neck length",""],headSize:["Head size",""],snoutLength:["Snout length",""],tailLength:["Tail length",""],posture:["Posture",""]},dv=(n,t)=>t>=1?Math.round(n):Math.round(n/t)*t,fv=n=>Number(n.toFixed(4));function zS(n){const t=Mr(n).recipe,e=Zo(t);if(e.neutral)return{recipe:{...t},traits:e,deltas:[]};const i={...t},s=[],r=[],o=t.variability,a=t.dimorphism,l=t.maturity,c=e.sex,u=(x,f,h=0)=>{const M=f.reduce((I,[F])=>I*F,1);if(M===1&&h===0)return;const[_,b,S]=oa[x],y=i[x],E=y*M+h,R=fv(cs(dv(E,S),_,b)),[w,T]=uv[x];if((E<_-S*.5||E>b+S*.5)&&r.push(`${w} limited to ${R.toFixed(2)}${T} (range ${E<_?"minimum":"maximum"}; ${E.toFixed(3)}${T} requested).`),R===y)return;i[x]=R;const C=[...f.filter(([I])=>I!==1).map(([I,F])=>`${F} ${I>=1?"+":""}${((I-1)*100).toFixed(1)}%`),...h?[`individual carriage ${h>0?"+":""}${h.toFixed(3)}`]:[]].join(", ");s.push(`${w} ${y.toFixed(2)} → ${R.toFixed(2)}${T} (${C}).`)},d=1-l,p=t.legs==="unguligrade"||t.legs==="digitigrade";u("bodyLength",[[1+.045*o*e.size,"individual size"],[c==="male"?1+.1*a:1,"male"],[.45+.55*l,`maturity ${l}`]]);const m=Zo(i).allometry.headRel;if(u("legLength",[[1+.045*o*e.limb-.01*o*e.mass,"individual limbs"],[p?1+.15*d:1,`maturity ${l}`]]),u("neckLength",[[1+.065*o*e.neck,"individual neck"],[.75+.25*l,`maturity ${l}`]]),u("headSize",[[1+.05*o*e.head,"individual head"],[1+.5*d,`maturity ${l}`],[m,"allometry"]]),u("snoutLength",[[1+.06*o*e.head,"individual head"],[.7+.3*l,`maturity ${l}`]]),t.tail!=="none"&&u("tailLength",[[1+.08*o*e.tail,"individual tail"],[.8+.2*l,`maturity ${l}`]]),u("girth",[[1+.06*t.condition+.04*o*e.mass,"condition and build"],[c==="male"?1+.05*a:1,"male"]]),t.layout==="quadruped"&&u("posture",[],.12*o*e.posture),t.layout==="biped"){const x=t.posture,f=x>.6,h=cs(x+.035*o*e.posture,f?Math.min(x,.61):0,f?1:.6);u("posture",[],h-x)}const g=Mr(i).recipe;return{recipe:g,traits:Zo(g),deltas:[...s,...r]}}const BS="fauna-coat-1",Nc={marks:[0,255],scale:[.5,2],contrast:[0,1.5],countershade:[0,1],bellyLine:[-1,1],warp:[0,1],threshold:[-.3,.3],juvenileSpots:[0,1],greying:[0,1]},go={plain:0,spots:11,rosettes:8,reticulated:6.5,stripes:4.5,bands:3,saddle:0,"dorsal-stripe":0,dapple:12,piebald:2.2,roan:60,brindle:9};function ca(n,t,e){return n<t?t:n>e?e:n}function Zs(n){return n<0?0:n>1?1:n}const $n=1/4294967296,rn=new Uint32Array(3);function ma(n){let t=n>>>0^2654435769|0;return t=Math.imul(t^t>>>16,2146121005),t=Math.imul(t^t>>>15,2221713035),t^t>>>16|0}function wi(n,t,e,i){let s=Math.imul(n|0,1664525)+1013904223+i|0,r=Math.imul(t|0,1664525)+1013904223^(i<<11|i>>>21)|0,o=Math.imul(e|0,1664525)+1013904223+Math.imul(i,668265263)|0;s=s+Math.imul(r,o)|0,r=r+Math.imul(o,s)|0,o=o+Math.imul(s,r)|0,s^=s>>>16,r^=r>>>16,o^=o>>>16,s=s+Math.imul(r,o)|0,r=r+Math.imul(o,s)|0,o=o+Math.imul(s,r)|0,rn[0]=s>>>0,rn[1]=r>>>0,rn[2]=o>>>0}function Lh(n,t,e,i){return wi(n,t,e,ma(i)),rn[2]}function io(n){return n*n*n*(n*(n*6-15)+10)}const Tt=new Float64Array(4);function Xn(n){const t=Tt[0],e=Tt[1],i=Tt[2],s=Math.floor(t),r=Math.floor(e),o=Math.floor(i),a=io(t-s),l=io(e-r),c=io(i-o);wi(s,r,o,n);const u=rn[2];wi(s+1,r,o,n);const d=rn[2];wi(s,r+1,o,n);const p=rn[2];wi(s+1,r+1,o,n);const m=rn[2];wi(s,r,o+1,n);const g=rn[2];wi(s+1,r,o+1,n);const x=rn[2];wi(s,r+1,o+1,n);const f=rn[2];wi(s+1,r+1,o+1,n);const h=rn[2],M=u+(d-u)*a,_=p+(m-p)*a,b=g+(x-g)*a,S=f+(h-f)*a,y=M+(_-M)*l,E=b+(S-b)*l;Tt[3]=(y+(E-y)*c)*$n}const so=new Float64Array(3);function pv(n){const t=Tt[0],e=Tt[1],i=Tt[2],s=Math.floor(t),r=Math.floor(e),o=Math.floor(i),a=io(t-s),l=io(e-r),c=io(i-o);let u=0,d=0,p=0;for(let m=0;m<8;m++){const g=m&1,x=m>>1&1,f=m>>2&1,h=(g?a:1-a)*(x?l:1-l)*(f?c:1-c);wi(s+g,r+x,o+f,n),u+=rn[0]*h,d+=rn[1]*h,p+=rn[2]*h}so[0]=u*$n,so[1]=d*$n,so[2]=p*$n}function mv(n,t,e,i){return Tt[0]=n,Tt[1]=t,Tt[2]=e,Xn(ma(i)),Tt[3]}function Oo(n){const t=Tt[0],e=Tt[1],i=Tt[2];Xn(n);const s=Tt[3];Tt[0]=t*2.03+17.31,Tt[1]=e*2.03-9.17,Tt[2]=i*2.03+5.71,Xn(n^1540483477|0),Tt[3]=(2*s+Tt[3])/3}const Xo=.9;function $a(n,t){const e=Tt[0],i=Tt[1],s=Tt[2],r=Math.floor(e),o=Math.floor(i),a=Math.floor(s);let l=1e9,c=1e9,u=0,d=0,p=0,m=0;const g=(1-Xo)*.5;for(let x=-1;x<=1;x++)for(let f=-1;f<=1;f++)for(let h=-1;h<=1;h++){const M=r+x,_=o+f,b=a+h;wi(M,_,b,n);const S=e-(M+g+Xo*rn[0]*$n),y=i-(_+g+Xo*rn[1]*$n),E=s-(b+g+Xo*rn[2]*$n),R=S*S+y*y+E*E;R<l?(c=l,l=R,u=Math.imul(rn[0]^rn[2]>>>7,2654435761)^rn[1],d=S,p=y,m=E):R<c&&(c=R)}t[0]=Math.sqrt(l),t[1]=Math.sqrt(c),t[2]=u>>>0,t.length>=6&&(t[3]=d,t[4]=p,t[5]=m)}function gv(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t^=t>>>16,t=Math.imul(t,2146121005),t^=t>>>15,t=Math.imul(t,2221713035),(t^t>>>16)>>>0}function Oc(n){let t=gv(n)||1;return()=>{t=t+1831565813>>>0;let e=t;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}}function ro(n){return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function oo(n){return n<=.0031308?n*12.92:1.055*Math.pow(n,1/2.4)-.055}function y0(n){return .2126*n[0]+.7152*n[1]+.0722*n[2]}function xv(n){const t=parseInt(n.replace("#",""),16);return[ro((t>>16&255)/255),ro((t>>8&255)/255),ro((t&255)/255)]}function qr(n,t,e,i){const s=oo(Zs(n[0])),r=oo(Zs(n[1])),o=oo(Zs(n[2])),a=Math.max(s,r,o),l=Math.min(s,r,o),c=a-l;let u=0;c>1e-12&&(a===s?u=(r-o)/c/6:a===r?u=((o-s)/c+2)/6:u=((s-r)/c+4)/6,u<0&&(u+=1));const d=a>0?c/a:0;u=((u+t)%1+1)%1;const p=Zs(d*e),m=Zs(a*i),g=Math.floor(u*6),x=u*6-g,f=m*(1-p),h=m*(1-x*p),M=m*(1-(1-x)*p);let _=m,b=M,S=f;switch(g%6){case 1:_=h,b=m,S=f;break;case 2:_=f,b=m,S=M;break;case 3:_=f,b=h,S=m;break;case 4:_=M,b=f,S=m;break;case 5:_=m,b=f,S=h;break}return[ro(_),ro(b),ro(S)]}const _v={base:[.02,.6],accent:[.02,.6],belly:[.02,.6],skin:[.02,.6],keratin:[0,.5],eye:[0,.6],horn:[0,.6],plate:[.02,.6]};function Ph(n,t){const[e,i]=_v[n],s=y0(t);if(s>=e&&s<=i)return t;if(s<=1e-9){const o=Math.max(e,1e-4);return[o,o,o]}const r=(s<e?e:i)/s;return[t[0]*r,t[1]*r,t[2]*r]}function S0(n){const t={};for(const e of fa)t[e]=[n[e][0],n[e][1],n[e][2]];return t}function E0(n,t){const e=Oc(`coat-species-v1/${n}/${t}`),i=(e()-.5)*.08,s=(e()-.5)*.24,r=(e()-.5)*.2,o=Math.floor(e()*4294967296)>>>0;return{dh:i,ds:s,dv:r,seed:o}}function bv(n,t){if(!l0(n))throw new RangeError(`Unknown coat palette '${String(n)}'`);const e=E0(n,t),i=_M[n],s={};for(const r of fa)s[r]=Ph(r,qr(xv(i[r]),e.dh,1+e.ds,1+e.dv));return s}const wl={melanistic:.012,leucistic:.004,erythristic:.008};function w0(n,t){const e=Number.isFinite(t)?Zs(t):0,i=Oc(`coat-individual-v1/${n}`),s=[];for(let u=0;u<9;u++)s.push(i());if(e===0)return{hue:0,saturation:0,value:0,reseed:0,scale:0,threshold:0,warp:0,greying:0,morph:"none"};const r=s[8],o=wl.melanistic*e,a=wl.leucistic*e,l=wl.erythristic*e,c=r<o?"melanistic":r<o+a?"leucistic":r<o+a+l?"erythristic":"none";return{hue:(s[0]*2-1)*.015*e,value:(s[1]*2-1)*.08*e,saturation:(s[2]*2-1)*.1*e,reseed:(Math.floor(s[3]*4294967296)|1)>>>0,scale:(s[4]*2-1)*.08*e,threshold:(s[5]*2-1)*.06*e,warp:(s[6]*2-1)*.1*e,greying:.3*e*s[7]*s[7],morph:c}}const Mv=["base","accent","belly","skin"];function T0(n,t){const e=S0(n.colours);if(t.hue!==0||t.saturation!==0||t.value!==0||t.morph!=="none"){for(const s of Mv){let r=qr(e[s],t.hue,1+t.saturation,1+t.value);if(t.morph==="melanistic")r=qr(r,0,1,.35);else if(t.morph==="erythristic")r=qr(r,-.04,1.2,1);else if(t.morph==="leucistic"){r=qr(r,0,.25,1);const o=y0(r),a=Math.min(.55,o+(.55-o)*.8);if(o>1e-6){const l=a/o;r=[r[0]*l,r[1]*l,r[2]*l]}}e[s]=Ph(s,r)}t.value!==0&&(e.plate=Ph("plate",qr(e.plate,0,1,1+t.value)))}return{...n,colours:e,seed:t.reseed?(n.seed^t.reseed)>>>0:n.seed,scale:ca(n.scale*(1+t.scale),.5,2),threshold:ca(n.threshold+t.threshold,-.3,.3),warp:Zs(n.warp+t.warp),greying:Zs(n.greying+t.greying)}}function A0(n,t,e={}){if(!l0(n))throw new RangeError(`Unknown coat palette '${String(n)}'`);const i=E0(n,t),s=bv(n,t),r=e.pattern??"auto";if(!c0(r))throw new RangeError(`Unknown coat pattern '${String(r)}'`);const o=ca(Math.round(e.marks??0),0,255),a=S0(s);if(e.colours)for(const u of fa){const d=e.colours[u];d&&(a[u]=[d[0],d[1],d[2]])}const l=Nc,c=(u,d,[p,m])=>ca(Number.isFinite(u)?u:d,p,m);return{version:"fauna-coat-1",pattern:vM(r,n),marks:o,scale:c(e.scale,1,l.scale),contrast:c(e.contrast,1,l.contrast),countershade:c(e.countershade,.8,l.countershade),bellyLine:c(e.bellyLine,-.45,l.bellyLine),colours:a,markRole:e.markRole==="belly"?"belly":"accent",seed:e.seed===void 0?i.seed:e.seed>>>0,warp:c(e.warp,.5,l.warp),threshold:c(e.threshold,0,l.threshold),juvenileSpots:c(e.juvenileSpots,o&yn["juvenile-spots"]?1:0,l.juvenileSpots),greying:c(e.greying,0,l.greying)}}const xn=new Float64Array(6),Se=new Float64Array(6),vv=new Map(Object.entries(go)),dc=739982445,js=695872825,R0=1597334677,yv=461845907,xr=1759714724,Dh=1013904242;function C0(n,t){const e=Se[4];Se[0]=0,Se[1]=0,Se[2]=0,Se[3]=0;const i=n.pattern;if(i==="plain"){Se[5]=0;return}const s=ma(n.seed),r=n.threshold,o=n.warp,a=vv.get(i)*n.scale,l=t.region;let c,u,d;if(i==="saddle"){if(l!=="torso"&&l!=="neck"&&l!=="tail"){Se[5]=0;return}Tt[0]=t.x*7,Tt[1]=t.y*7,Tt[2]=t.z*7,Oo(s^js|0);const M=Tt[3]-.5;Tt[0]=t.x*42,Tt[1]=t.y*42,Tt[2]=t.z*42,Xn(s^xr|0);const _=Tt[3]-.5,b=(t.x+.03)/(.3+.3*r),S=(1-t.dorsal)/(.8+.3*r),y=Math.sqrt(b*b+S*S)+.22*o*M+.16*_,E=Math.max(.06,e*4);u=.92-E,d=.92+E,c=(y-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=1-c*c*(3-2*c);return}if(i==="dorsal-stripe"){const M=Math.max(.012,e*.5);let _=0;if(l==="torso"||l==="neck"||l==="tail"||l==="head"){Tt[0]=t.x*18,Tt[1]=.5,Tt[2]=.5,Xn(s^js|0);const b=(Tt[3]-.5)*.012*(.5+o),S=.04+.03*r;u=S-M,d=S+M,c=(Math.abs(t.z+b)-u)/(d-u),c=c<0?0:c>1?1:c;const y=1-c*c*(3-2*c);c=(t.dorsal-.55)/(.72-.55),c=c<0?0:c>1?1:c,_=y*(c*c*(3-2*c)),l==="head"&&(c=(t.along-.05)/(.3-.05),c=c<0?0:c>1?1:c,_*=1-c*c*(3-2*c))}if(l==="torso"){const b=Math.abs(t.x-.26-.05*(1-t.dorsal)),S=Math.max(.012,e*.5);u=.018-S,d=.018+S,c=(b-u)/(d-u),c=c<0?0:c>1?1:c;const y=.55*(1-c*c*(3-2*c));c=(t.dorsal-.2)/(.55-.2),c=c<0?0:c>1?1:c,_=Math.max(_,y*(c*c*(3-2*c)))}else if(l==="limb-lower"||l==="limb-upper"){const b=l==="limb-lower"?5:3,S=t.along*b+.3,y=Math.abs(S-Math.floor(S)-.5),E=Math.max(.06,e*b*3);u=.16-E,d=.16+E,c=(y-u)/(d-u),c=c<0?0:c>1?1:c,_=.45*(1-c*c*(3-2*c)),l==="limb-upper"&&(c=(t.along-.4)/(1-.4),c=c<0?0:c>1?1:c,_*=c*c*(3-2*c)),l==="limb-lower"&&(c=(t.along-.25)/(.9-.25),c=c<0?0:c>1?1:c,_=Math.max(_,.6*(c*c*(3-2*c))))}else(l==="foot"||l==="tail-tip")&&(_=.6);Se[5]=_;return}const p=l==="limb-upper"||l==="limb-lower"||l==="foot";if(i==="stripes"||i==="bands"){const M=i==="stripes";let _;if(p){const V=(l==="limb-upper"?3.5:l==="limb-lower"?5:2)*(M?1:.65)*n.scale;_=t.along*V+(l==="limb-lower"?.37:l==="foot"?.71:0)}else _=(t.x+(M?.05:.015)*(1-t.dorsal))*a;const b=M?.55*o:.12*o,S=a*.6;Tt[0]=t.x*S,Tt[1]=t.y*S*1.6,Tt[2]=t.z*S*1.6,Oo(s^dc|0),_+=b*(Tt[3]-.5)*2;const y=Math.floor(_),E=_-y;wi(y,M?1:2,0,s^Dh|0);const R=.6+.4*(rn[0]*$n+(rn[2]&65535)/65536);let T=.5*((M?.43:.42)+.3*r)*R,C=Math.abs(E-.5);if(M&&!p){const V=n.bellyLine+.1+.45*rn[1]*$n;u=V-.04,d=V+.22,c=(t.dorsal-u)/(d-u),c=c<0?0:c>1?1:c,T*=c*c*(3-2*c)}M&&rn[2]*$n<.3&&(C=Math.abs(C-.55*T),T*=.42),Tt[0]=t.x*a*3,Tt[1]=t.y*a*3,Tt[2]=t.z*a*3,Xn(s^js|0);const I=(Tt[3]-.5)*(M?.08:.05),F=Math.max(M?.03:.02,e*a*.5);if(T<=0){Se[5]=0;return}u=T-F,d=T+F,c=(C+I-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=1-c*c*(3-2*c);return}if(i==="brindle"){const M=a;Tt[0]=t.x*M*.45,Tt[1]=t.y*M*.6,Tt[2]=t.z*M*.6,Oo(s^dc|0);const _=Tt[3]-.5;Tt[0]=t.x*M*2,Tt[1]=t.y*M*2,Tt[2]=t.z*M*2,Xn(s^js|0);const b=Tt[3]-.5,S=(p?t.along*6*n.scale:t.x*M+.4*(1-t.dorsal))+(1.3+1.2*o)*_+.35*b,y=S-Math.floor(S);Tt[0]=t.x*M*.8+3.1,Tt[1]=t.y*M*.8,Tt[2]=t.z*M*.8,Xn(s^xr|0);const R=(.1+.1*Tt[3])*(1+1.2*r),w=Math.max(.035,e*M*.5);Tt[0]=t.x*M*1.3-7.7,Tt[1]=t.y*M*1.3,Tt[2]=t.z*M*1.3,Xn(s^Dh|0),c=(Tt[3]-.22)/(.4-.22),c=c<0?0:c>1?1:c;const T=c*c*(3-2*c);u=R-w,d=R+w,c=(Math.abs(y-.5)-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=(1-c*c*(3-2*c))*T*.9;return}let m=t.x*a,g=t.y*a,x=t.z*a;const f=i==="piebald"?.45:i==="roan"?0:i==="reticulated"?.32:i==="rosettes"?.28:.22;if(f>0&&o>0){Tt[0]=m*.45+31.7,Tt[1]=g*.45-12.9,Tt[2]=x*.45+4.3,pv(s^dc|0);const M=o*f*2;m+=M*(so[0]-.5),g+=M*(so[1]-.5),x+=M*(so[2]-.5)}const h=e*a*.5;if(i==="spots"){Tt[0]=m,Tt[1]=g,Tt[2]=x,$a(s,xn);const M=xn[2]*$n,_=.35+.06*(2*M-1)+.25*r,b=Math.max(.05,h);Se[0]=xn[0],Se[1]=xn[1],Se[2]=_,d=_+b,c=(xn[0]-_)/(d-_),c=c<0?0:c>1?1:c,Se[5]=1-c*c*(3-2*c);return}if(i==="rosettes"){Tt[0]=m,Tt[1]=g,Tt[2]=x,$a(s,xn);const M=xn[2]>>>0,_=xn[0]/Math.max(xn[1],1e-6),b=1/Math.max(xn[0],1e-6);Se[0]=xn[0],Se[1]=xn[1];const S=xn[3]*b,y=xn[4]*b,E=xn[5]*b;Tt[0]=S*1.6+(M&1023)*.37,Tt[1]=y*1.6+(M>>>10&1023)*.41,Tt[2]=E*1.6+(M>>>20&1023)*.43,Xn(s^js|0);const R=Tt[3];Tt[0]=S*2.3+9.1,Tt[1]=y*2.3-3.3,Tt[2]=E*2.3+1.7,Xn(s^xr|0);const w=Tt[3],T=Math.max(.035,h*.6),C=.8-.04*(M*$n)+.2*r,I=C-.22-.12*(w-.5)-.15*r;Se[2]=I,Se[3]=C,u=I-T,d=I+T,c=(_-u)/(d-u),c=c<0?0:c>1?1:c;const F=c*c*(3-2*c);u=C-T,d=C+T,c=(_-u)/(d-u),c=c<0?0:c>1?1:c;const V=F*(1-c*c*(3-2*c));c=(R-.3)/(.44-.3),c=c<0?0:c>1?1:c;const Y=V*(c*c*(3-2*c)),P=.35*(1-F);Se[5]=Math.max(Y,P);return}if(i==="reticulated"){Tt[0]=m,Tt[1]=g,Tt[2]=x,$a(s,xn);const M=xn[1]-xn[0],_=xn[2]*$n;Se[0]=xn[0],Se[1]=xn[1],Tt[0]=m*1.7,Tt[1]=g*1.7,Tt[2]=x*1.7,Xn(s^js|0);const b=(Tt[3]-.5)*.04,S=.05-.1*r+b,y=Math.max(0,h-.025);c=(M-.12)/(.6-.12),c=c<0?0:c>1?1:c;const E=.55+.3*_+.18*(c*c*(3-2*c));Se[3]=E<0?0:E>1?1:E,u=S-y,d=S+.05+y,c=(M-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=c*c*(3-2*c);return}if(i==="dapple"){Tt[0]=m,Tt[1]=g,Tt[2]=x,$a(s,xn),Se[0]=xn[0],Se[1]=xn[1];const M=xn[0]/Math.max(xn[1],1e-6),_=.86+.25*r,b=Math.max(0,h*.5);u=_-.45-b,d=_+.04+b,c=(M-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=.85*(1-c*c*(3-2*c));return}if(i==="piebald"){Tt[0]=m,Tt[1]=g,Tt[2]=x,Oo(s);let M=Tt[3];M+=.16*-t.dorsal+(l==="limb-lower"||l==="foot"?.18:l==="muzzle"||l==="head"?.1:0);const _=.56-.35*r,b=Math.max(.008,h*.15);u=_-b,d=_+b,c=(M-u)/(d-u),c=c<0?0:c>1?1:c,Se[5]=c*c*(3-2*c);return}if(i==="roan"){Tt[0]=t.x*2.6,Tt[1]=t.y*2.6,Tt[2]=t.z*2.6,Oo(s^js|0);const M=.32+.35*r+.6*(Tt[3]-.5);Tt[0]=(.8*m+.6*x)*1.73+5.3,Tt[1]=g*1.73,Tt[2]=(.8*x-.6*m)*1.73,Xn(s^R0|0);const _=Tt[3];Tt[0]=m,Tt[1]=g,Tt[2]=x,Xn(s),c=(e*a-.4)/(1.2-.4),c=c<0?0:c>1?1:c;const b=(.5*Tt[3]+.5*_-.5)*.8*(1-c*c*(3-2*c)),S=M+b;Se[5]=.8*(S<0?0:S>1?1:S);return}Se[5]=0}const Sv={plain:0,spots:.45,rosettes:.6,reticulated:.75,stripes:0,bands:.35,saddle:0,"dorsal-stripe":0,dapple:.6,piebald:0,roan:.3,brindle:.5},Ev=new Map(Object.entries(Sv)),Fo=.6,ko=.585,zo=.55,zt=new Float64Array(3),Sc=new Float64Array(2);function L0(n,t,e,i,s,r=!1){const o=n.colours,a=t.region;if(a==="eye"){const R=o.eye;e[i]=R[0],e[i+1]=R[1],e[i+2]=R[2];return}const l=ma(n.seed);Tt[0]=t.x*40,Tt[1]=t.y*40,Tt[2]=t.z*40,Xn(l^R0|0);const c=1+.08*(Tt[3]-.5);if(a==="horn"||a==="armor"){const R=a==="horn"?o.horn:o.plate;e[i]=R[0]*c,e[i+1]=R[1]*c,e[i+2]=R[2]*c;return}const u=o.base,d=o.belly,p=o.accent,m=n.pattern,g=t.footprint!==void 0&&t.footprint>0?t.footprint:0,x=t.along,f=t.dorsal;let h,M,_,b;M=n.bellyLine+.3,_=n.bellyLine-.3,h=(f-M)/(_-M),h=h<0?0:h>1?1:h;let S=n.countershade*(h*h*(3-2*h));a==="limb-upper"?(h=x/.35,h=h<0?0:h>1?1:h,S*=1+(.5-1)*(h*h*(3-2*h))):(a==="limb-lower"||a==="foot")&&(S*=.5),m==="reticulated"?(zt[0]=d[0],zt[1]=d[1],zt[2]=d[2]):(zt[0]=u[0]+(d[0]-u[0])*S,zt[1]=u[1]+(d[1]-u[1])*S,zt[2]=u[2]+(d[2]-u[2])*S),Tt[0]=t.x*3.2,Tt[1]=t.y*3.2,Tt[2]=t.z*3.2,Xn(l^yv|0);const y=1+.06*(Tt[3]-.5);if(zt[0]*=y,zt[1]*=y,zt[2]*=y,m!=="plain"){let R;if(s?R=Sc[0]:(Se[4]=g,C0(n,t),R=Se[5]),R>0){M=n.bellyLine+.35,_=n.bellyLine-.2,h=(f-M)/(_-M),h=h<0?0:h>1?1:h;const w=1-Ev.get(m)*(h*h*(3-2*h));let T=0;switch(a){case"torso":case"neck":case"tail":case"tail-tip":case"wing":T=1;break;case"head":m==="roan"?(h=x/.3,h=h<0?0:h>1?1:h,T=1+(.25-1)*(h*h*(3-2*h))):(h=x/.5,h=h<0?0:h>1?1:h,T=1+(.6-1)*(h*h*(3-2*h)));break;case"muzzle":T=m==="roan"?.2:.45;break;case"ear":T=.5;break;case"limb-upper":T=m==="roan"?1+(.4-1)*x:m==="dapple"?1+(.5-1)*x:1+(.85-1)*x;break;case"limb-lower":T=m==="roan"?.4+(.2-.4)*x:m==="dapple"?.5+(.2-.5)*x:.85+(.65-.85)*x;break;case"foot":T=m==="roan"||m==="dapple"?.2:.6;break}const C=R*T*w*n.contrast;let I,F,V;if(m==="reticulated"){const Y=s?Sc[1]:Se[3];I=u[0]+(p[0]-u[0])*Y,F=u[1]+(p[1]-u[1])*Y,V=u[2]+(p[2]-u[2])*Y}else m==="piebald"?(I=d[0]+(Fo-d[0])*.6,F=d[1]+(ko-d[1])*.6,V=d[2]+(zo-d[2])*.6):m==="roan"?(I=d[0]+(Fo-d[0])*.5,F=d[1]+(ko-d[1])*.5,V=d[2]+(zo-d[2])*.5):m==="dapple"?(I=(u[0]+(d[0]-u[0])*.85)*1.08,F=(u[1]+(d[1]-u[1])*.85)*1.08,V=(u[2]+(d[2]-u[2])*.85)*1.08):n.markRole==="belly"?(I=d[0]+(Fo-d[0])*.3,F=d[1]+(ko-d[1])*.3,V=d[2]+(zo-d[2])*.3):(I=p[0],F=p[1],V=p[2]);if(C<=1)zt[0]+=(I-zt[0])*C,zt[1]+=(F-zt[1])*C,zt[2]+=(V-zt[2])*C;else{const Y=C-1,P=zt[0],H=zt[1],W=zt[2];zt[0]=I+(I-P)*Y,zt[1]=F+(F-H)*Y,zt[2]=V+(V-W)*Y}}}const E=n.marks|0;if(E){const R=n.markRole==="belly",w=R?d[0]+(Fo-d[0])*.45:p[0],T=R?d[1]+(ko-d[1])*.45:p[1],C=R?d[2]+(zo-d[2])*.45:p[2],I=d[0]+(Fo-d[0])*.55,F=d[1]+(ko-d[1])*.55,V=d[2]+(zo-d[2])*.55;if(E&yn.socks)if(a==="limb-lower"){Tt[0]=t.x*30,Tt[1]=t.y*30,Tt[2]=t.z*30,Xn(l^xr|0);const Y=.45+.12*(Tt[3]-.5);M=Y-.18,_=Y+.12,h=(x-M)/(_-M),h=h<0?0:h>1?1:h,b=.92*(h*h*(3-2*h)),zt[0]+=(w-zt[0])*b,zt[1]+=(T-zt[1])*b,zt[2]+=(C-zt[2])*b}else a==="foot"&&(zt[0]+=(w-zt[0])*.92,zt[1]+=(T-zt[1])*.92,zt[2]+=(C-zt[2])*.92);if(E&yn.mask){if(a==="muzzle")zt[0]+=(p[0]-zt[0])*.82,zt[1]+=(p[1]-zt[1])*.82,zt[2]+=(p[2]-zt[2])*.82;else if(a==="head"){h=(x-.15)/(.65-.15),h=h<0?0:h>1?1:h;const Y=.6*(h*h*(3-2*h));h=(f-.45)/(.95-.45),h=h<0?0:h>1?1:h,b=Y*(1-.6*(h*h*(3-2*h))),zt[0]+=(p[0]-zt[0])*b,zt[1]+=(p[1]-zt[1])*b,zt[2]+=(p[2]-zt[2])*b}}if(E&yn.blaze&&(a==="head"||a==="muzzle")){const Y=a==="head"?.035+.015*x:.045,P=Math.max(.012,g*.5);M=Y-P,_=Y+P,h=(Math.abs(t.z)-M)/(_-M),h=h<0?0:h>1?1:h;const H=1-h*h*(3-2*h);h=(f- -.35)/(.05- -.35),h=h<0?0:h>1?1:h;let W=H*(h*h*(3-2*h));a==="head"&&(h=(x-.1)/(.4-.1),h=h<0?0:h>1?1:h,W*=h*h*(3-2*h)),b=.92*W,zt[0]+=(I-zt[0])*b,zt[1]+=(F-zt[1])*b,zt[2]+=(V-zt[2])*b}if(E&yn["tail-tip"]&&a==="tail-tip"&&(h=x/.25,h=h<0?0:h>1?1:h,b=.95*(h*h*(3-2*h)),zt[0]+=(w-zt[0])*b,zt[1]+=(T-zt[1])*b,zt[2]+=(C-zt[2])*b),E&yn["tail-rings"]&&(a==="tail"||a==="tail-tip")){const Y=(a==="tail"?x*7:7+x*1.5)+.25,P=Math.abs(Y-Math.floor(Y)-.5),H=Math.max(.04,g*25);M=.22-H,_=.22+H,h=(P-M)/(_-M),h=h<0?0:h>1?1:h,b=.88*(1-h*h*(3-2*h)),zt[0]+=(w-zt[0])*b,zt[1]+=(T-zt[1])*b,zt[2]+=(C-zt[2])*b}if(E&yn["ear-tips"]&&a==="ear"&&(h=(x-.62)/(.8-.62),h=h<0?0:h>1?1:h,b=.95*(h*h*(3-2*h)),zt[0]+=(w-zt[0])*b,zt[1]+=(T-zt[1])*b,zt[2]+=(C-zt[2])*b),E&yn["rump-patch"]){if(a==="torso"){Tt[0]=t.y*14,Tt[1]=t.z*14,Tt[2]=.5,Xn(l^xr|0);const Y=.03*(Tt[3]-.5);h=(t.x+Y- -.31)/(-.4- -.31),h=h<0?0:h>1?1:h;const P=.9*(h*h*(3-2*h));h=(f- -.3)/(-.1- -.3),h=h<0?0:h>1?1:h,b=P*(h*h*(3-2*h)),zt[0]+=(I-zt[0])*b,zt[1]+=(F-zt[1])*b,zt[2]+=(V-zt[2])*b}else if(a==="tail"){h=(x-.1)/(.35-.1),h=h<0?0:h>1?1:h;const Y=.9*(1-h*h*(3-2*h));h=(f-.2)/(-.4-.2),h=h<0?0:h>1?1:h,b=Y*(h*h*(3-2*h)),zt[0]+=(I-zt[0])*b,zt[1]+=(F-zt[1])*b,zt[2]+=(V-zt[2])*b}}if(E&yn["juvenile-spots"]&&n.juvenileSpots>0&&a==="torso"){Se[4]=g,wv(t,l);const Y=Se[5];Y>0&&(b=.85*n.juvenileSpots*Y,zt[0]+=(I-zt[0])*b,zt[1]+=(F-zt[1])*b,zt[2]+=(V-zt[2])*b)}}if(n.greying>0){let R=0;if(a==="muzzle"?R=.85:a==="head"&&(h=(x-.45)/(.95-.45),h=h<0?0:h>1?1:h,R=.5*(h*h*(3-2*h))),R>0){const w=.4+(d[0]-.4)*.3,T=.39+(d[1]-.39)*.3,C=.37+(d[2]-.37)*.3;b=n.greying*R,zt[0]+=(w-zt[0])*b,zt[1]+=(T-zt[1])*b,zt[2]+=(C-zt[2])*b}}h=zt[0]*c,e[i]=r?h:h<.002?.002:h>1?1:h,h=zt[1]*c,e[i+1]=r?h:h<.002?.002:h>1?1:h,h=zt[2]*c,e[i+2]=r?h:h<.002?.002:h>1?1:h}function Li(n,t,e,i=0){L0(n,t,e,i,!1)}function wv(n,t){const e=Se[4],i=n.z>=0?1:2,s=.048,r=n.x;let o=(r- -.42)/(-.34- -.42);o=o<0?0:o>1?1:o;const a=o*o*(3-2*o);o=(r-.26)/(.34-.26),o=o<0?0:o>1?1:o;const l=a*(1-o*o*(3-2*o));if(l<=0){Se[5]=0;return}let c=0;const u=Math.max(.004,e*.5);for(let d=0;d<3;d++){const p=d===0?.74:d===1?.5:.22,m=d===1?.5:d===2?.25:0,g=r/s-m,x=Math.floor(g);for(let f=x-1;f<=x+1;f++){if(wi(f,d,i,t^xr|0),d===2&&rn[2]*$n>.55||d<2&&rn[2]*$n>.9)continue;const h=(f+m+.5+(rn[0]*$n-.5)*.5)*s,M=p+(rn[1]*$n-.5)*(d===2?.2:.09),_=r-h,b=(n.dorsal-M)*.2,S=.0085+.006*(rn[2]>>>8&255)/255-(d===2?.002:0),y=S-u,E=S+u;o=(Math.sqrt(_*_+b*b)-y)/(E-y),o=o<0?0:o>1?1:o;const R=1-o*o*(3-2*o);R>c&&(c=R)}}Se[5]=c*l}function Tv(n,t,e){let i=0;n.pattern!=="plain"&&(Se[4]=t.footprint??0,C0(n,t),i=Se[5]),e[0]=i,e[1]=Se[0],e[2]=Se[1],e[3]=Se[2],e[4]=Se[3]}const Av=512;let Ka;function yo(){if(Ka)return Ka;const n=[],t=.6180339887498949,e=i=>{const s=i.bx-i.ax,r=i.by-i.ay,o=i.bz-i.az,a=Math.hypot(s,r,o),l=s/a,c=r/a,u=o/a;let d=-l*c,p=1-c*c,m=-u*c;const g=Math.hypot(d,p,m)||1;d/=g,p/=g,m/=g,Math.abs(c)>.95&&(d=1,p=0,m=0);const x=c*m-u*p,f=u*d-l*m,h=l*p-c*d,_=Math.PI*(3*(i.ry+i.rz)-Math.sqrt((3*i.ry+i.rz)*(i.ry+3*i.rz)))*a/i.count;for(let b=0;b<i.count;b++){const S=(b+.5)/i.count,y=2*Math.PI*(b*t%1),E=Math.cos(y),R=Math.sin(y),w=i.ax+s*S+(d*E*i.ry+x*R*i.rz),T=i.ay+r*S+(p*E*i.ry+f*R*i.rz),C=i.az+o*S+(m*E*i.ry+h*R*i.rz);let I=d*E/i.ry+x*R/i.rz,F=p*E/i.ry+f*R/i.rz,V=m*E/i.ry+h*R/i.rz;const Y=Math.hypot(I,F,V)||1;I/=Y,F/=Y,V/=Y;const P=(i.alongFrom??0)+((i.alongTo??1)-(i.alongFrom??0))*S;n.push({x:w,y:T,z:C,dorsal:ca(F,-1,1),region:i.region,along:P,weight:_})}};e({region:"torso",ax:-.4,ay:0,az:0,bx:.36,by:.02,bz:0,ry:.15,rz:.12,count:260}),e({region:"neck",ax:.33,ay:.06,az:0,bx:.52,by:.24,bz:0,ry:.06,rz:.06,count:36}),e({region:"head",ax:.5,ay:.27,az:0,bx:.64,by:.26,bz:0,ry:.06,rz:.05,count:32}),e({region:"muzzle",ax:.64,ay:.255,az:0,bx:.73,by:.22,bz:0,ry:.035,rz:.035,count:16});for(const i of[1,-1])e({region:"ear",ax:.53,ay:.32,az:.04*i,bx:.49,by:.4,bz:.06*i,ry:.015,rz:.008,count:4});e({region:"tail",ax:-.42,ay:.06,az:0,bx:-.58,by:-.12,bz:0,ry:.02,rz:.02,count:16}),e({region:"tail-tip",ax:-.58,ay:-.12,az:0,bx:-.62,by:-.17,bz:0,ry:.02,rz:.02,count:4});for(const[i,s]of[[.26,.08],[.26,-.08],[-.28,.08],[-.28,-.08]])e({region:"limb-upper",ax:i,ay:-.04,az:s,bx:i-.01,by:-.28,bz:s,ry:.045,rz:.04,count:18}),e({region:"limb-lower",ax:i-.01,ay:-.28,az:s,bx:i,by:-.52,bz:s,ry:.026,rz:.024,count:14}),e({region:"foot",ax:i,ay:-.52,az:s,bx:i+.01,by:-.56,bz:s,ry:.03,rz:.028,count:3});if(n.length!==Av)throw new Error(`canonical coat sample count ${n.length}`);return Ka=Object.freeze(n.map(i=>Object.freeze(i))),Ka}function Rv(n){const t=go[n.pattern]*n.scale,e=n.threshold;let i=1;switch(n.pattern){case"spots":i=2*Math.max(.08,.29+.25*e)/t;break;case"rosettes":i=.08/t;break;case"reticulated":i=Math.max(.03,.08-.1*e)/t;break;case"stripes":i=(.43+.3*e)*.6*.42/t;break;case"bands":i=(.42+.3*e)*.6/t;break;case"saddle":i=.1;break;case"dorsal-stripe":i=.036;break;case"dapple":i=.1/t;break;case"piebald":i=.35/t;break;case"roan":i=.3/t;break;case"brindle":i=.2*(1+1.2*Math.min(0,e))/t;break}return i}function Ih(n,t,e,i,s,r){Sc[0]=s,Sc[1]=r,L0(n,t,e,i,!0)}function Cv(n){return ma(n)}const Za=Object.freeze({warp:dc,detail:js,mark:xr,band:Dh}),Lv=Xo,Pv=(n,t,e)=>Math.max(t,Math.min(e,n)),qo=(n,t,e)=>n+(t-n)*e,P0=(n,t,e)=>{const i=Pv((e-n)/(t-n),0,1);return i*i*(3-2*i)},Dv="planet-juvenile-coat-1";function D0(n){return qo(.4,1,P0(.2,.7,n))}const Xd=new WeakMap,Tl=new Float64Array(3);function Al(n,t,e,i,s,r,o=0){const a=(n.marks&yn["juvenile-spots"])!==0&&n.juvenileSpots>0,l=Object.isFrozen(n);let c=l?Xd.get(n):void 0;if(!c){const p=a?{...n,marks:n.marks&-129}:n;c={unspotted:p,unstocked:{...p,marks:p.marks&-2}},l&&Xd.set(n,c)}const{unspotted:u,unstocked:d}=c;if(r===void 0?Li(u,e,s,0):Ih(u,e,s,0,r,o),t.stage==="juvenile"&&u.marks&yn.socks&&(e.region==="limb-lower"||e.region==="foot")){const p=D0(t.maturity);if(p<1){r===void 0?Li(d,e,Tl,0):Ih(d,e,Tl,0,r,o);for(let m=0;m<3;m++)s[m]=qo(Tl[m],s[m],p)}}if(a&&(e.region==="torso"||e.region==="limb-upper")){const p=N0(n.seed,i.x,i.y,i.z,i.cell,i.halfH,i.halfW),m=.85*n.juvenileSpots*p;if(m>0)for(let g=0;g<3;g++){const x=I0[g];s[g]=qo(s[g],Math.max(qo(n.colours.belly[g],x,.55),qo(s[g],x,.5)),m)}}}const I0=[.6,.585,.55],Iv=2.1,U0=.024,qd=1512013361,Qs=.1,Yd=-.36,jd=.28;function Uv(n){const t=n>0?n:U0,e=Math.max(Iv*t,.042),i=2*(1+Qs)*e+2*t,s=i/(1-2*Qs),r=.5*s*(1-2*Qs),o=Math.sqrt(Math.max(i*i-r*r,0))/(1-2*Qs),a=.5*i+Qs*o;return{radius:e,spacing:s,rowGap:o,rows:[a,a+o,a+2*o]}}let $d=NaN,Rl;function N0(n,t,e,i,s,r,o){(s!==$d||!Rl)&&($d=s,Rl=Uv(s));const a=Rl;if(t<Yd-2*a.radius||t>jd+2*a.radius)return 0;const l=Math.hypot(e,i),c=Math.atan2(Math.abs(i),e)*l,u=i>=0?1:2,d=.6*(s>0?s:U0),p=r*Math.cos(Math.min(a.rows[0]/Math.max(r,.001),Math.PI/2)),m=Math.abs(i)>=.4*o;let g=0;for(let x=0;x<3;x++){const f=x===0?c:e,h=x===0?a.rows[0]:p-x*a.rowGap,M=x===1?.5:x===2?.25:0;if(x>0&&!m||Math.abs(f-h)>a.rowGap)continue;const _=Math.floor(t/a.spacing-M);for(let b=_-1;b<=_+1;b++){const S=Lh(b,x,u,n^qd),y=Lh(b,x,u+4,n^qd);if((S&255)/256>(x===2?.45:.9))continue;const E=(b+M+.5+((S>>>8&255)/255-.5)*2*Qs)*a.spacing;if(E<Yd||E>jd)continue;const R=h+((S>>>16&255)/255-.5)*2*Qs*a.rowGap,w=a.radius*(1+Qs*(y&255)/255),T=1-P0(w-d,w+d,Math.hypot(t-E,f-R));T>g&&(g=T)}}return g}const Nv="fauna-composer-phenotype-1";function Ov(n){if(!n||n.version!==Nv||n.units!=="m")throw new Error("Unsupported Composer build phenotype");const t=(s,r,o,a)=>{if(!Number.isFinite(s)||s<r||s>o)throw new Error(`Invalid Composer phenotype ${a}`)},e=n.dimensions;if(!e||!n.identity||!n.motion||!n.coatFrame)throw new Error("Incomplete Composer build phenotype");for(const s of["bodyLength","torsoWidth","torsoHeight","legReach","stanceWidth","neckLength","headLength","headWidth","footLength","footWidth"])t(e[s],.001,20,s);for(const s of["tailLength","hornLength","earLength","trunkLength","wingSpan"])t(e[s],0,30,s);if(t(e.upperLegFraction,.1,.9,"upperLegFraction"),t(e.neckElevation,-Math.PI/2,Math.PI/2,"neckElevation"),t(n.identity.maturity,0,1,"maturity"),!["none","female","male"].includes(n.identity.sex))throw new Error("Invalid Composer phenotype sex");for(const s of["individualId","speciesId","appearanceKey"]){const r=n.identity[s];if(r!==void 0&&(typeof r!="string"||!r||r.length>2048))throw new Error(`Invalid Composer phenotype ${s}`)}if(t(n.motion.walkSpeed,.001,30,"walkSpeed"),t(n.motion.strideLength,.001,20,"strideLength"),n.coatStage){if(n.coatStage.version!==Dv||!["adult","juvenile"].includes(n.coatStage.stage))throw new Error("Invalid Composer coat stage");t(n.coatStage.maturity,0,1,"coat stage maturity")}t(n.coatFrame.phase,-10,10,"coat phase"),t(n.coatFrame.lateral,.01,100,"coat lateral"),t(n.roughness,0,1,"roughness");const i=n.coat;if(!i||i.version!=="fauna-coat-1"||i.pattern==="auto"||!iu.includes(i.pattern)||!["accent","belly"].includes(i.markRole))throw new Error("Invalid Composer resolved coat");if(!Number.isInteger(i.seed)||i.seed<0||i.seed>4294967295||!Number.isInteger(i.marks))throw new Error("Invalid Composer resolved coat seed/marks");for(const[s,r]of Object.entries(Nc))t(i[s],r[0],r[1],`coat.${s}`);for(const s of fa){const r=i.colours?.[s];if(!Array.isArray(r)||r.length!==3)throw new Error(`Invalid Composer coat role ${s}`);for(const o of r)t(o,0,1,`coat.${s}`)}return structuredClone(n)}function Fv(n){if(n.layout!=="quadruped")throw new Error("Composer phenotype-1 currently supports the inherited quadruped layout");if(n.maturity!==1||n.individualSeed!==0||n.variability!==0||n.dimorphism!==0||n.allometry!==0||n.condition!==0||n.sex!=="auto")throw new Error("Resolved Composer phenotype requires neutral individual controls; edit resolved dimensions instead of applying growth twice")}const VS="fauna-composer-face-geometry-2",kv=Object.freeze({muzzle:{headScale:1,craniumHeight:.34,craniumWidth:.9,snout:.62},jaws:{headScale:1.15,craniumHeight:.34,craniumWidth:.95,snout:.62},beak:{headScale:.9,craniumHeight:.34,craniumWidth:.9,snout:.62},"flat-face":{headScale:.9,craniumHeight:.42,craniumWidth:.9,snout:.62},blunt:{headScale:.6,craniumHeight:.5,craniumWidth:.9,snout:.62},mandibles:{headScale:.7,craniumHeight:.3,craniumWidth:1.4,snout:.62},proboscis:{headScale:1.05,craniumHeight:.4,craniumWidth:.9,snout:.62*.4}});function zv(n,t,e){return t==="limbless"?-.12:t==="many-legged"||t==="biped"&&e>.6?-.08:n==="beak"?-.12:-.3}function O0(n,t){const e=t.headLength,i=t.craniumWidth,s=t.craniumHeight,r=t.snoutLength;switch(n){case"muzzle":return{x:.4*e+r,y:-.24*s,h:.52*s,w:.48*i};case"jaws":return{x:.4*e+r,y:-.12*s,h:.36*s,w:.5*i};case"proboscis":return{x:.4*e+Math.max(r,Qa.minMuzzle*e),y:Qa.tipY*s,h:Qa.tipH*s,w:Qa.tipW*i};case"beak":{const o=Math.max(r,.15*e);return{x:.36*e+o,y:-.05*s,h:.1*s,w:.06*i}}case"flat-face":{const o=Math.max(.05*e,r*.6);return{x:.36*e+o,y:-.42*s,h:.34*s,w:.42*i}}case"blunt":return{x:.6*e+r*.3+.7*i,y:0,h:.5*s,w:.75*i};case"mandibles":{const o=Math.max(.25*e,r*1.1);return{x:.72*e+o,y:-.25*s,h:.3*s,w:.3*i}}}}const Qa=Object.freeze({tipY:-.2,tipH:.92,tipW:1.02,minMuzzle:.08}),Bv=1,Vv=1.45,Hv=Object.freeze({tip:.3,power:1.25});function Gv(n,t){const e=Hv;return n*(e.tip+(1-e.tip)*Math.pow(1-Math.min(1,Math.max(0,t)),e.power))}const F0=Object.freeze({hang:-1.45,ease:.5,lead:.4,flick:.55,curlMax:.9,maxPitch:1.1});function Gr(n,t,e=n,i=0){const s=F0,r=[];for(let o=0;o<n;o++){const a=Math.min(1,(o+s.lead)/(n-1+s.lead));let l=t+(s.hang-t)*Math.pow(a,s.ease)+(o===n-1&&n>1?s.flick:0);o>=e&&(l=Math.min(Math.max(l,s.maxPitch),l+i*(o-e+1))),r.push(l)}return r}function Wv(n,t,e){if(e(Gr(n,t)))return Gr(n,t);const i=F0.curlMax;for(let s=n-1;s>=1;s--){if(!e(Gr(n,t,s,i)))continue;let r=0,o=i;for(let a=0;a<24;a++){const l=(r+o)/2;e(Gr(n,t,s,l))?o=l:r=l}return Gr(n,t,s,o)}return Gr(n,t,1,i)}const Xv="fauna-composer-graph-4",HS="fauna-composer-trunk-motion-1",Kd=Object.freeze({maxBones:160,maxVertices:48e3,maxTriangles:8e4,drawCallsPerCreature:2}),GS=["neutral","idle","walk","display","run","eat","fly","glide"],Rn=(n,t,e)=>Math.max(t,Math.min(e,n)),fi=(n,t,e)=>n+(t-n)*e,ws=(n,t,e)=>{const i=Rn((e-n)/(t-n),0,1);return i*i*(3-2*i)},re=(n=0,t=0,e=0)=>new dt(n,t,e),Ln=Object.freeze(re(0,1,0)),qv=Object.freeze(re(1,0,0)),Ds=n=>[n.x,n.y,n.z],Qo=n=>[n.x,n.y,n.z,n.w],cn=n=>re(n[0],n[1],n[2]),ei=n=>new fn(n[0],n[1],n[2],n[3]),Qi=(n,t)=>new fn().setFromAxisAngle(n,t),Yv=re(1,0,0),jv=re(0,1,0),la=re(0,0,1),Uh=2e-5,Nh=.985;function ai(n,t){const e=n.clone().normalize();let i=t.clone().addScaledVector(e,-t.dot(e));i.lengthSq()<1e-10&&(i=Math.abs(e.y)<.9?Ln.clone():re(-Math.sign(e.y)||-1,0,0),i.addScaledVector(e,-i.dot(e))),i.normalize();const s=re().crossVectors(e,i);return new fn().setFromRotationMatrix(new ke().makeBasis(e,i,s))}function fu(n,t,e,i,s){const r=t.clone().sub(n),o=r.length(),a=Rn(o,Math.abs(e-i)+1e-6,e+i-1e-6),l=o>1e-9?r.multiplyScalar(1/o):re(0,-1,0),c=(e*e-i*i+a*a)/(2*a),u=Math.sqrt(Math.max(0,e*e-c*c));let d=s.clone().addScaledVector(l,-s.dot(l));d.lengthSq()<1e-10&&(d=Math.abs(l.y)<.9?Ln.clone().addScaledVector(l,-l.y):qv.clone().addScaledVector(l,-l.x)),d.normalize();const p=n.clone().addScaledVector(l,c).addScaledVector(d,u),m=n.clone().addScaledVector(l,a);return{joint:p,end:m,reachError:Math.abs(o-a)}}const $v={slim:{w:.13,h:.16},barrel:{w:.2,h:.2},"deep-chest":{w:.15,h:.2},flat:{w:.24,h:.12},annulated:{w:.1,h:.1},segmented:{w:.15,h:.1}},Kv={pillar:{seg:[.5,.5],tilt:0,ext:.94},plantigrade:{seg:[.5,.46],tilt:0,ext:.92},digitigrade:{seg:[.36,.38,.26],tilt:.38,ext:.9},unguligrade:{seg:[.3,.34,.36],tilt:.12,ext:.93},arthropod:{seg:[.45,.55],tilt:0,ext:.8}},Zv={hoof:{h:.07,l:.1},paw:{h:.045,l:.14},claw:{h:.03,l:.24},pad:{h:.08,l:.16},hand:{h:.04,l:.26},spike:{h:.1,l:.03}};function Ss(n,t){const e=t.parent>=0?n.bones[t.parent]:void 0,i=e?ei(e.restQuaternion):new fn,s=e?cn(e.restPosition):re(),r=i.clone().invert(),o=t.position.clone().sub(s).applyQuaternion(r),a=r.multiply(t.quaternion.clone()).normalize(),l=n.bones.length;return n.bones.push({index:l,name:t.name,parent:t.parent,part:t.part,side:t.side??0,limb:t.limb??-1,length:t.length,driver:t.driver??"fk",offset:Ds(o),restLocal:Qo(a),restPosition:Ds(t.position),restQuaternion:Qo(t.quaternion.clone().normalize()),start:t.start,end:t.end??t.start}),l}const Un=(n,t,e=0)=>({w:n,h:t,yc:e}),Zd=n=>cn(n.restPosition).add(re(n.length,0,0).applyQuaternion(ei(n.restQuaternion))),Bo=(n,t)=>cn(t).applyQuaternion(ei(n.restQuaternion)).add(cn(n.restPosition));function WS(n,t={}){const e=Mr(n).recipe,i=t.phenotype?Ov(t.phenotype):void 0,s=i?.dimensions;i&&Fv(e);const r=ZM(e),o=Zo(e),a=e.variability,l={bones:[]},c=e.layout,u=s?.bodyLength??e.bodyLength,d=c==="limbless"||c==="many-legged",p=c!=="limbless",m=c==="sprawled"||p&&e.legs==="arthropod",g=$v[e.torso],x=(d?.42:1)*e.girth*u;let f=s?s.torsoWidth/2:g.w*x,h=s?s.torsoHeight/2:g.h*x;const M=Math.cbrt(u*f*h),_=e.head,b=kv[_],S=s?.headLength??e.headSize*b.headScale*M*(d?1:1.25),y=s?s.headWidth/(2*b.craniumWidth):S*b.craniumHeight,E=s?s.headWidth/2:y*b.craniumWidth,R=S*e.snoutLength*b.snout;let w=p?s?.legReach??e.legLength*u:0;c==="many-legged"&&e.legs!=="arthropod"&&(w=Math.min(w,.45*u));const T=Kv[e.legs],C=Zv[e.feet],I=T.seg[2]??0,F=s?{...T,seg:[s.upperLegFraction*(1-I),(1-s.upperLegFraction)*(1-I),...I?[I]:[]]}:T,V=Mt=>{if(F.seg.every((qt,Wt)=>Mt[Wt]===0))return F.seg;const Ot=F.seg.map((qt,Wt)=>qt*(1+Mt[Wt])),Jt=F.seg.reduce((qt,Wt)=>qt+Wt,0),$t=Ot.reduce((qt,Wt)=>qt+Wt,0);return Ot.map(qt=>qt*Jt/$t)},Y=V(o.segmentJitter.fore),P=V(o.segmentJitter.hind),H=(Mt,Ot=!1)=>(Ot?Y:P).map(Jt=>Jt*Mt),W=F.tilt+(F.seg.length===3?.04*a*o.limb:0),j=Mt=>s?s.footWidth*.42:C.h*Mt,N=Mt=>s?.footLength??C.l*Mt,tt=(Mt,Ot=!1)=>{const Jt=H(Mt,Ot),$t=Jt[0]+Jt[1],qt=Jt[2]??0,Wt=m?0:W;if(m){const Ce=.55*$t,xe=.8*$t;return{height:j(Mt)+qt+Math.sqrt(xe*xe-Ce*Ce),lateral:Ce}}const ae=qt*Math.sin(Wt),Re=F.ext*$t,he=s?Math.max(0,s.stanceWidth/2-.68*f*.85):0;return{height:j(Mt)+qt*Math.cos(Wt)+Math.sqrt(Math.max(0,Re*Re-ae*ae-he*he)),lateral:0}},$=p?tt(1,!0).height:0,ut=c==="many-legged"?e.legPairs:c==="limbless"?12:4,st=c==="many-legged"?u*.88:c==="limbless"?u*.8:u,nt=st/ut,K=s?.neckLength??(c==="limbless"?u*(.12+.1*e.neckLength):c==="many-legged"?Math.max(.25*nt,e.neckLength*.3*u):Math.max(.05*u,e.neckLength*.9*u)),ct=c==="limbless"?2:Rn(Math.round(1+e.neckLength*3.4),1,6),rt=e.tail==="none"?0:s?.tailLength??(e.tail==="stub"?u*(.08+.08*e.tailLength)*(d?.5:1):Math.max(.1*u,e.tailLength*u*(d?.4:1))*(e.tail==="feather-fan"?.25:1)),pt=e.tail==="none"?0:e.tail==="stub"||e.tail==="feather-fan"?2:e.tail==="tufted"?5:7,X=o.torso,lt=o.condition,J=X.chest!==0||X.belly!==0||X.rump!==0||X.waist!==0||lt!==0,mt=(Mt,Ot,Jt)=>Math.exp(-.5*((Mt-Ot)/Jt)**2),ot=Mt=>{let Ot=1,Jt=1,$t=0;if(e.torso==="segmented"||e.torso==="annulated"){const qt=e.torso==="annulated"?.72:.82;Ot=Jt=fi(qt,1,ws(0,.2,Mt))*fi(.86,1,ws(1,.82,Mt))}else{const qt=.8+.2*Math.sin(Math.PI*Rn(Mt*1.08,0,1));if(Ot=qt*(e.torso==="deep-chest"?fi(.88,1.02,Mt):1),Jt=qt*(e.torso==="deep-chest"?.8+.4*ws(.3,.75,Mt)-.12*ws(.9,1,Mt):1),$t=e.torso==="deep-chest"?-.14*h*ws(.35,.8,Mt):e.torso==="barrel"?-.04*h:0,e.tail==="none"&&Mt<.12&&(Ot*=fi(.82,1,Mt/.12),Jt*=fi(.86,1,Mt/.12)),c==="biped"&&e.arms!=="none"&&(Ot*=1+.22*ws(.55,.8,Mt)*(1-.6*ws(.9,1,Mt))),J){Jt*=1+.06*X.rump*mt(Mt,.1,.1),Ot*=1-.08*X.waist*mt(Mt,.3,.1);const Wt=Math.max(-.3,.1*X.chest*mt(Mt,.8,.08)+(.08*X.belly+.04*lt)*mt(Mt,.5,.2))*h*Jt;return Un(f*Ot,h*Jt+Wt/2,$t-Wt/2)}}return Un(f*Ot,h*Jt,$t)};let Pt=0;c==="biped"?Pt=fi(.21,1.36,e.posture):c==="quadruped"&&(Pt=e.posture*.24);const U=Mt=>{const Ot=ot(.5/ut);return[.5*nt,(m?-.2:-.35)*Ot.h+Ot.yc,Mt*.68*Ot.w]},yt=Mt=>{const Ot=ot(1-.65/ut);return[.35*nt,(m?-.18:-.3)*Ot.h+Ot.yc,Mt*.68*Ot.w]},Dt=(Mt,Ot)=>{const Jt=ot((Mt+.5)/ut);return[.5*nt,-.25*Jt.h+Jt.yc,Ot*.8*Jt.w]},It=Qi(la,Pt);let ht=0,Vt=w;const Et=re(-st*.5*Math.cos(Pt),0,0);if(!p)Et.y=ot(.5).h-ot(.5).yc;else{ht=tt(w).height;const Mt=c==="many-legged"?Dt(0,1):U(1);Et.y=ht-cn(Mt).applyQuaternion(It).y,c==="biped"&&(Et.x=-.5*nt*Math.cos(Pt))}if(p){const Mt=h,Ot=()=>Math.max((m?.06:.15)*ht,.04*h),Jt=()=>{const Wt=c==="many-legged"?Dt(0,1):U(1);Et.y=ht-cn(Wt).applyQuaternion(It).y},$t=()=>{let Wt=1/0;for(let ae=0;ae<=16;ae++){const Re=ae/16,he=ot(Re);Wt=Math.min(Wt,(Et.y+Re*st*Math.sin(Pt)-Ot())/Math.max(1e-6,(he.h-he.yc)*Math.cos(Pt)))}return Wt},qt=w;if(s&&$t()<1){const Wt=he=>(w=he,ht=tt(he).height,Jt(),$t()>=1);let ae=qt,Re=qt;for(let he=0;he<24&&!Wt(Re);he++)Re*=2;if(!Wt(Re))throw new Error("Resolved torso cannot clear ground within the bounded leg fitter");for(let he=0;he<44;he++){const Ce=(ae+Re)/2;Wt(Ce)?Re=Ce:ae=Ce}Wt(Re)}for(let Wt=0;!s&&Wt<24;Wt++){const ae=$t();if(ae>=1)break;!s&&h*ae>=Mt*.6?h*=Math.min(ae,.995):(w*=1.2,ht=tt(w).height),Jt()}w>qt*1.001&&r.push({part:"Leg length",chosen:e.legLength.toFixed(2),effect:`Lengthened to ${(w/u).toFixed(2)} body lengths so the body clears the ground.`}),h<Mt*.995&&r.push({part:"Torso depth",chosen:e.torso,effect:`Reduced to ${(h/Mt*100).toFixed(0)}% so the belly clears the ground on these leg lengths.`})}const Lt=[],B=re(1,0,0).applyQuaternion(It),et=Mt=>{const Ot=ot(Mt);return Ot.h-Ot.yc+Uh};let gt=Et.clone();p||(gt.y=et(0));for(let Mt=0;Mt<ut;Mt++){let Ot=B.clone();if(!p){const Jt=et((Mt+1)/ut)-gt.y;Ot=re(Math.sqrt(nt*nt-Jt*Jt),Jt,0).normalize()}Lt.push(Ss(l,{name:`torso_${Mt}`,parent:Mt?Lt[Mt-1]:-1,part:"torso",length:nt,position:gt.clone(),quaternion:p?It.clone():ai(Ot,Ln),start:ot(Mt/ut),end:ot((Mt+1)/ut)})),gt=gt.clone().addScaledVector(Ot,nt)}const k=l.bones[Lt[ut-1]],A=Zd(k),v=ot(1),D=[];if(pt){const Mt=ot(0),Ot=Math.min(Mt.w,Mt.h),Jt=e.tail==="reptile"||e.tail==="club"?.78:e.tail==="tufted"?.22:e.tail==="feather-fan"?.5:.55,$t=e.tail==="reptile"?.06:e.tail==="club"?.16:e.tail==="tufted"?.09:.3;let qt=c==="biped"?e.posture>.6?-1:-.05-Pt*.4:c==="quadruped"?e.tail==="tufted"?-1.05:-.35:-.08;d?qt=-.02:qt+=o.carriage.tail;const Wt=c==="biped"&&e.posture>.6?.18:e.tail==="tufted"?-.06:d?0:-.07;let ae=cn(l.bones[Lt[0]].restPosition),Re=rt/pt;for(let he=0;he<pt;he++){const Ce=qt+Wt*he,xe=re(-Math.cos(Ce),Math.sin(Ce),0),Oe=ai(xe,Ln),$e=Ot*fi(he===0?1:Jt,$t,Math.pow(he/pt,.85))/1,Ge=Ot*fi(Jt,$t,Math.pow((he+1)/pt,.85)),Kn=he===0?Un(Mt.w,Mt.h,Mt.yc):Un($e*1.04,$e,0);D.push(Ss(l,{name:`tail_${he}`,parent:he?D[he-1]:Lt[0],part:"tail",length:Re,position:ae.clone(),quaternion:Oe,start:Kn,end:Un(Ge*1.04,Ge,0)})),ae.addScaledVector(xe,Re),he===0&&(Re=rt/pt)}Cl(l,D,Ec(e,u,l.bones[D[D.length-1]]),.004*u)}const q=[],Q=Math.min(E,y)*(d?.8:.62),z=Math.max(Math.min(v.w,v.h)*(d?1:.62),Q);let xt,bt,Ut=zv(_,c,e.posture);if(c==="limbless")xt=.32,bt=.18;else if(c==="many-legged")xt=.05,bt=.02;else{const Mt=fi(.12,1.25,Rn(e.neckLength/1.3,0,1));xt=Math.max(Pt,Mt),bt=Math.max(.05,Mt*.75),c==="biped"&&e.posture>.6&&(xt=Math.max(Pt*.9,Mt),bt=Math.max(.6,Mt))}xt+=o.carriage.neck,bt+=o.carriage.neck,Ut+=o.carriage.headPitch,s&&(xt=bt=s.neckElevation);{let Mt=A.clone();const Ot=K/ct;for(let Jt=0;Jt<ct;Jt++){const $t=ct===1?(xt+bt)/2:fi(xt,bt,Jt/(ct-1)),qt=re(Math.cos($t),Math.sin($t),0),Wt=ai(qt,Ln),ae=he=>{if(!d){const xe=fi(z,Q,Math.pow(he,.8));return Un(xe*1.02,xe*1.05,0)}const Ce=ws(0,1,he);return Un(fi(v.w,Q*1.02,Ce),fi(v.h,Q*1.05,Ce),fi(v.yc*.5,0,Ce))},Re=Jt===0?Un(v.w*(d?1:.85),v.h*(d?1:.85),v.yc*.5):ae(Jt/ct);q.push(Ss(l,{name:`neck_${Jt}`,parent:Jt?q[Jt-1]:Lt[ut-1],part:"neck",length:Ot,position:Mt.clone(),quaternion:Wt,start:Re,end:ae((Jt+1)/ct)})),Mt.addScaledVector(qt,Ot)}}const ee=Zd(l.bones[q[q.length-1]]),Rt=Ss(l,{name:"head",parent:q[q.length-1],part:"head",length:S,position:ee,quaternion:ai(re(Math.cos(Ut),Math.sin(Ut),0),Ln),start:Un(E,y),end:Un(E*.5,y*.5)});c==="limbless"&&Cl(l,[...q,Rt]);const O=[],wt=e.trunk==="trunk"?s?.trunkLength??e.trunkLength*Vv*S:0;if(wt>0){const Mt=l.bones[Rt],Ot=6,Jt=wt/Ot,$t=O0(_,{headLength:S,craniumWidth:E,craniumHeight:y,snoutLength:R}),qt=Bv*Math.min($t.w,$t.h),Wt=Bo(Mt,[$t.x,$t.y,0]),ae=xe=>Gv(qt,xe/Ot),he=Wv(Ot,Ut,xe=>{const Oe=Wt.clone();for(let $e=0;$e<Ot;$e++){Oe.addScaledVector(re(Math.cos(xe[$e]),Math.sin(xe[$e]),0),Jt);const Ge=Math.max(ae($e),ae($e+1),$e+1<Ot?ae($e+1):mu*ae(Ot))*1.05;if(Oe.y<Ge)return!1}return!0});let Ce=Wt;for(let xe=0;xe<Ot;xe++){const Oe=re(Math.cos(he[xe]),Math.sin(he[xe]),0),$e=ae(xe),Ge=ae(xe+1);O.push(Ss(l,{name:`trunk_${xe}`,parent:xe?O[xe-1]:Rt,part:"trunk",length:Jt,position:Ce.clone(),quaternion:ai(Oe,re(-Oe.y,Oe.x,0)),start:Un($e,$e),end:Un(Ge,Ge)})),Ce=Ce.clone().addScaledVector(Oe,Jt)}Cl(l,O)}const vt=[],At=o.allometry.limbRobust*o.limbRadius,Gt=p?(e.legs==="arthropod"?.05*w:Rn(.42*Math.min(f,h),.055*w,.16*w)*(e.legs==="pillar"?1.3:1))*At:0;let Ct=!1;const pe=(Mt,Ot,Jt,$t,qt,Wt,ae)=>{const Re=Bo(l.bones[Jt],$t),he=Wt&&c!=="many-legged";let Ce=tt(qt,he);for(let Z=0;Z<8;Z++){const Ft=H(qt,he),Yt=Ft[0]+Ft[1],ie=Ft[2]??0,Zt=m||he?0:W,le=ie*Math.sin(Zt),Xt=Re.y-(j(qt)+ie*Math.cos(Zt)),de=.95*Yt;m&&(Ce={...Ce,lateral:Math.min(Ce.lateral,Math.sqrt(Math.max(0,de*de-Xt*Xt-le*le)))});const Le=s?s.stanceWidth*.5-Math.abs(Re.z):m?Ce.lateral:0;if(Math.hypot(Xt,le,Le)<=de*1.0001)break;qt*=Math.min(1.5,Math.hypot(Xt,le)/de*1.01),Ce=tt(qt,he),Ct=!0}const xe=H(qt,he),Oe=j(qt),$e=N(qt),Ge=Gt*(Wt&&c==="quadruped"?.92:1),Kn=xe.length===3?[Ge,Ge*.6,Ge*.36,Ge*.3]:e.legs==="arthropod"?[Ge,Ge*.8,Ge*.5]:e.legs==="pillar"?[Ge,Ge*.86,Ge*.8]:[Ge,Ge*.66,Ge*.5];s&&(Kn[xe.length]=s.footWidth/(2*1.24));const es=Z=>Kn[Z],Sr=Ge*Qd(e,"leg"),Er=re(Re.x,0,s?Ot*s.stanceWidth*.5:m?Re.z+Ot*Ce.lateral:Re.z),Ns=m?re(0,1,.35*Ot):re(he?-1:1,0,0),wr=m||he?0:W,L={index:vt.length,kind:"leg",side:Ot,pair:Mt,front:Wt,socketBone:Jt,socket:$t,bones:[],segments:xe,pole:Ds(Ns),metaTilt:wr,footHeight:Oe,footLength:$e,footExtent:[.45*$e+1.6*es(xe.length)+.3*Oe,1.4*$e+1.6*es(xe.length)+1.6*Oe],rest:Ds(Er),phase:ae},it=G0(L,Re,Er,new fn),ft=xe.length===3?["upper","lower","meta"]:["upper","lower"];let at=Jt;for(let Z=0;Z<xe.length;Z++){const Ft=Ss(l,{name:`leg_${Mt}_${Ot<0?"L":"R"}_${ft[Z]}`,parent:at,part:"leg",side:Ot,limb:L.index,length:xe[Z],driver:"ik",position:it.points[Z],quaternion:it.frames[Z],start:Z?Un(Kn[Z],Kn[Z]):Un(Sr,Sr),end:Un(Kn[Z+1],Kn[Z+1])});L.bones.push(Ft),at=Ft}L.bones.push(Ss(l,{name:`leg_${Mt}_${Ot<0?"L":"R"}_foot`,parent:at,part:"foot",side:Ot,limb:L.index,length:$e,driver:"ik",position:it.points[xe.length],quaternion:it.frames[xe.length],start:Un(Kn[xe.length],Oe)})),vt.push(L)},ge=Jv(e,w,ht,F,m,u,o);if(i&&(ge.stride=ge.duty*i.motion.strideLength,ge.speed=i.motion.walkSpeed,ge.period=i.motion.strideLength/ge.speed),c==="biped")for(const Mt of[-1,1])pe(0,Mt,Lt[0],U(Mt),w,!1,Mt<0?0:.5);else if(c==="quadruped"||c==="sprawled"){const Mt=Bo(k,yt(1));if(Vt=c==="quadruped"?Rn(Mt.y/$,w*.5,w*2):w,s&&c==="quadruped"){let $t=0,qt=Math.max(.001,w);for(let Wt=0;Wt<24&&tt(qt,!0).height<Mt.y;Wt++)qt*=2;if(tt(qt,!0).height<Mt.y)throw new Error("Resolved shoulder cannot reach ground within the bounded leg fitter");for(let Wt=0;Wt<40;Wt++){const ae=($t+qt)/2;tt(ae,!0).height<Mt.y?$t=ae:qt=ae}Vt=($t+qt)/2}c==="quadruped"&&Math.abs(Vt-w)>.03*w&&r.push({part:"Front legs",chosen:e.legLength.toFixed(2),effect:`${Vt>w?"Lengthened":"Shortened"} to ${(Vt/u).toFixed(2)} body lengths so both pairs reach the ground with this shoulder height.`});const Ot=_==="flat-face"&&(e.arms==="grasping"||e.feet==="hand")&&e.horns==="none"&&e.wings==="none",Jt=c==="quadruped"?{hind:[0,.5],fore:Ot?[.25,.75]:[.75,.25]}:{hind:[.5,0],fore:[0,.5]};for(const $t of[-1,1])pe(0,$t,Lt[0],U($t),w,!1,Jt.hind[$t<0?0:1]);for(const $t of[-1,1])pe(1,$t,Lt[ut-1],yt($t),Vt,!0,Jt.fore[$t<0?0:1])}else if(c==="many-legged"){const Mt=.62/Math.max(3,e.legPairs);for(let Ot=0;Ot<ut;Ot++)for(const Jt of[-1,1])pe(Ot,Jt,Lt[Ot],Dt(Ot,Jt),w,Ot>=ut/2,((Ot*Mt+(Jt>0?.5:0))%1+1)%1)}const Ae=e.arms==="none"?0:e.armLength*u*(e.arms==="small"?.55:1)*(d?.45:1),Bt=Ae?Rn(.3*Math.min(f,h),.045*Ae,.11*Ae)*(e.arms==="small"?.8:1)*At:0;if(Ae>0){const Mt=l.bones[Lt[ut-1]],Ot=ot((ut-1+.62)/ut),Jt=$t=>[Mt.length*.62,(c==="biped"?.08:-.05)*Ot.h+Ot.yc,$t*.9*Ot.w];for(const $t of[-1,1]){const qt=[Ae*.45,Ae*.4,Ae*.09,Ae*.08],Wt=Bo(Mt,Jt($t)),ae={index:vt.length,kind:"arm",side:$t,pair:0,front:!0,socketBone:Mt.index,socket:Jt($t),bones:[],segments:qt,pole:[-1,-.2,.3*$t],metaTilt:0,footHeight:0,footLength:0,footExtent:[0,0],rest:[0,0,0],phase:$t<0?.5:0};ae.rest=Ds(iy(e,ae,Wt));const Re=Oh(ae,Wt,cn(ae.rest),new fn,0,.25),he=["upper","fore","hand","finger"],Ce=[Bt*Qd(e,"arm"),Bt*.7,Bt*.62,Bt*.4,Bt*.3];let xe=Mt.index;for(let Oe=0;Oe<4;Oe++){const $e=Ss(l,{name:`arm_${$t<0?"L":"R"}_${he[Oe]}`,parent:xe,part:Oe<2?"arm":Oe===2?"hand":"finger",side:$t,limb:ae.index,length:qt[Oe],driver:"ik",position:Re.points[Oe],quaternion:Re.frames[Oe],start:Un(Ce[Oe],Ce[Oe]),end:Un(Ce[Oe+1],Ce[Oe+1])});ae.bones.push($e),xe=$e}vt.push(ae)}}const jt=e.wings==="none"?0:s?s.wingSpan/2:Math.min(e.wingSpan,v0(e))*u*(d?.45:.5);if(jt>0){const Mt=c==="many-legged"||c==="limbless"?Lt[Math.max(0,Math.floor(ut*.7))]:Lt[ut-1],Ot=l.bones[Mt],Jt=c==="many-legged"||c==="limbless"?ot(.75):v,$t=e.armor==="dome",qt=ae=>[Ot.length*(c==="biped"?.62:.4),$t?.25*Jt.h+Jt.yc:.7*Jt.h+Jt.yc,ae*($t?1.05:.6)*Jt.w],Wt=[.28,.34,.38].map(ae=>ae*jt);for(const ae of[-1,1]){const Re={index:vt.length,kind:"wing",side:ae,pair:0,front:!0,socketBone:Mt,socket:qt(ae),bones:[],segments:Wt,pole:[0,1,0],metaTilt:0,footHeight:0,footLength:0,footExtent:[0,0],rest:[0,0,0],phase:0};let he=Bo(Ot,qt(ae)),Ce=Mt;const xe=[re(-.18,.22,ae),re(-.2,.04,ae),re(-.42,-.04,ae)],Oe=Math.max(.012*jt,Math.min(f,h)*.16);["humerus","forearm","hand"].forEach(($e,Ge)=>{const Kn=xe[Ge].normalize(),es=Ss(l,{name:`wing_${ae<0?"L":"R"}_${$e}`,parent:Ce,part:"wing",side:ae,limb:Re.index,length:Wt[Ge],position:he.clone(),quaternion:ai(Kn,Ln),start:Un(Oe*(1-Ge*.28),Oe*(1-Ge*.28)),end:Un(Oe*(.72-Ge*.24),Oe*(.72-Ge*.24))});Re.bones.push(es),Ce=es,he.addScaledVector(Kn,Wt[Ge])}),vt.push(Re)}}if(Ct&&r.push({part:"Leg length",chosen:e.legLength.toFixed(2),effect:"Some legs were lengthened so their feet reach the ground from this body height."}),l.bones.length>Kd.maxBones)throw new Error(`Composer graph uses ${l.bones.length} bones; budget is ${Kd.maxBones}.`);const _e={version:Xv,recipe:e,constraints:r,bones:l.bones,limbs:vt,...i?{phenotype:i}:{},chains:{torso:Lt,tail:D,neck:q,head:Rt,trunk:O},dims:{bodyLength:u,torsoWidth:f,torsoHeight:h,legReach:w,frontLegReach:Vt,socketHeight:ht,headLength:S,craniumWidth:E,craniumHeight:y,snoutLength:R,neckLength:K,tailLength:rt,trunkLength:wt,wingSemiSpan:jt,armLength:Ae,legRadius:Gt,armRadius:Bt,torsoPitch:Pt},locomotion:ge,traits:o};if(p&&Qv(_e),i&&_e.locomotion.stride>0&&(_e.locomotion.speed=i.motion.walkSpeed,_e.locomotion.period=_e.locomotion.stride/(_e.locomotion.duty*_e.locomotion.speed)),i){const Mt=i.dimensions,Ot=_e.locomotion,Jt=[],$t=(qt,Wt,ae,Re,he)=>Jt.push({field:qt,requested:Wt,built:ae,units:Re,reason:he});$t("legReach",Mt.legReach,w,"m","Minimum articulated reach for the unchanged torso belly clearance."),$t("frontLegReach",Mt.legReach,Vt,"m","Forelimb reach fitted to the built shoulder height.");for(const qt of vt.filter(Wt=>Wt.kind==="leg")){const Wt=qt.segments.reduce((Re,he)=>Re+he,0),ae=qt.segments[0]+qt.segments[1];$t(`limb.${qt.index}.reach`,Mt.legReach,Wt,"m","Actual segment sum after socket and lateral stance fitting."),$t(`limb.${qt.index}.upperLegFraction`,Mt.upperLegFraction,qt.segments[0]/ae,"ratio","Upper share of upper/lower pair, excluding any metapodial segment."),$t(`limb.${qt.index}.footLength`,Mt.footLength,qt.footLength,"m","Nominal foot profile length; surface extent is separately measured.")}$t("cycleLength",i.motion.strideLength,Ot.stride/Ot.duty,"m","Full gait cycle; fitted stance sweep divided by duty."),$t("stanceSweep",i.motion.strideLength*Ot.duty,Ot.stride,"m","Composer stride is the stance sweep, duty times full cycle length."),$t("period",i.motion.strideLength/i.motion.walkSpeed,Ot.period,"s","Fitted full gait cycle divided by retained walking speed."),$t("walkSpeed",i.motion.walkSpeed,Ot.speed,"m/s","Source walking speed, or zero for an immobile fitted gait."),_e.phenotypeFit={version:"composer-phenotype-fit-1",entries:Jt,deviations:Jt.filter(qt=>Math.abs(qt.built-qt.requested)>1e-9*Math.max(1,Math.abs(qt.requested))),derived:{snoutToHeadRatio:R/S,craniumHeightToWidthRatio:y/Mt.headWidth,footHeightToWidthRatio:.42,neckBones:ct}}}return _e}function Qv(n){const t=n.locomotion,e=96,i=t.stride,s=n.limbs.filter(a=>a.kind==="leg"),r=n.traits.motion.phase,o=()=>{let a=0;const l=[];for(let c=0;c<e;c++)l.push((c+.37)/e*t.period);for(const c of s)for(const u of[1e-9,t.duty*(1-1e-9)])l.push(((u-c.phase-r)%1+1)%1*t.period);for(const c of l)for(const u of Jd(n,"walk",c).contacts)u.stance&&(a=Math.max(a,u.extension));for(const c of Jd(n,"neutral",0).contacts)a=Math.max(a,c.extension);return a};for(let a=0;a<24&&o()>Nh;a++)t.stride*=.85,t.bob*=.8,t.sway*=.75,t.speed=t.stride/(t.duty*t.period);o()>Nh?(t.stride=0,t.speed=0,n.constraints.push({part:"Walking",chosen:n.recipe.layout,effect:"These legs cannot step without overextending; the walk marks time in place."})):t.stride<i*.6&&n.constraints.push({part:"Walking",chosen:n.recipe.legs,effect:`Stride shortened to ${(t.stride/Math.max(1e-9,i)*100).toFixed(0)}% so planted feet stay within reach.`})}function Jv(n,t,e,i,s,r,o){const a=o.motion;if(n.layout==="limbless"){const M=n.torso==="annulated",_=Rn(1.4*Math.sqrt(r),1.1,3.2)*a.periodScale;return{gait:M?"peristaltic-crawl":"serpentine-crawl",period:_,duty:1,stride:0,speed:(M?.08:.3)*r/_,lift:0,bob:0,sway:0}}const l=Rn(1.25*Math.sqrt(Math.max(.01,e)),.6,2.2)*a.periodScale,c=(n.layout==="biped"?.6:n.layout==="quadruped"?.66:n.layout==="sprawled"?.7:.62)+a.dutyDelta,u=(i.seg[0]+i.seg[1])*t,d=s?.8*u:i.ext*u,p=Math.sqrt(Math.max(0,(Nh*u)**2-d*d)),m=Math.min(2*p*.92,.75*t*(n.layout==="many-legged"?.6:1)),g=Math.min(.12*t,.5*(u-d)+.06*t)*a.liftScale,x=n.layout==="biped"?"biped-walk":n.layout==="quadruped"?"quadruped-walk":n.layout==="sprawled"?"sprawling-walk":"metachronal-wave",f=(n.layout==="biped"?.018:n.layout==="quadruped"?.008:0)*e,h=n.layout==="sprawled"?n.armor==="dome"?.03:.12:n.layout==="many-legged"?.05:0;return{gait:x,period:l,duty:c,stride:m,speed:m/(c*l),lift:g,bob:f,sway:h}}function Cl(n,t,e=[],i=0){const s=o=>o.h-o.yc;for(let o=0;o<t.length;o++){const a=n.bones[t[o]],l=ei(a.restQuaternion),c=cn(a.restPosition),u=n.bones[t[o+1]],d=!u&&a.part==="trunk"?mu*a.end.h:0,p=re(1,0,0).applyQuaternion(l),m=Math.max(s(a.start),s(a.end),u?s(u.start):0,d)*1.05;let g=c.clone().addScaledVector(p,a.length);if(g.y<m){const x=V0(p,c.y,a.length,m),f=new fn().setFromUnitVectors(p,x);for(let h=o;h<t.length;h++){const M=n.bones[t[h]],_=cn(M.restPosition).sub(c).applyQuaternion(f).add(c);M.restPosition=Ds(_),M.restQuaternion=Qo(f.clone().multiply(ei(M.restQuaternion)).normalize())}g=c.clone().addScaledVector(x,a.length)}}const r=n.bones[t[t.length-1]];r&&e.length&&(r.restQuaternion=Qo(pu(cn(r.restPosition),ei(r.restQuaternion),r.length,e,i)));for(const o of t){const a=n.bones[o],l=n.bones[a.parent],c=ei(l.restQuaternion).invert();a.offset=Ds(cn(a.restPosition).sub(cn(l.restPosition)).applyQuaternion(c)),a.restLocal=Qo(c.multiply(ei(a.restQuaternion)).normalize())}}function Ec(n,t,e){const i=e.end.h;if(n.tail==="tufted")return[[i*2,0,Math.max(e.length*.9,i*4),i*2.6,i*2.6]];if(n.tail==="club"){const s=Math.max(i*2.4,t*.05);return[[s*.6,0,s*1.1,s*.8,s*1.3],[s*.6,-s*1.2,s*.55,s*.45,s*.5],[s*.6,s*1.2,s*.55,s*.45,s*.5]]}if(n.tail==="feather-fan"){const s=k0(n,t);return[[s*.5,0,s*.53,s*.06,s*.7]]}return[]}const k0=(n,t)=>Math.max(n.tailLength*t*.8,.12*t);function Ll(n,t,e,i){const s=re(1,0,0).applyQuaternion(t),r=re(0,1,0).applyQuaternion(t),o=re(0,0,1).applyQuaternion(t);return i.reduce((a,[l,c,u,d,p])=>Math.min(a,n.y+s.y*(e+l)+o.y*c-Math.hypot(u*s.y,d*r.y,p*o.y)),1/0)}function pu(n,t,e,i,s){if(!i.length||Ll(n,t,e,i)>=s)return t;const r=re(1,0,0).applyQuaternion(t),o=re().crossVectors(r,Ln);if(o.lengthSq()<1e-12)return t;o.normalize();const a=u=>Qi(o,u).multiply(t).normalize();let l=0,c=r.angleTo(Ln);if(Ll(n,a(c),e,i)<s)return a(c);for(let u=0;u<40;u++){const d=(l+c)/2;Ll(n,a(d),e,i)>=s?c=d:l=d}return a(c)}function Qd(n,t){return t==="arm"?1.4:n.legs==="arthropod"?1:n.legs==="pillar"?1.15:1.45}const mu=1.2,ty=[.45,.5,.45];function ey(n,t){const e=t.side,i=re(-1,-.18,.1*e).normalize(),s=re(0,-1,.45*e);s.addScaledVector(i,-s.dot(i)).normalize();const r=s.multiplyScalar(e),o=re().crossVectors(r,i),a=new fn().setFromRotationMatrix(new ke().makeBasis(i,o,r));return ei(n.bones[t.bones[0]].restLocal).invert().multiply(a)}function z0(n,t,e){let i=n?t*(.36+.14*Math.sin(Math.PI*Math.min(1,e*1.15)))*(1-.8*ws(.8,1,e)):t*.58*Math.pow(1-e,.9)*(.78+.22*Math.abs(Math.cos(Math.PI*3*e)));return n&&(i*=1-.08*Math.abs(Math.sin(Math.PI*9*e))),Math.max(i,t*.03)}const B0=(n,t)=>t*(n?.018:.008);function ny(n,t,e,i,s){const r=t.bones.map(h=>n.bones[h]),o=r.reduce((h,M)=>h+M.length,0),a=n.recipe.wings==="feathered",l=B0(a,o),c=e[r[0].index].p.clone(),u=h=>{const M=[];let _=0;for(const b of r){const{p:S,q:y}=e[b.index],E=re(1,0,0).applyQuaternion(y),R=re(0,1,0).applyQuaternion(y),w=re(0,0,1).applyQuaternion(y),T=Math.max(b.start.h,b.end.h);for(let C=0;C<=4;C++){const I=b.length*C/4,F=z0(a,o,(_+I)/o)*i[b.index],V=S.clone().addScaledVector(E,I),Y=Math.abs(R.y),P=V.clone().addScaledVector(w,t.side*F);M.push(V.addScaledVector(Ln,-Math.hypot(T*Y,T*Math.abs(w.y))),P.addScaledVector(Ln,-(l+.06*F)*Y))}_+=b.length}return M.map(b=>b.sub(c).applyQuaternion(h).add(c))},d=h=>u(h).reduce((M,_)=>_.y<M.y?_:M);if(d(new fn).y>=s)return;const p=re(1,0,0).applyQuaternion(e[t.socketBone].q).setY(0);if(p.lengthSq()<1e-12)return;const m=p.normalize().multiplyScalar(-t.side);let g=0,x=Math.PI*.75;for(let h=0;h<40;h++){const M=(g+x)/2;d(Qi(m,M)).y>=s?x=M:g=M}const f=Qi(m,x);for(const h of r){const M=e[h.index];M.p.sub(c).applyQuaternion(f).add(c),M.q.premultiply(f).normalize()}}function V0(n,t,e,i){const s=Rn((i-t)/e,-1,1),r=re(n.x,0,n.z),o=r.length(),a=Math.sqrt(Math.max(0,1-s*s));return o>1e-9?r.multiplyScalar(a/o).setY(s):re(0,s>=0?1:-1,0)}function H0(n,t,e,i,s){const r=i?cn(i).normalize():Ln.clone(),o=s?cn(s):re(1,0,0).applyQuaternion(e);i?o.addScaledVector(r,-o.dot(r)):o.y=0,o.normalize();const a=t.clone().addScaledVector(r,n.footHeight),l=n.segments;let c=a;return l.length===3&&(c=a.clone().addScaledVector(r,l[2]*Math.cos(n.metaTilt)).addScaledVector(o,-l[2]*Math.sin(n.metaTilt))),{up:r,fwd:o,ankle:a,hock:c}}function G0(n,t,e,i,s=0,r,o){const{up:a,fwd:l,ankle:c,hock:u}=H0(n,e,i,r,o),d=n.segments,p=cn(n.pole).applyQuaternion(i),{joint:m,end:g,reachError:x}=fu(t,u,d[0],d[1],p),f=[t.clone(),m,g];d.length===3&&f.push(g.clone().add(c.clone().sub(u)));const h=re().crossVectors(f[f.length-1].clone().sub(t),p);h.lengthSq()<1e-12&&h.set(0,0,1),h.normalize();const M=[];for(let S=0;S<d.length;S++){const y=f[S+1].clone().sub(f[S]);M.push(ai(y,re().crossVectors(h,y).normalize()))}let _=l.clone();n.side&&Math.abs(n.pole[2])>.1&&_.applyAxisAngle(Ln,-n.side*.35);const b=ai(_,a);return s&&b.multiply(Qi(la,s)),M.push(b),f.push(f[f.length-1].clone()),{points:f.slice(0,d.length+1),frames:M,reachError:x,extension:t.distanceTo(u)/(d[0]+d[1])}}const Pl=Object.freeze([-.2,-.35,.75]),Dl=Object.freeze([-.2,.9,.5]);function iy(n,t,e){const i=t.segments[0]+t.segments[1];let s;n.layout==="biped"&&n.arms==="grasping"?s=e.clone().add(re(.12*i,-.86*i,t.side*.12*i)):n.layout==="limbless"||n.layout==="many-legged"?s=e.clone().add(re(Pl[0]*i,Pl[1]*i,t.side*Pl[2]*i)):s=e.clone().add(re(.5*i,-.42*i,t.side*.1*i));const r=t.segments[2]+t.segments[3]+.02*i;return s.y<r&&(s.y=r),s}const sy=2.4;function ry(n,t,e){const[,,i,s]=t.bones.map(l=>n.bones[l]),r=1.5*Math.max(i.start.h,i.end.h,s.start.h),o=re(1,0,0).applyQuaternion(e.frames[3]),a=e.points[3].clone().addScaledVector(o,s.length*sy);return Math.min(e.points[2].y,e.points[3].y,a.y)-r}function Oh(n,t,e,i,s,r,o=0){const a=n.segments,l=cn(n.pole).applyQuaternion(i).addScaledVector(Ln,o),c=e.clone().sub(t),u=(a[0]+a[1])*.985,d=c.length()>u?t.clone().addScaledVector(c.normalize(),u):e.clone(),{joint:p,end:m,reachError:g}=fu(t,d,a[0],a[1],l),x=re().crossVectors(m.clone().sub(t),l);x.lengthSq()<1e-12&&x.set(0,0,1),x.normalize();const f=[],h=[t.clone(),p,m];for(let y=0;y<2;y++){const E=h[y+1].clone().sub(h[y]);f.push(ai(E,re().crossVectors(x,E).normalize()))}const M=f[1].clone().multiply(Qi(la,-s)),_=re(1,0,0).applyQuaternion(M),b=m.clone().addScaledVector(_,a[2]),S=M.clone().multiply(Qi(la,-r));return{points:[t,p,m,b],frames:[f[0],f[1],M,S],reachError:g}}const me=Math.PI*2;function oy(n,t){return t==="run"?n.locomotion.period*.64:t==="fly"?Rn(.72*Math.pow(n.dims.bodyLength,.25),.32,1.25)*n.traits.motion.periodScale:t==="glide"?4.8:t==="eat"?Rn(2.8*Math.pow(n.dims.bodyLength,.2),1.8,4.8):n.locomotion.period}function ay(n,t,e){const i=n.segments,s=i[0]+i[1],r=cn(n.pole).applyQuaternion(e),o=Ln.clone().applyQuaternion(e),a=t.clone().add(re(-.22*s,-.3*s,n.side*.06*s).applyQuaternion(e)),{joint:l,end:c,reachError:u}=fu(t,a,i[0],i[1],r),d=[t.clone(),l,c],p=[];i.length===3&&d.push(c.clone().add(re(-.6*i[2],-.8*i[2],0).applyQuaternion(e)));const m=re().crossVectors(c.clone().sub(t),r).normalize();for(let g=0;g<i.length;g++){const x=d[g+1].clone().sub(d[g]);p.push(ai(x,re().crossVectors(m,x).normalize()))}return p.push(ai(re(-1,-.15,n.side*.05).applyQuaternion(e),o)),{points:d,frames:p,reachError:u}}function Jd(n,t,e,i={}){if(i.trunkMotion!==void 0&&i.trunkMotion!=="legacy"&&i.trunkMotion!=="wave-1")throw new Error("Unknown Composer trunk motion");const s=i.environment;if(s){for(const B of["cycle","clock","stride","speed","cycleLength","walkWeight","idleWeight","rootHeight"])if(s[B]!==void 0&&!Number.isFinite(s[B]))throw new Error(`Invalid Composer environment ${B}`);if(s.clock!==void 0&&(s.clock<0||s.clock>1e6))throw new Error("Composer runtime clock must be bounded to one million seconds");if((s.stride??0)<0||(s.speed??0)<0)throw new Error("Composer path stride/speed must be nonnegative");if((s.cycleLength??0)<0||[s.walkWeight,s.idleWeight].some(B=>B!==void 0&&(B<0||B>1)))throw new Error("Invalid Composer motion blend/cycle length");if(s.contact&&!s.ground)throw new Error("Composer terrain contacts require a ground diagnostic sampler");if(s.supportHeight!==void 0&&s.supportHeight!=="reachable-1")throw new Error("Invalid Composer support-height policy");if(s.rootRotation&&(!s.rootRotation.every(Number.isFinite)||Math.abs(Math.hypot(...s.rootRotation)-1)>1e-6))throw new Error("Invalid Composer environment rotation")}const r=s?.clock??Rn(Number.isFinite(e)?e:0,0,120),o=n.bones.length,a=n.recipe,l=n.locomotion,c=n.limbs.filter(B=>B.kind==="wing"),u=(t==="fly"||t==="glide")&&c.length>0,d=(t==="fly"||t==="glide")&&!u,p=t==="run",m=t==="eat",g=p&&(a.layout==="biped"||a.layout==="quadruped"),x=oy(n,t),f=p?Math.min(l.duty,a.layout==="biped"?.38:a.layout==="quadruped"?.32:.5):l.duty,h=new Float64Array(o*3),M=new Float64Array(o*4),_=new Float64Array(o).fill(1),b=new Float64Array(o).fill(1),S=new Array(o),y=new Array(o),E=n.traits.motion,R=s?.cycle??r/x+E.phase,w=B=>a.layout==="quadruped"?(B.front?.5:0)+(B.side<0?0:.08):B.phase;let T=0,C=0;if(g){const B=(R%.5+.5)%.5,et=f,gt=a.layout==="quadruped"?.42:.5;if(B>et&&B<gt){const k=(B-et)/(gt-et);T=n.dims.legReach*.09*Math.sin(Math.PI*k)**2}for(const k of n.limbs)if(k.kind==="leg"){const A=((R+w(k))%1+1)%1;A<f&&(C=Math.max(C,Math.sin(Math.PI*A/f)**2))}}const I=s?.stride??(p?l.stride*(g?.7:.85):l.stride),F=s?.speed??(p?I/(f*x):l.speed),V=u?0:s?.walkWeight??(t==="walk"||p?1:0),Y=u?0:s?.idleWeight??(t==="idle"||d?1:0),P=!u&&(t==="walk"||p||V>0),H=t==="idle"||d||Y>0,W=t==="display",j=(B,et)=>{y[B]=y[B]?y[B].multiply(et):et},N=B=>Qi(la,B),tt=B=>Qi(jv,B),$=B=>Qi(Yv,B),{torso:ut,tail:st,neck:nt,head:K,trunk:ct}=n.chains,rt=a.layout==="limbless";let pt=0;const X=n.bones[ut[0]],lt=cn(X.offset),J=ei(X.restLocal);if(P&&!rt){pt=s?0:(p?F:l.speed)*r;const B=Math.cos(me*R*2);a.layout==="biped"?(lt.y+=-l.bob*B*V,J.multiply($(.035*Math.sin(me*R)*V)).multiply(tt(.04*Math.sin(me*R)*V))):a.layout==="quadruped"&&(lt.y+=-l.bob*B*V,J.multiply($(.015*Math.sin(me*R)*V))),l.sway&&ut.forEach((gt,k)=>{k&&j(gt,tt(l.sway*Math.sin(me*R-k*.9)*V))});const et=a.head==="beak"&&a.layout==="biped"?.16:.05;nt.forEach((gt,k)=>j(gt,N((k%2?-1:1)*et*Math.sin(me*R*2)/Math.max(1,nt.length*.6)*V))),j(K,N(-.5*et*Math.sin(me*R*2)*V)),st.forEach((gt,k)=>j(gt,tt(.07*Math.sin(me*R-.7*(k+1))*V)))}if(g){lt.y+=T-n.dims.legReach*(.04+.045*C);const B=a.layout==="quadruped",et=B?.045*Math.sin(me*R):-.055+.018*Math.sin(me*R*2);J.multiply(N(et)),B&&ut.forEach((gt,k)=>{k&&j(gt,N(.035*Math.sin(me*R-k*.45)/Math.max(1,ut.length-1)))}),nt.forEach(gt=>j(gt,N(-et*.65/Math.max(1,nt.length)))),st.forEach((gt,k)=>j(gt,N(.055*Math.sin(me*R-k*.45))))}if(H||W){const B=3.4*Rn(Math.pow(n.dims.bodyLength,.25),.6,1.8),et=1+.012*Math.sin(me*(r/B+E.breathPhase))*(W?1:Y);for(const D of ut)_[D]=et;const gt=E.lookPhase,k=H?.22*Math.sin(me*(r/7.3+gt))*Y:.12*Math.sin(me*(r/4.1+gt)),A=H?.07*Math.sin(me*(r/5.2+gt))*Y:-.12-.05*Math.sin(me*(r/2.7+gt)),v=Math.max(1,nt.length);nt.forEach(D=>{const q=Ln.clone().applyQuaternion(ei(n.bones[D].restQuaternion).invert());j(D,Qi(q,k/v).multiply(N((W?.1:0)+A/v)))}),j(K,N(W?.18:A*.5)),st.forEach((D,q)=>j(D,tt((H?.1*Y:.16)*Math.sin(me*(r/(H?3.1:1.9)+gt)-.6*q)).multiply(N(W&&q<3?.12:0))))}if(m){const B=me*(r/x+E.lookPhase),et=.65+.35*Math.cos(B),gt=n.bones[K],k=n.dims.neckLength+n.dims.headLength+n.dims.snoutLength,A=Math.max(0,gt.restPosition[1]-2*gt.start.h),v=Rn(Math.atan2(A,Math.max(k,1e-6))*.65,.025,.8);nt.forEach(D=>j(D,N(-v*et/Math.max(1,nt.length)))),j(K,N(-v*(.25+.08*Math.sin(B*4)))),st.forEach((D,q)=>j(D,tt(.035*Math.sin(B-q*.6))));for(const D of ut)_[D]=1+.006*Math.sin(B)}if(u){const B=me*(r/x+E.phase),et=t==="fly";lt.y+=Math.max(.6*n.dims.bodyLength,.8*n.dims.wingSemiSpan)+n.dims.bodyLength*(et?.035*Math.sin(B-.6):.018*Math.sin(B)),J.multiply(N(-n.dims.torsoPitch+.05+(et?.018*Math.sin(B):.02*Math.sin(B)))),et||J.multiply($(.065*Math.sin(B))),nt.forEach(gt=>j(gt,N(-.12/Math.max(1,nt.length)))),j(K,N(.06)),st.forEach((gt,k)=>j(gt,tt(.025*Math.sin(B-.35*k)))),pt=s?0:n.dims.bodyLength*(et?2.2:2.6)*r}const mt=()=>ut.reduce((B,et)=>Math.min(B,S[et].p.y-n.bones[et].start.h),1/0);if(ct.length&&t!=="neutral"){const B=E.lookPhase;if(u||m){const et=me*(r/x+B);ct.forEach((gt,k)=>j(gt,N((u?.12+.025*Math.sin(et-k*.35):.16+.12*Math.sin(et-k*.4))*(.15+k*.2)).multiply(tt(.025*Math.sin(et-k*.4)))))}else if(i.trunkMotion==="wave-1"){const et=[.08,.45,.85,1.25,1.6,1.85],gt=[.12,.35,.55,.65,.65,.65];ct.forEach((k,A)=>{const v=.45*A,D=A?1.45:1,Q=W?.38+.12*Math.sin(me*(r/2.4+B)-v):(A&&!W?.035:0)+D*(s?V*.05*Math.sin(me*R-v)+Y*.08*Math.sin(me*(r/4.6+B)-v):P?.05*Math.sin(me*R-v):.08*Math.sin(me*(r/4.6+B)-v)),z=D*(s?V*.12*Math.sin(me*R+1-v)+Y*.1*Math.sin(me*(r/3.3+B)-v):P?.12*Math.sin(me*R+1-v):.1*Math.sin(me*(r/3.3+B)-v));j(k,N(Q*et[A]).multiply(tt(z*gt[A])))})}else{const et=W?.38+.12*Math.sin(me*(r/2.4+B)):s?V*.05*Math.sin(me*R)+Y*.08*Math.sin(me*(r/4.6+B)):P?.05*Math.sin(me*R):.08*Math.sin(me*(r/4.6+B)),gt=s?V*.12*Math.sin(me*R+1)+Y*.1*Math.sin(me*(r/3.3+B)):P?.12*Math.sin(me*R+1):.1*Math.sin(me*(r/3.3+B));ct.forEach((k,A)=>j(k,N(et*(.4+A*.25)).multiply(tt(gt*(A?.4:1)))))}}for(const B of c){if(u)continue;const et=t==="neutral"?0:W?.1+.1*Math.sin(me*r/3):1,gt=W?.38*Math.sin(me*r/1.6):P?.04*Math.sin(me*R*2):0,[k,A,v]=B.bones;j(k,new fn().slerpQuaternions(new fn,ey(n,B),et).multiply(N(gt))),j(A,N(-(Math.PI-.22)*et)),j(v,N((Math.PI-.3)*et+(W?.4*gt:0))),B.bones.forEach((D,q)=>{b[D]=1-ty[q]*et})}if(s){if(s.rootRotation){const B=ei(s.rootRotation);lt.applyQuaternion(B),J.premultiply(B)}lt.y+=s.rootHeight??0}const ot=B=>{const et=n.bones[B];let gt,k;if(et.parent<0)gt=lt.clone(),k=J.clone();else{const A=S[et.parent];gt=cn(et.offset).applyQuaternion(A.q).add(A.p),k=A.q.clone().multiply(ei(et.restLocal))}if(y[B]&&k.multiply(y[B]),k.normalize(),!u&&(et.part==="tail"||et.part==="trunk"||(et.part==="neck"||et.part==="head")&&rt)&&t!=="neutral"){const A=xt=>xt.h-xt.yc,v=rt&&et.part==="neck"&&B===nt[nt.length-1],D=re(1,0,0).applyQuaternion(k),q=gt.clone().addScaledVector(D,et.length),Q=et.part==="trunk"&&B===ct[ct.length-1]?mu*et.end.h:0,z=Math.max(A(et.start),A(et.end),v?A(n.bones[K].start):0,Q)*1.06+(s?.ground?.(q.x,q.z)??0);q.y<z&&(k=new fn().setFromUnitVectors(D,V0(D,gt.y,et.length,z)).multiply(k).normalize()),B===st[st.length-1]&&(k=pu(gt,k,et.length,Ec(a,n.dims.bodyLength,et),.004*n.dims.bodyLength))}S[B]={p:gt,q:k}};if(rt&&t!=="neutral"&&!u){const B=nt.length&&y[nt[0]]?2*Math.acos(Math.min(1,Math.abs(y[nt[0]].w))):0;pt=cy(n,p?"walk":d?"idle":t,p?r/.64:r,S,_,B);for(let et=0;et<o;et++){const gt=n.bones[et].part;n.bones[et].driver==="fk"&&gt!=="torso"&&gt!=="tail"&&ot(et)}}else for(let B=0;B<o;B++)n.bones[B].driver==="fk"&&ot(B);const Pt=[];let U=0;const yt=new fn,Dt=[];for(const B of n.limbs){if(B.kind!=="leg"||u)continue;const et=cn(B.rest);let gt=!0,k=0;const A=p?w(B):B.phase,v=((R+A)%1+1)%1,D=et.clone();if(P)if(v<f){const z=v/f;D.x=et.x+I*(.5-z)}else{const z=(v-f)/(1-f),xt=z*z*z,bt=s?.cycleLength!==void 0?(1-f)*s.cycleLength:F*(1-f)*x,Ut=xt*(10+z*(6*z-15));D.x=et.x-I*.5+(I+bt)*Ut-bt*z,D.y=l.lift*(g?2.4:p?1.3:1)*16*z*z*(1-z)*(1-z)+T,gt=!1,k=a.feet==="spike"?0:-.35*Math.sin(me*z)*Math.sin(Math.PI*z)*(z<.5?1:.4);const ee=k<0?B.footExtent[1]:B.footExtent[0];k=Math.sign(k)*Math.min(Math.abs(k),Math.asin(Math.min(1,D.y/Math.max(1e-9,ee))))}let q,Q;if(s?.contact){const z=s.contact(B,v,gt,Ds(D));if(!z.position.every(Number.isFinite)||z.normal&&(!z.normal.every(Number.isFinite)||Math.hypot(...z.normal)<1e-6))throw new Error("Invalid Composer terrain contact");if(D.fromArray(z.position),q=z.normal,z.forward&&(!z.forward.every(Number.isFinite)||Math.hypot(...z.forward)<1e-6))throw new Error("Invalid Composer foot heading");if(Q=z.forward,z.pitch!==void 0){if(!Number.isFinite(z.pitch))throw new Error("Invalid Composer foot pitch");k=z.pitch}z.stance!==void 0&&(gt=z.stance)}else s?.ground&&(D.y+=s.ground(D.x,D.z));Dt.push({limb:B,contact:D,stance:gt,footPitch:k,groundNormal:q,groundForward:Q})}let It;if(s?.supportHeight==="reachable-1"&&Dt.length){let B=[[-1/0,1/0]];for(const gt of Dt){const{limb:k,contact:A,groundNormal:v,groundForward:D}=gt,q=S[k.socketBone],Q=cn(k.socket).applyQuaternion(q.q).add(q.p),{hock:z}=H0(k,A,yt,v,D),xt=(Q.x-z.x)**2+(Q.z-z.z)**2,bt=z.y-Q.y,Ut=(k.segments[0]+k.segments[1]-1e-6)**2-xt,ee=(Math.abs(k.segments[0]-k.segments[1])+1e-6)**2-xt,Rt=Math.sqrt(Math.max(0,Ut)),O=Math.sqrt(Math.max(0,ee)),wt=Ut<0?[]:ee>0?[[bt-Rt,bt-O],[bt+O,bt+Rt]]:[[bt-Rt,bt+Rt]];B=B.flatMap(([vt,At])=>wt.map(([Gt,Ct])=>[Math.max(vt,Gt),Math.min(At,Ct)]).filter(([Gt,Ct])=>Gt<=Ct))}let et=0;if(B.length&&(et=B.map(([gt,k])=>Rn(0,gt,k)).reduce((gt,k)=>Math.abs(k)<Math.abs(gt)?k:gt,1/0)),It={version:"composer-support-height-1",requested:s.rootHeight??0,applied:(s.rootHeight??0)+et,delta:et,feasible:B.length>0,intervals:B},et){lt.y+=et;for(let gt=0;gt<o;gt++)n.bones[gt].driver==="fk"&&ot(gt)}}for(const B of c){if(!u){ny(n,B,S,b,.004*n.dims.bodyLength);continue}const et=S[B.socketBone],gt=me*(r/x+E.phase),k=t==="fly";let A=cn(B.socket).applyQuaternion(et.q).add(et.p);B.bones.forEach((v,D)=>{const q=k?.08+(.62+D*.12)*Math.sin(gt-D*.16):.13+.025*Math.sin(gt-D*.2),Q=k?(1+Math.cos(gt))*.5:0,z=re(-.16-D*.07-D*.1*Q,Math.sin(q),B.side*Math.cos(q)).normalize(),xt=et.q.clone().multiply(ai(z,Ln));S[v]={p:A.clone(),q:xt},b[v]=1-.075*D*Q,A=A.clone().add(re(n.bones[v].length,0,0).applyQuaternion(xt))})}if(u)for(const B of n.limbs){if(B.kind!=="leg")continue;const et=S[B.socketBone],gt=cn(B.socket).applyQuaternion(et.q).add(et.p),k=ay(B,gt,et.q);U=Math.max(U,k.reachError),B.bones.forEach((A,v)=>{S[A]={p:k.points[v],q:k.frames[v]}})}for(const{limb:B,contact:et,stance:gt,footPitch:k,groundNormal:A,groundForward:v}of Dt){const D=S[B.socketBone],q=cn(B.socket).applyQuaternion(D.q).add(D.p),Q=G0(B,q,et,yt,k,A,v);U=Math.max(U,Q.reachError),B.bones.forEach((bt,Ut)=>{S[bt]={p:Q.points[Math.min(Ut,Q.points.length-1)],q:Q.frames[Ut]}});const z=B.bones[B.bones.length-1];S[z].p=Q.points[Q.points.length-1].clone();const xt=S[z].p.clone().addScaledVector(A?cn(A).normalize():Ln,-B.footHeight);Pt.push({limb:B.index,side:B.side,pair:B.pair,stance:gt,contact:Ds(xt),world:[xt.x+pt,xt.y,xt.z],reachError:Q.reachError,extension:Q.extension??0})}for(const B of n.limbs){if(B.kind!=="arm")continue;const et=S[B.socketBone],gt=cn(B.socket).applyQuaternion(et.q).add(et.p),k=n.bones[B.socketBone],v=cn(B.rest).sub(cn(k.restPosition)).applyQuaternion(ei(k.restQuaternion).invert()).applyQuaternion(et.q).add(et.p),D=B.segments[0]+B.segments[1];let q=.25,Q=.15;if(P&&a.layout==="biped"){const O=a.arms==="small"?0:Rn((a.posture-.4)/.2,0,1);O>0&&(v.x+=O*(p?.36:.22)*D*Math.cos(me*(R+B.phase))),p&&(v.y+=.12*D,q=.85+.2*Math.sin(me*(R+B.phase)),Q=-.1)}H&&(q=.35+.25*Math.sin(me*r/2.8+B.side)),m&&(v.add(re(.05*D,.22*D,0)),q=.8+.15*Math.sin(me*r/x*4),Q=.35),u&&(v.copy(gt).add(re(-.35*D,-.3*D,B.side*.12*D).applyQuaternion(et.q)),q=.75,Q=.35),W&&(v.add(re(Dl[0]*D,Dl[1]*D+.1*D*Math.sin(me*r/1.7+B.side),B.side*Dl[2]*D)),q=.9+.5*Math.sin(me*r/1.3),Q=-.3);const z=B.segments[2]+B.segments[3]+.02*D;!u&&v.y<z&&(v.y=z);const xt=a.hands==="pincer"?Math.max(0,q)*.6:q,bt=.004*n.dims.bodyLength,Ut=n.bones[B.bones[0]].end.h*1.3+bt,ee=()=>{let O=Oh(B,gt,v,u?et.q:yt,Q,xt);for(const wt of[.5,1,2,4,16]){if(u||O.points[1].y>=Ut)break;O=Oh(B,gt,v,yt,Q,xt,wt)}return O};let Rt=ee();for(let O=0;!u&&O<3;O++){const wt=bt-ry(n,B,Rt);if(wt<=0)break;v.y+=wt,Rt=ee()}U=Math.max(U,Rt.reachError),B.bones.forEach((O,wt)=>{S[O]={p:Rt.points[wt],q:Rt.frames[wt]}})}let ht=0,Vt=1/0,Et=0,Lt=1/0;for(let B=0;B<o;B++){const et=S[B];if(i.reuseWorkingBuffers===!1){h.set([et.p.x,et.p.y,et.p.z],B*3),M.set([et.q.x,et.q.y,et.q.z,et.q.w],B*4);continue}const gt=B*3,k=B*4;h[gt]=et.p.x,h[gt+1]=et.p.y,h[gt+2]=et.p.z,M[k]=et.q.x,M[k+1]=et.q.y,M[k+2]=et.q.z,M[k+3]=et.q.w}for(const B of n.limbs)for(let et=0;et+1<B.bones.length&&et<B.segments.length&&!(B.kind==="arm"&&et>=2);et++){const gt=S[B.bones[et]].p,k=S[B.bones[et+1]].p;ht=Math.max(ht,Math.abs(gt.distanceTo(k)-B.segments[et]))}for(const B of Pt){const et=s?.ground?.(B.contact[0],B.contact[2])??0,gt=B.contact[1]-et;B.stance?Et=Math.max(Et,Math.max(0,-gt),Math.abs(gt)):Lt=Math.min(Lt,gt)}return Vt=rt?Math.min(...ut.map(B=>S[B].p.y-n.bones[B].start.h*_[B]+n.bones[B].start.yc)):mt(),{motion:t,time:r,positions:h,quaternions:M,radialScale:_,chordScale:b,travel:pt,contacts:Pt,diagnostics:{maxBoneLengthError:ht,maxReachError:U,maxStancePenetration:Et,minSwingClearance:Number.isFinite(Lt)?Lt:0,minBodyClearance:Vt,jointCount:o,...It?{supportHeight:It}:{}}}}function cy(n,t,e,i,s,r=0){const o=n.locomotion,{torso:a,tail:l}=n.chains,c=o.gait==="peristaltic-crawl",u=n.dims.bodyLength,d=(c?.9:.62)*u,p=t==="walk"?c?.12:.55:t==="display"?.32:.16,m=t==="walk"?o.speed*e:0,g=t==="walk"?0:.18*Math.sin(me*e/6),x=N=>p*Math.sin(me*(N/d+g)),f=[...[...l].reverse(),...a],h=[];c&&a.forEach((N,tt)=>{s[N]=1+(t==="walk"?.13:.04)*Math.sin(me*e/o.period-me*tt/5)});const M=(N,tt)=>{const $=n.bones[N],ut=tt?$.start:$.end;return ut.h*s[N]-ut.yc};let _=0;const b=N=>M(N,n.bones[N].part!=="tail"),S=N=>M(N,n.bones[N].part==="tail"),y=f.map((N,tt)=>tt?Math.max(S(f[tt-1]),b(N)):b(N)),E=n.chains.neck[0],R=E===void 0?0:n.bones[E].start.h-n.bones[E].start.yc,w=n.bones[f[f.length-1]];y.push(Math.max(S(w.index),R)+.1*w.length*Math.sin(Math.min(Math.PI/2,r))+w.end.h*(1-Math.cos(Math.min(Math.PI/2,r)))*.5);const T=l.length?Ec(n.recipe,u,n.bones[l[l.length-1]]):[];T.length&&(y[0]=Math.max(y[0],...T.map(([,,,N,tt])=>Math.max(N,.2*tt))));const C=N=>.5*n.bones[f[N]].length,I=y.slice(),F=()=>{if(T.length){const N=n.bones[f[0]].length;y[0]=Math.max(y[0],y[1]);for(let tt=0;tt<4;tt++){const $=Rn((y[0]-y[1])/N,-.5,.5),ut=Math.sqrt(1-$*$),st=Math.min(...T.map(([nt,,K,ct])=>y[0]+$*nt-Math.hypot(K*$,ct*ut)));if(st>=.006*u)break;y[0]=y[0]+.006*u-st}}for(let N=0;N<f.length;N++)y[N+1]=Math.max(y[N+1],y[N]-C(N));for(let N=f.length-1;N>=0;N--)y[N]=Math.max(y[N],y[N+1]-C(N))};F();const V=[];{let N=0;for(const tt of f){const $=n.bones[tt].length;V.push(x(N+m+$*.5)),N+=$}}const Y=y.map(()=>0);for(let N=0;N<3;N++){const tt=st=>{const nt=Math.asin(Rn((y[st+1]-y[st])/n.bones[f[st]].length,-.5,.5));return re(Math.cos(V[st])*Math.cos(nt),Math.sin(nt),-Math.sin(V[st])*Math.cos(nt))},$=st=>{const nt=n.bones[f[st]],K=tt(st);return ai(nt.part==="tail"?K.negate():K,Ln).multiply(ei(nt.restQuaternion).invert())},ut=st=>{const nt=ei(n.bones[f[st-1]].restQuaternion),K=nt.clone().invert().multiply($(st-1).invert().multiply($(st))).multiply(nt);K.w<0&&K.set(-K.x,-K.y,-K.z,-K.w);const ct=2*Math.acos(Math.min(1,K.w)),rt=Math.sqrt(Math.max(0,1-K.w*K.w)),pt=rt>1e-9?Math.min(Math.PI/2,Math.abs(ct*K.z/rt)):0,X=rt>1e-9?Math.min(Math.PI/2,Math.abs(ct*K.x/rt)):0,lt=Math.min(n.bones[f[st]].length,n.bones[f[st-1]].length);return I[st]*(1-Math.cos(X))+.1*lt*Math.sin(pt)};y.forEach((st,nt)=>{Y[nt]=Math.max(Y[nt],nt>0&&nt<f.length?ut(nt):0)}),Y.forEach((st,nt)=>{y[nt]=I[nt]+st}),F()}let P=re(0,y[0]+Uh,0);h.push(P.clone());const H=[];for(const[N,tt]of f.entries()){const $=n.bones[tt],ut=y[N+1]+Uh,st=Rn(ut-P.y,-.5*$.length,.5*$.length),nt=x(_+m+$.length*.5),K=Math.sqrt($.length*$.length-st*st),ct=re(Math.cos(nt)*K,st,-Math.sin(nt)*K).multiplyScalar(1/$.length);H.push(ct),P=P.clone().addScaledVector(ct,$.length),h.push(P),_+=$.length}if(f.forEach((N,tt)=>{const $=n.bones[N].part==="tail";i[N]=$?{p:h[tt+1].clone(),q:ai(H[tt].clone().negate(),Ln)}:{p:h[tt].clone(),q:ai(H[tt],Ln)}}),l.length){const N=n.bones[l[l.length-1]],tt=i[N.index];tt.q=pu(tt.p,tt.q,N.length,Ec(n.recipe,u,N),.004*u)}const W=(N,tt,$)=>N.reduce((ut,st)=>ut+($?n.bones[st].restPosition[tt]:i[st].p.getComponent(tt)),0)/N.length,j=re(W(a,0,!0)-W(a,0,!1),0,W(a,2,!0)-W(a,2,!1));for(const N of f)i[N].p.add(j);return m*ly(p)}function ly(n){let t=0;const e=64;for(let i=0;i<e;i++)t+=Math.cos(n*Math.sin(me*(i+.5)/e));return t/e}function XS(n){return n.bones.filter(t=>t.parent>=0).map(t=>[t.parent,t.index])}function qS(n){const t=e=>n.limbs.filter(i=>i.kind===e).length;return{layout:n.recipe.layout,gait:n.locomotion.gait,bones:n.bones.length,legs:t("leg"),arms:t("arm"),wings:t("wing"),torsoSegments:n.chains.torso.length,neckBones:n.chains.neck.length,tailBones:n.chains.tail.length,trunkBones:n.chains.trunk.length,bodyLength:n.dims.bodyLength,height:n.dims.socketHeight}}const YS="fauna-composer-eye-2",hy=["pupil","iris-inner","iris","limbus","lid","outer-lid","orbit","socket","facet-a","facet-b","pseudopupil","eyespot","sclera","brow","nictitans","turret","ocellus","ocellus-rim","stalk","facet-edge","eyespot-rim","periocular"],De=Object.freeze(Object.fromEntries(hy.map((n,t)=>[n,t]))),So=Object.freeze({segments:20,pupil:.34,pupilInnerScale:1.06,iris:.65,limbus:.92,horizontalPupil:{rx:.55,ry:.16,n:4},slitPupil:{rx:.08,ry:.46,point:.6},slitIrisFill:.95,slitIrisInner:.85,lid:{w:1,above:.72,below:.62},outerLid:{w:1.2,above:.95,below:.85},orbit:{w:1.55,above:1.35,below:1.25},clip:[.8,.84,.9,.98],recess:.2,eyeLift:.03,lidLift:.1,outerLidLift:.08,outerLidDrop:.06,orbitLift:.01,corneaRadius:1.4,rimSearch:1,closestSearch:2.5,socketDepth:.8}),ha=Object.freeze({cornea:1,lid:.4,compound:.35}),uy=Object.freeze({segments:12,stations:5,facet:.08}),dy=8,gi=(n,t)=>[n[0]-t[0],n[1]-t[1],n[2]-t[2]],Sn=(n,t)=>n[0]*t[0]+n[1]*t[1]+n[2]*t[2],Pn=(n,t)=>[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]],Jo=(n,t)=>[n[0]*t,n[1]*t,n[2]*t],ti=(n,t,e)=>[n[0]+t[0]*e,n[1]+t[1]*e,n[2]+t[2]*e],nn=n=>{const t=Math.hypot(n[0],n[1],n[2]);return t>1e-15?[n[0]/t,n[1]/t,n[2]/t]:[0,0,0]};function ga(n,t,e){const i=[],[s,r,o]=t,[a,l,c]=e;for(let u=0,d=Math.floor(n.length/9);u<d;u++){const p=u*9,m=n[p],g=n[p+1],x=n[p+2],f=n[p+3]-m,h=n[p+4]-g,M=n[p+5]-x,_=n[p+6]-m,b=n[p+7]-g,S=n[p+8]-x,y=l*S-c*b,E=c*_-a*S,R=a*b-l*_,w=f*y+h*E+M*R;if(Math.abs(w)<1e-18)continue;const T=1/w,C=s-m,I=r-g,F=o-x,V=(C*y+I*E+F*R)*T;if(V<-1e-9||V>1+1e-9)continue;const Y=I*M-F*h,P=F*f-C*M,H=C*h-I*f,W=(a*Y+l*P+c*H)*T;if(W<-1e-9||V+W>1+1e-9)continue;const j=(_*Y+b*P+S*H)*T,N=nn([h*S-M*b,M*_-f*S,f*b-h*_]);i.push({t:j,point:[s+a*j,r+l*j,o+c*j],normal:N,tri:u,u:V,v:W})}return i.sort((u,d)=>u.t-d.t)}function $r(n,t,e){for(const i of ga(n,t,e))if(i.t>1e-9)return i;return null}function Fi(n,t,e,i=1/0){let s=null;for(const r of ga(n,t,e))Sn(r.normal,e)>0&&Math.abs(r.t)<=i&&(!s||Math.abs(r.t)<Math.abs(s.t))&&(s=r);return s}function W0(n,t){let e=null,i=1/0;for(let s=0,r=Math.floor(n.length/9);s<r;s++){const o=s*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,d]=Fh(a,l,c,t),p=[a[0]+(l[0]-a[0])*u+(c[0]-a[0])*d,a[1]+(l[1]-a[1])*u+(c[1]-a[1])*d,a[2]+(l[2]-a[2])*u+(c[2]-a[2])*d],m=(p[0]-t[0])**2+(p[1]-t[1])**2+(p[2]-t[2])**2;m<i&&(i=m,e={t:0,point:p,normal:nn(Pn(gi(l,a),gi(c,a))),tri:s,u,v:d})}return e}const fy=1e-9;function py(n,t){const e=Math.floor(n.length/9),i=new Float64Array(e);let s=1/0;for(let r=0;r<e;r++){const o=r*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,d]=Fh(a,l,c,t),p=a[0]+(l[0]-a[0])*u+(c[0]-a[0])*d-t[0],m=a[1]+(l[1]-a[1])*u+(c[1]-a[1])*d-t[1],g=a[2]+(l[2]-a[2])*u+(c[2]-a[2])*d-t[2];i[r]=Math.sqrt(p*p+m*m+g*g),i[r]<s&&(s=i[r])}for(let r=0;r<e;r++){if(!(i[r]<=s+fy))continue;const o=r*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,d]=Fh(a,l,c,t);return{t:0,point:[a[0]+(l[0]-a[0])*u+(c[0]-a[0])*d,a[1]+(l[1]-a[1])*u+(c[1]-a[1])*d,a[2]+(l[2]-a[2])*u+(c[2]-a[2])*d],normal:nn(Pn(gi(l,a),gi(c,a))),tri:r,u,v:d}}return null}function Fh(n,t,e,i){const s=gi(t,n),r=gi(e,n),o=gi(i,n),a=Sn(s,o),l=Sn(r,o);if(a<=0&&l<=0)return[0,0];const c=gi(i,t),u=Sn(s,c),d=Sn(r,c);if(u>=0&&d<=u)return[1,0];const p=a*d-u*l;if(p<=0&&a>=0&&u<=0)return[a/(a-u),0];const m=gi(i,e),g=Sn(s,m),x=Sn(r,m);if(x>=0&&g<=x)return[0,1];const f=g*l-a*x;if(f<=0&&l>=0&&x<=0)return[0,l/(l-x)];const h=u*x-g*d;if(h<=0&&d-u>=0&&g-x>=0){const _=(d-u)/(d-u+(g-x));return[1-_,_]}const M=1/(h+f+p);return[f*M,p*M]}function gu(n,t,e,i){let s=null;for(const r of ga(n,t,e))Sn(r.normal,e)>0&&Math.abs(r.t)<=i&&(!s||r.t>s.t)&&(s=r);return s}function Ts(n,t,e){const i=n*Math.PI/180,s=t*Math.PI/180;return[Math.cos(s)*Math.cos(i),Math.sin(s),e*Math.cos(s)*Math.sin(i)]}function Fc(n,t,e=[1,0,0]){const i=nn(n),s=c=>ti(c,i,-Sn(c,i));let r=Pn(t,i);Math.hypot(...r)<1e-6&&(r=s([1,0,0])),r=nn(r);const o=s(e),a=Math.hypot(...o);let l=r;if(a>.2){const c=Jo(o,1/a),u=Sn(c,r)<0?-1:1;l=nn(ti(Jo(c,.3),r,.7*u))}return Sn(Pn(i,l),t)<0&&(l=Jo(l,-1)),l}function Yr(n,t,e,i){const s=Math.cos(n),r=Math.sin(n);return[t*s,(r>=0?e:i)*r*(1-.25*s*s)]}function tf(n,t){const e=Math.cos(t),i=Math.sin(t),s=So;if(n==="horizontal"){const r=2/s.horizontalPupil.n;return[s.horizontalPupil.rx*Math.sign(e)*Math.abs(e)**r,s.horizontalPupil.ry*Math.sign(i)*Math.abs(i)**r]}return n==="vertical-slit"?[s.slitPupil.rx*e*Math.abs(e)**s.slitPupil.point,s.slitPupil.ry*i]:[s.pupil*e,s.pupil*i]}function X0(n){if(n.spec)return My(n,n.spec);const t=So,e=t.segments,i=n.er,s=nn(n.gaze),r=n.centre,o=n.barAxis?nn(ti(n.barAxis,s,-Sn(n.barAxis,s))):Fc(s,n.up??[0,1,0]),a=Pn(s,o),l=[],c=[],u=[],d=[],p=[],m=[];let g=0;const x=(H,W,j)=>[r[0]+(o[0]*H+a[0]*W+s[0]*j)*i,r[1]+(o[1]*H+a[1]*W+s[1]*j)*i,r[2]+(o[2]*H+a[2]*W+s[2]*j)*i],f=(H,W,j,N=null)=>(l.push(H[0],H[1],H[2]),c.push(De[W]),u.push(j),p.push(N),l.length/3-1),h=t.corneaRadius*t.corneaRadius,M=Math.sqrt(h-t.limbus*t.limbus),_=(H,W)=>{const j=Math.min(t.limbus,Math.hypot(H,W));return Math.sqrt(h-j*j)-M},b=(H,W)=>{const j=Math.max(-1,Math.min(1,H/t.lid.w)),N=Math.sqrt(1-j*j);return(W?t.lid.above:t.lid.below)*N*(1-.25*j*j)},S=(H,W,j)=>{const N=j*b(H,W>=0);return Math.sign(W)*Math.min(Math.abs(W),N)},y=H=>2*Math.PI*H/e,E=(H,W)=>{if(n.surface){const j=x(H,W,t.recess),N=gu(n.surface,j,s,t.rimSearch*i);if(N)return[t.recess+N.t/i,N];const tt=W0(n.surface,j);if(tt&&Math.hypot(...gi(tt.point,j))<=t.closestSearch*i){const $=Sn(gi(tt.point,j),s);return[t.recess+$/i,{...tt,t:$}]}}return g+=n.surface?1:0,[t.recess,null]},R=n.type==="vertical-slit",w=[["pupil",H=>tf(n.type,H),t.clip[0]],["iris-inner",H=>{const[W,j]=tf(n.type,H);return[W*t.pupilInnerScale,j*t.pupilInnerScale]},t.clip[1]],["iris",H=>R?ta(Yr(H,t.lid.w,t.lid.above,t.lid.below),t.slitIrisInner):[t.iris*Math.cos(H),t.iris*Math.sin(H)],t.clip[2]],["limbus",H=>R?ta(Yr(H,t.lid.w,t.lid.above,t.lid.below),t.slitIrisFill):[t.limbus*Math.cos(H),t.limbus*Math.sin(H)],t.clip[3]]],T=[];let C=-1/0;const I=(H,W,j)=>{const[N,tt]=E(H,W);j!=="limbus"&&(C=Math.max(C,N-_(H,W))),T.push({x:H,y:W,role:j,hit:tt})};I(0,0,"pupil");for(const[H,W,j]of w)for(let N=0;N<e;N++){const[tt,$]=W(y(N)),ut=S(tt,$,j);I(tt,ut,H)}T.forEach(({x:H,y:W,role:j,hit:N},tt)=>{(tt%e===1||tt===0)&&m.push(l.length/3),f(x(H,W,C+t.eyeLift+_(H,W)),j,ha.cornea,N)});const F=[];m.push(l.length/3);for(let H=0;H<e;H++){const[W,j]=Yr(y(H),t.lid.w,t.lid.above,t.lid.below),[N,tt]=E(W,j),$=N+t.lidLift;F.push($),f(x(W,j,$),"lid",ha.lid,tt)}m.push(l.length/3);for(let H=0;H<e;H++){const[W,j]=Yr(y(H),t.outerLid.w,t.outerLid.above,t.outerLid.below),[N,tt]=E(W,j);f(x(W,j,Math.max(N+t.outerLidLift,F[H]-t.outerLidDrop)),"outer-lid",0,tt)}m.push(l.length/3);const V=[];for(let H=0;H<e;H++){const[W,j]=Yr(y(H),t.orbit.w,t.orbit.above,t.orbit.below),[N,tt]=E(W,j),$=x(W,j,N+t.orbitLift);V.push($),f($,"orbit",0,tt)}for(let H=0;H<e;H++)d.push(0,1+H,1+(H+1)%e);for(let H=1;H+1<m.length;H++){const W=m[H],j=m[H+1];for(let N=0;N<e;N++){const tt=(N+1)%e;d.push(W+N,j+N,j+tt,W+N,j+tt,W+tt)}}const Y=l.length/3;m.push(Y);for(const H of V)f(H,"socket",0);const P=f(x(0,0,-t.socketDepth),"socket",0);for(let H=0;H<e;H++)d.push(P,Y+(H+1)%e,Y+H);return{positions:l,roles:Uint8Array.from(c),gloss:u,index:d,surface:p,rimFallbacks:g,rings:m}}const ta=(n,t)=>[n[0]*t,n[1]*t];function my(n){const{segments:t,stations:e}=uy,i=nn(n.gaze),s=nn(Pn(n.up,i)),r=Pn(i,s),[o,a,l]=n.er3,c=n.centre,u=[],d=[],p=[],m=[],g=[],x=(_,b)=>(u.push(_[0],_[1],_[2]),d.push(De[b]),p.push(ha.compound),u.length/3-1),f=(_,b,S)=>[c[0]+s[0]*_+r[0]*b+i[0]*S,c[1]+s[1]*_+r[1]*b+i[1]*S,c[2]+s[2]*_+r[2]*b+i[2]*S];g.push(x(f(0,0,l),"pseudopupil"));for(let _=1;_<=e;_++){g.push(u.length/3);const b=_/e*Math.PI/2,S=Math.sin(b),y=Math.cos(b);for(let E=0;E<t;E++){const R=2*Math.PI*E/t;x(f(o*S*Math.cos(R),a*S*Math.sin(R),l*y),(_+E)%2?"facet-b":"facet-a")}}const h=u.length/3;g.push(h),u.push(c[0],c[1],c[2]),d.push(De.socket),p.push(0);for(let _=0;_<t;_++)m.push(0,1+_,1+(_+1)%t);for(let _=1;_<e;_++){const b=1+(_-1)*t,S=1+_*t;for(let y=0;y<t;y++){const E=(y+1)%t;m.push(b+y,S+y,S+E,b+y,S+E,b+E)}}const M=1+(e-1)*t;for(let _=0;_<t;_++)m.push(h,M+(_+1)%t,M+_);return{positions:u,roles:Uint8Array.from(d),gloss:p,index:m,surface:d.map(()=>null),rimFallbacks:0,rings:g}}function gy(n){const t=nn(n.normal),e=nn(Pn(n.up,t)),i=Pn(t,e),s=dy,r=[...n.centre],o=[];for(let a=0;a<s;a++){const l=2*Math.PI*a/s,c=[n.centre[0]+(e[0]*Math.cos(l)+i[0]*Math.sin(l))*n.r,n.centre[1]+(e[1]*Math.cos(l)+i[1]*Math.sin(l))*n.r,n.centre[2]+(e[2]*Math.cos(l)+i[2]*Math.sin(l))*n.r],u=n.rimLift?n.rimLift(a,c):0;r.push(c[0]+t[0]*u,c[1]+t[1]*u,c[2]+t[2]*u)}for(let a=0;a<s;a++)o.push(0,1+a,1+(a+1)%s);return{positions:r,roles:new Uint8Array(s+1).fill(De.eyespot),gloss:new Array(s+1).fill(0),index:o,surface:new Array(s+1).fill(null),rimFallbacks:0,rings:[0,1]}}const wc=Object.freeze({outerMargin:[.2,.23,.23],orbitMargin:[.55,.63,.63],shelf:{lift:.34,drop:.2,orbitLift:.16,from:.25,to:.7},raised:{raise:.35,cornea:1.15},crocodile:{raise:.3,palpebral:.15},disc:{w:1.95,above:2.3,below:1.85,lift:.06,outer:.45,plate:.04},turret:{lift:.55,aperture:.82,orbit:1.25,lean:.25,rimGloss:.35},sclera:{gap:.03,opening:.97},nictitatingDeg:40,spectacleLift:.02,spectacleOuterLift:.01,wrapOff:.15,airOff:.15,domeRiseMax:.2,pattern:{radial:.12,reticulated:.55,faint:.75},w:[[-.56,.2],[-.4,-.36],[-.2,-.36],[0,0],[.2,-.36],[.4,-.36],[.56,.2],[0,.14]],wOrigin:[0,.07]});function xy(n){const t=So,e=wc,i=n.pupilShape??{},s=n.lidShape??{},r=["round","horizontal","vertical-slit","slit-wide","beaded-slit","w","pinhole","dilated"].find(x=>x===n.pupil)??"round",o={kind:r,r:i.r??(r==="pinhole"?.09:r==="dilated"?.5:t.pupil),rx:i.rx??(r==="horizontal"?t.horizontalPupil.rx:r==="slit-wide"?.12:t.slitPupil.rx),ry:i.ry??(r==="horizontal"?t.horizontalPupil.ry:r==="slit-wide"||r==="beaded-slit"?.48:t.slitPupil.ry),n:i.n??t.horizontalPupil.n,point:i.point??t.slitPupil.point,bead:i.bead??.07,pinch:i.pinch??.022},a=r==="vertical-slit"||r==="slit-wide"||r==="beaded-slit",l=n.brow==="raised-orbit"||n.brow==="raised-orbit-shelf",c=a||l,d={shape:n.lid==="round"||n.lid==="spectacle"||n.lid==="turret"?"round":"almond",w:s.w??t.lid.w,above:s.above??t.lid.above,below:s.below??t.lid.below},p=n.sclera==="white",m=["none","shelf","raised-orbit","raised-orbit-shelf","disc"].find(x=>x===n.brow)??"none",g=n.lid==="turret"?{w:s.turretW??.8,lift:s.turretLift??e.turret.lift,aperture:e.turret.aperture}:null;return{pupil:o,iris:c?null:i.iris??t.iris,limbus:c?null:i.limbus??t.limbus,fill:[t.slitIrisInner,t.slitIrisFill],lid:d,outerMargin:m==="disc"?[e.disc.outer,e.disc.outer,e.disc.outer]:e.outerMargin,orbitMargin:e.orbitMargin,rollDeg:s.cornerUpDeg??0,brow:g?"turret":m,raise:n.brow==="raised-orbit"?e.raised.raise:n.brow==="raised-orbit-shelf"?e.crocodile.raise:0,shelfLift:m==="shelf"?e.shelf.lift:m==="raised-orbit-shelf"?e.crocodile.palpebral:0,shelfDrop:m==="shelf"?e.shelf.drop:0,shelfOrbitLift:m==="shelf"?e.shelf.orbitLift:0,disc:m==="disc"?{w:e.disc.w,above:e.disc.above,below:e.disc.below}:null,turret:g,sclera:p,spectacle:n.lid==="spectacle",corneaRadius:n.brow==="raised-orbit"?e.raised.cornea:t.corneaRadius,domeLimit:p?i.limbus??.52:null,pattern:["plain","radial","reticulated","reticulated-faint"].find(x=>x===n.irisPattern)??"plain",nictitating:n.extras==="nictitating"?"front":n.extras==="nictitating-lower"?"lower":"none"}}function _y(n,t,e,i){const s=Math.cos(t),r=Math.sin(t);switch(n.kind){case"horizontal":{const o=2/n.n;return[n.rx*Math.sign(s)*Math.abs(s)**o,n.ry*Math.sign(r)*Math.abs(r)**o]}case"vertical-slit":case"slit-wide":return[n.rx*s*Math.abs(s)**n.point,n.ry*r];case"beaded-slit":{const o=i/4,a=i/2-1,l=(e%i+i)%i;if(l===o)return[0,n.ry];if(l===3*o)return[0,-n.ry];const c=l>o&&l<3*o,u=c?l-o-1:(l-3*o-1+i)%i,d=(c?1:-1)*n.ry*(1-2*(u+1)/(a+1)),p=u%2===0?n.bead:n.pinch;return[c?-p:p,d]}case"w":return by(t);default:return[n.r*s,n.r*r]}}function by(n){const t=wc.w,[e,i]=wc.wOrigin,s=Math.cos(n),r=Math.sin(n);let o=1/0;for(let a=0;a<t.length;a++){const[l,c]=t[a],[u,d]=t[(a+1)%t.length],p=u-l,m=d-c,g=s*m-r*p;if(Math.abs(g)<1e-12)continue;const x=((l-e)*m-(c-i)*p)/g,f=((l-e)*r-(c-i)*s)/g;x>1e-9&&f>=-1e-9&&f<=1+1e-9&&x<o&&(o=x)}return[e+s*o,i+r*o]}const ef=(n,t,e)=>{const i=Math.max(0,Math.min(1,(e-n)/(t-n)));return i*i*(3-2*i)};function My(n,t){const e=So,i=wc,s=e.segments,r=n.er,o=nn(n.gaze),a=n.centre;let l=n.barAxis?nn(ti(n.barAxis,o,-Sn(n.barAxis,o))):Fc(o,n.up??[0,1,0]),c=Pn(o,l);const u=n.forward??[1,0,0],d=Sn(l,u)>=0?1:-1;if(t.rollDeg){const k=-d*t.rollDeg*Math.PI/180,A=Math.cos(k),v=Math.sin(k),D=ti(Jo(l,A),c,v),q=ti(Jo(c,A),l,-v);l=D,c=q}const p=[],m=[],g=[],x=[],f=[],h=[],M=[];let _=0;const b=(k,A,v)=>[a[0]+(l[0]*k+c[0]*A+o[0]*v)*r,a[1]+(l[1]*k+c[1]*A+o[1]*v)*r,a[2]+(l[2]*k+c[2]*A+o[2]*v)*r],S=(k,A,v,D=null,q=1)=>(p.push(k[0],k[1],k[2]),m.push(De[A]),g.push(v),f.push(D),M.push(q),p.length/3-1),y=t.lid,E=y.shape==="round",R=(k,A,v,D)=>E?[A*Math.cos(k),(Math.sin(k)>=0?v:D)*Math.sin(k)]:Yr(k,A,v,D),w=(k,A)=>{const v=Math.max(-1,Math.min(1,k/y.w)),D=Math.sqrt(1-v*v);return(A?y.above:y.below)*D*(E?1:1-.25*v*v)},T=(k,A,v)=>{const D=v*w(k,A>=0);return Math.sign(A)*Math.min(Math.abs(A),D)},C=k=>2*Math.PI*k/s,I=(k,A)=>{if(!n.midline)return[k,A];const v=n.midline.n,D=(l[0]*k+c[0]*A)*v[0]+(l[1]*k+c[1]*A)*v[1]+(l[2]*k+c[2]*A)*v[2],q=Sn(a,v);if(D>=0||q+D*r>=n.midline.min)return[k,A];if(t.disc){const z=Sn(l,v),xt=Sn(c,v),bt=z*z+xt*xt;if(bt>1e-6){const Ut=((n.midline.min-q)/r-D)/bt;return[k+Ut*z,A+Ut*xt]}}const Q=Math.max(0,(n.midline.min-q)/(D*r));return[k*Q,A*Q]},F=(k,A)=>{if(n.surface){const v=b(k,A,e.recess),D=gu(n.surface,v,o,e.rimSearch*r);if(D)return[e.recess+D.t/r,D,0];const q=py(n.surface,v);if(q&&Math.hypot(...gi(q.point,v))<=e.closestSearch*r){const Q=gi(q.point,v),z=Sn(Q,o);return[e.recess+z/r,{...q,t:z},Math.hypot(...ti(Q,o,-z))/r]}}return _+=n.surface?1:0,[e.recess,null,0]},V=(k,A,v,D)=>{const q=A?Math.min(1,Math.max(0,(v-.5*i.wrapOff)/(.5*i.wrapOff))):0;if(q<=0)return k;const Q=ti(A.point,A.normal,D*r),z=q*q*(3-2*q);return[k[0]+(Q[0]-k[0])*z,k[1]+(Q[1]-k[1])*z,k[2]+(Q[2]-k[2])*z]},Y=(k,A)=>{if(!n.surface)return k;const v=W0(n.surface,k);if(!v)return k;const D=Math.hypot(...gi(v.point,k))/r-A,q=Math.min(1,Math.max(0,(D-i.airOff)/i.airOff));if(q<=0)return k;const Q=ti(v.point,v.normal,A*r),z=q*q*(3-2*q);return[k[0]+(Q[0]-k[0])*z,k[1]+(Q[1]-k[1])*z,k[2]+(Q[2]-k[2])*z]},P=t.domeLimit??t.limbus??e.limbus,H=t.corneaRadius*t.corneaRadius,W=Math.sqrt(H-P*P),j=(k,A)=>{const v=Math.min(P,Math.hypot(k,A));return Math.sqrt(H-v*v)-W},N=t.pupil,tt=(k,A)=>_y(N,k,A,s),$=k=>A=>[k*Math.cos(A),k*Math.sin(A)],ut=k=>A=>ta(R(A,y.w,y.above,y.below),k),st=(k,A)=>t.pattern==="radial"&&(k==="iris"||k==="iris-inner")?A%2?1-i.pattern.radial:1+i.pattern.radial:t.pattern==="reticulated"&&k==="iris"&&A%3===0?i.pattern.reticulated:t.pattern==="reticulated-faint"&&k==="iris"&&A%3===0?i.pattern.faint:1,nt=t.sclera?[["pupil",tt,e.clip[0]],["iris-inner",(k,A)=>ta(tt(k,A),e.pupilInnerScale),e.clip[1]],["iris",$(t.iris??.44),e.clip[2]],["sclera",$((t.iris??.44)+i.sclera.gap),e.clip[3]],["sclera",ut(i.sclera.opening),null]]:[["pupil",tt,e.clip[0]],["iris-inner",(k,A)=>ta(tt(k,A),e.pupilInnerScale),e.clip[1]],["iris",t.iris===null?ut(t.fill[0]):$(t.iris),e.clip[2]],["limbus",t.limbus===null?ut(t.fill[1]):$(t.limbus),e.clip[3]]],K=t.turret,ct=K?F(0,0)[0]:0,rt=[];let pt=-1/0,X=-1/0;const lt=(k,A,v,D)=>{const[q,Q]=F(k,A);v!=="limbus"&&v!=="sclera"&&(pt=Math.max(pt,q-j(k,A))),(v==="pupil"||v==="iris-inner")&&(X=Math.max(X,q-j(k,A))),rt.push({x:k,y:A,role:v,hit:Q,i:D})};lt(0,0,"pupil",0);for(const[k,A,v]of nt)for(let D=0;D<s;D++){const[q,Q]=A(C(D),D),z=v===null?Q:T(q,Q,v);lt(q,z,k,D)}pt=Math.min(pt,X+i.domeRiseMax);const J=(k,A)=>K?ct+K.aperture-.05+j(k,A):pt+e.eyeLift+j(k,A)+t.raise,[mt,ot]=K&&n.look?[Sn(n.look,l)*i.turret.lean,Sn(n.look,c)*i.turret.lean]:[0,0];rt.forEach(({x:k,y:A,role:v,hit:D,i:q},Q)=>{(Q%s===1||Q===0)&&h.push(p.length/3),S(b(k+mt,A+ot,J(k,A)),v,ha.cornea,D,st(v,q))});const Pt=Math.atan2(Sn(u,c),Sn(u,l)),U=i.nictitatingDeg*Math.PI/180,yt=k=>t.nictitating==="front"?Math.abs(Math.atan2(Math.sin(k-Pt),Math.cos(k-Pt)))<=U:t.nictitating==="lower"&&Math.sin(k)<-.2,Dt=[];h.push(p.length/3);for(let k=0;k<s;k++){const A=C(k),[v,D]=I(...R(A,y.w,y.above,y.below)),[q,Q,z]=F(v,D),xt=K?ct+K.aperture:t.spectacle?Math.max(pt+e.eyeLift+j(v,D)+t.raise,q+i.spectacleLift):t.disc?Math.max(q+e.lidLift,pt+e.eyeLift+i.disc.plate):q+e.lidLift+t.raise;Dt.push(xt);const bt=yt(A),Ut=K||t.spectacle?b(v+mt,D+ot,xt):V(b(v+mt,D+ot,xt),Q,z,xt-q);S(Ut,bt?"nictitans":"lid",K?i.turret.rimGloss:t.spectacle?1:bt?.7:ha.lid,Q)}const[It,ht,Vt]=[y.w+t.outerMargin[0],y.above+t.outerMargin[1],y.below+t.outerMargin[2]];h.push(p.length/3);const Et=t.sclera,Lt=[];for(let k=0;k<s;k++){const A=C(k),v=ef(i.shelf.from,i.shelf.to,Math.sin(A));let[D,q]=K?[K.w*Math.cos(A),K.w*Math.sin(A)]:R(A,It,ht,Vt);t.shelfDrop&&(q-=t.shelfDrop*v),[D,q]=I(D,q);const[Q,z,xt]=F(D,q),bt=K?Q+K.lift:Et?Q+e.orbitLift:t.spectacle?Q+i.spectacleOuterLift:Math.max(Q+e.outerLidLift+t.raise,Dt[k]-e.outerLidDrop)+t.shelfLift*v,Ut=K?"turret":Et?"orbit":t.shelfLift&&v>.5?"brow":"outer-lid",ee=K?b(D,q,bt):t.spectacle||t.disc?V(b(D,q,bt),z,xt,bt-Q):Y(V(b(D,q,bt),z,xt,bt-Q),e.outerLidLift+t.raise+t.shelfLift*v);Lt.push(ee),S(ee,Ut,K?.15:0,z)}let B=Lt;if(!Et){h.push(p.length/3),B=[];for(let k=0;k<s;k++){const A=C(k),v=ef(i.shelf.from,i.shelf.to,Math.sin(A)),D=t.disc,[q,Q]=I(...K?[i.turret.orbit*Math.cos(A),i.turret.orbit*Math.sin(A)]:D?R(A,D.w,D.above,D.below):R(A,y.w+t.orbitMargin[0],y.above+t.orbitMargin[1],y.below+t.orbitMargin[2])),[z,xt,bt]=F(q,Q),Ut=(D?i.disc.lift:e.orbitLift)+t.shelfOrbitLift*v,ee=V(b(q,Q,z+Ut),xt,bt,Ut);B.push(ee),S(ee,"orbit",0,xt)}}for(let k=0;k<s;k++)x.push(0,1+k,1+(k+1)%s);for(let k=1;k+1<h.length;k++){const A=h[k],v=h[k+1];for(let D=0;D<s;D++){const q=(D+1)%s;x.push(A+D,v+D,v+q,A+D,v+q,A+q)}}const et=p.length/3;h.push(et);for(const k of B)S(k,"socket",0);const gt=S(b(0,0,-e.socketDepth),"socket",0);for(let k=0;k<s;k++)x.push(gt,et+(k+1)%s,et+k);return{positions:p,roles:Uint8Array.from(m),gloss:g,index:x,surface:f,rimFallbacks:_,rings:h,shade:M}}const Ja=Object.freeze({segments:12,stations:3,lens:.07,gloss:{lens:.85,edge:.3,pupil:.6}});function nf(n){const t=n.segments??Ja.segments,e=n.stations??Ja.stations,i=Ja.gloss,s=nn(n.gaze),r=nn(Pn(n.up,s)),o=Pn(s,r),[a,l,c]=n.er3,u=n.centre,d=[],p=[],m=[],g=[],x=[],f=(E,R,w)=>(d.push(E[0],E[1],E[2]),p.push(De[R]),m.push(w),d.length/3-1),h=(E,R,w=1)=>{const T=a*Math.sin(E)*Math.cos(R)*w,C=l*Math.sin(E)*Math.sin(R)*w,I=c*Math.cos(E)*w;return[u[0]+r[0]*T+o[0]*C+s[0]*I,u[1]+r[1]*T+o[1]*C+s[1]*I,u[2]+r[2]*T+o[2]*C+s[2]*I]},M=E=>E/e*Math.PI/2,_=E=>2*Math.PI*E/t;x.push(f(h(0,0),"pseudopupil",i.pupil));for(let E=1;E<=e;E++){x.push(d.length/3);for(let R=0;R<t;R++)f(h(M(E),_(R)),"facet-edge",i.edge)}const b=(E,R)=>1+(E-1)*t+(R%t+t)%t;x.push(d.length/3);const S=d.length/3;for(let E=1;E<e;E++)for(let R=0;R<t;R++)f(h((M(E)+M(E+1))/2,_(R+.5),1+Ja.lens),(E+R)%2?"facet-b":"facet-a",i.lens);const y=f([...u],"socket",0);x.push(y);for(let E=0;E<t;E++)g.push(0,b(1,E),b(1,E+1));for(let E=1;E<e;E++)for(let R=0;R<t;R++){const w=S+(E-1)*t+R,T=b(E,R),C=b(E,R+1),I=b(E+1,R),F=b(E+1,R+1);g.push(w,T,I,w,I,F,w,F,C,w,C,T)}for(let E=0;E<t;E++)g.push(y,b(e,E+1),b(e,E));return{positions:d,roles:Uint8Array.from(p),gloss:m,index:g,surface:p.map(()=>null),rimFallbacks:0,rings:x}}const kh=Object.freeze({flange:1.4});function Il(n){const t=n.segments,e=n.stations,i=nn(n.normal);let s=Pn(n.up,i);Math.hypot(...s)<1e-6&&(s=Pn([1,0,0],i)),s=nn(s);const r=Pn(i,s),o=n.centre,a=[],l=[],c=[],u=[],d=[],p=(h,M,_)=>(a.push(h[0],h[1],h[2]),l.push(De[M]),c.push(_),a.length/3-1),m=(h,M,_)=>[o[0]+s[0]*h+r[0]*M+i[0]*_,o[1]+s[1]*h+r[1]*M+i[1]*_,o[2]+s[2]*h+r[2]*M+i[2]*_];d.push(p(m(0,0,n.height),"ocellus",1));for(let h=1;h<=e;h++){d.push(a.length/3);const M=h/e*Math.PI/2,_=n.r*Math.sin(M),b=n.height*Math.cos(M);for(let S=0;S<t;S++){const y=2*Math.PI*S/t;p(m(_*Math.cos(y),_*Math.sin(y),b),n.rim&&!n.flange&&h===e?"ocellus-rim":"ocellus",1)}}if(n.rim&&n.flange){d.push(a.length/3);for(let h=0;h<t;h++){const M=2*Math.PI*h/t;p(m(kh.flange*n.r*Math.cos(M),kh.flange*n.r*Math.sin(M),0),"ocellus-rim",.3)}}const g=n.rim&&n.flange?e+1:e,x=p(m(0,0,-.3*n.height),"socket",0);d.push(x);for(let h=0;h<t;h++)u.push(0,1+h,1+(h+1)%t);for(let h=1;h<g;h++){const M=1+(h-1)*t,_=1+h*t;for(let b=0;b<t;b++){const S=(b+1)%t;u.push(M+b,_+b,_+S,M+b,_+S,M+S)}}const f=1+(g-1)*t;for(let h=0;h<t;h++)u.push(x,f+(h+1)%t,f+h);return{positions:a,roles:Uint8Array.from(l),gloss:c,index:u,surface:l.map(()=>null),rimFallbacks:0,rings:d}}const vy=Object.freeze({segments:12,rings:[.7,.9,1,1.1],heights:[.04,.035,.02,.008,0],socketDepth:.6});function yy(n){const t=vy,e=t.segments,i=nn(n.normal);let s=Pn(n.up,i);Math.hypot(...s)<1e-6&&(s=Pn([1,0,0],i)),s=nn(s);const r=Pn(i,s),o=n.centre,a=[],l=[],c=[],u=[],d=[],p=(b,S,y)=>(a.push(b[0],b[1],b[2]),l.push(De[S]),c.push(y),a.length/3-1),m=(b,S,y)=>[o[0]+s[0]*b+r[0]*S+i[0]*y,o[1]+s[1]*b+r[1]*S+i[1]*y,o[2]+s[2]*b+r[2]*S+i[2]*y],g=b=>{const S=n.rimLift?n.rimLift(b):0;return ti(b,i,S)};d.push(p(g(m(0,0,t.heights[0]*n.r)),"eyespot",0));const x=["eyespot","eyespot","eyespot-rim","periocular"],f=[0,0,0,0],h=[];t.rings.forEach((b,S)=>{d.push(a.length/3);for(let y=0;y<e;y++){const E=2*Math.PI*y/e,R=g(m(b*n.r*Math.cos(E),b*n.r*Math.sin(E),t.heights[S+1]*n.r));S===t.rings.length-1&&h.push(R),p(R,x[S],f[S])}});for(let b=0;b<e;b++)u.push(0,1+b,1+(b+1)%e);for(let b=0;b+1<t.rings.length;b++){const S=1+b*e,y=1+(b+1)*e;for(let E=0;E<e;E++){const R=(E+1)%e;u.push(S+E,y+E,y+R,S+E,y+R,S+R)}}const M=a.length/3;d.push(M);for(const b of h)p(b,"socket",0);const _=p(m(0,0,-t.socketDepth*n.r),"socket",0);for(let b=0;b<e;b++)u.push(_,M+(b+1)%e,M+b);return{positions:a,roles:Uint8Array.from(l),gloss:c,index:u,surface:l.map(()=>null),rimFallbacks:0,rings:d}}function Sy(n){const t=n.segments,e=n.rings,i=nn(n.dir);let s=Pn(n.up,i);Math.hypot(...s)<1e-6&&(s=Pn([1,0,0],i)),s=nn(s);const r=Pn(i,s),o=[],a=[],l=[],c=[],u=[],d=f=>(o.push(f[0],f[1],f[2]),a.push(De.stalk),l.push(0),o.length/3-1),p=ti(n.base,i,-(n.sink??.6)*n.r0);d(p);for(let f=0;f<e;f++){u.push(o.length/3);const h=f/(e-1),M=ti(p,i,h*(n.length+(n.sink??.6)*n.r0)),_=n.r0+(n.r1-n.r0)*h;for(let b=0;b<t;b++){const S=2*Math.PI*b/t;d(ti(ti(M,s,_*Math.cos(S)),r,_*Math.sin(S)))}}const m=ti(n.base,i,n.length),g=d(ti(m,i,.2*n.r1));for(let f=0;f<t;f++)c.push(0,1+(f+1)%t,1+f);for(let f=0;f+1<e;f++){const h=1+f*t,M=1+(f+1)*t;for(let _=0;_<t;_++){const b=(_+1)%t;c.push(h+_,M+b,M+_,h+_,h+b,M+b)}}const x=1+(e-1)*t;for(let f=0;f<t;f++)c.push(g,x+f,x+(f+1)%t);return{patch:{positions:o,roles:Uint8Array.from(a),gloss:l,index:c,surface:a.map(()=>null),rimFallbacks:0,rings:u},tip:m}}const Ey="fauna-composer-skin-5",wy="fauna-composer-skin-6",Ty="fauna-composer-coat-crisp-1",sf=Object.freeze(["spots","rosettes","reticulated","dapple","stripes","bands","brindle"]),Ay=Object.freeze({torsoRadial:28,torsoRadialBanded:22,torsoRings:7,torsoRingsAnnulated:9,neckRings:6,tailRings:6,legRadial:16,legRadialArthropod:9,legRings:6,legRingsArthropod:3,armRadial:14,armRings:4,eyeRadial:20,eyeStations:7,rootRings:4}),Ry=255,be=(n=0,t=0,e=0)=>new dt(n,t,e),gn=(n,t,e)=>Math.max(t,Math.min(e,n)),Te=(n,t,e)=>n+(t-n)*e,Ye=(n,t,e)=>{const i=gn((e-n)/(t-n),0,1);return i*i*(3-2*i)},Vo=(n,t,e)=>Math.exp(-.5*((n-t)/e)**2),oe=(n,t,e)=>[Te(n[0],t[0],e),Te(n[1],t[1],e),Te(n[2],t[2],e)],je=(n,t)=>[n[0]*t,n[1]*t,n[2]*t],Cy=n=>n>216/24389?116*Math.cbrt(n)-16:n*24389/27,Ly=n=>n>8?((n+16)/116)**3:n*27/24389,Py=(n,t,e,i,s)=>{if(!(t>0))return n;if(e)return oe(n,i,Ho.plumageMix*t);const r=Math.max(1e-6,.2126*s[0]+.7152*s[1]+.0722*s[2]),o=Cy(r),a=Ho.floor*o,l=Math.max(0,1-(o-a)/Ho.lstar),c=je(n,Ly(Math.max(a,o-Ho.lstar*t))/r);return l>0?oe(c,i,Ho.shortAccent*l*t):c},Ho={plumageMix:.55,lstar:16,floor:.4,shortAccent:.3},ds=Math.PI*2,Xe=Object.fromEntries(MM.map((n,t)=>[n,t])),rf=n=>[n.x,n.y,n.z];function Dy(n,t,e){const i=new Uint8Array(e);for(const s of n)if(s.part==="eyes")for(let r=s.firstTriangle*3;r<(s.firstTriangle+s.triangles)*3;r++)i[t[r]]=1;return i}function Iy(n,t,e,i,s,r){const o=new Hi;o.setAttribute("position",new Ri(n,3)),o.setIndex(new Ri(t,1)),o.computeVertexNormals();const a=o.getAttribute("normal").array;o.dispose();const l=n.length/3,c=new Uint32Array(n.buffer,n.byteOffset,l*3),u=new Uint32Array(i.buffer,i.byteOffset,l*4),d=new Map;for(let h=0;h<l;h++){if(r[h])continue;const M=`${c[3*h]},${c[3*h+1]},${c[3*h+2]},${e[4*h]},${e[4*h+1]},${e[4*h+2]},${e[4*h+3]},${u[4*h]},${u[4*h+1]},${u[4*h+2]},${u[4*h+3]}`,_=d.get(M);_?_.push(h):d.set(M,[h])}const p=new Int32Array(l).fill(-1),m=[];for(const h of d.values())if(h.length>1){for(const M of h)p[M]=m.length;m.push(h)}if(!m.length)return a;const g=new Float64Array(l*3),x=new Float64Array(l*3);for(let h=0;h<t.length/3;h++){const M=t[3*h],_=t[3*h+1],b=t[3*h+2];if(p[M]<0&&p[_]<0&&p[b]<0)continue;const S=n[3*b]-n[3*_],y=n[3*b+1]-n[3*_+1],E=n[3*b+2]-n[3*_+2],R=n[3*M]-n[3*_],w=n[3*M+1]-n[3*_+1],T=n[3*M+2]-n[3*_+2],C=y*T-E*w,I=E*R-S*T,F=S*w-y*R;for(const V of[M,_,b])p[V]<0||(x[3*V]+=C,x[3*V+1]+=I,x[3*V+2]+=F,s[h]||(g[3*V]+=C,g[3*V+1]+=I,g[3*V+2]+=F))}const f=(h,M)=>{let _=0,b=0,S=0;for(const y of M){const E=Math.hypot(h[3*y],h[3*y+1],h[3*y+2]);E>1e-30&&(_+=h[3*y]/E,b+=h[3*y+1]/E,S+=h[3*y+2]/E)}return[_,b,S,Math.hypot(_,b,S)]};for(const h of m){let[M,_,b,S]=f(g,h);if(S>1e-12||([M,_,b,S]=f(x,h)),!(S>1e-12)){const w=h[0];M=a[3*w],_=a[3*w+1],b=a[3*w+2],S=1}const y=Math.fround(M/S),E=Math.fround(_/S),R=Math.fround(b/S);for(const w of h)a[3*w]=y,a[3*w+1]=E,a[3*w+2]=R}return a}class Uy{p=new Float64Array(3*4096);c=new Float32Array(3*4096);si=new Uint16Array(4*4096);sw=new Float32Array(4*4096);rg=new Uint8Array(4096);gl=new Float32Array(4096);ix=new Uint32Array(3*8192);hid=new Uint8Array(8192);hide=!1;l0=new Float32Array(3*4096);l1=new Float32Array(3*4096);l2=new Float32Array(3*4096);own=new Uint8Array(4096);cq=new Float64Array(6*4096);coat;lastColour=[0,0,0];nv=0;ni=0;region=Ry;parts=[];current;begin(t,e){this.end(),this.lastW=void 0,this.current={part:t,label:e,firstTriangle:this.ni/3,triangles:0,bones:[]}}end(){this.current&&(this.current.triangles=this.ni/3-this.current.firstTriangle,this.current.triangles>0&&this.parts.push(this.current),this.current=void 0)}prepared=new WeakMap;lastW;lastPrep=[];grow(){const t=this.rg.length*2,e=(i,s)=>{const r=new i.constructor(s);return r.set(i),r};this.p=e(this.p,t*3),this.c=e(this.c,t*3),this.si=e(this.si,t*4),this.sw=e(this.sw,t*4),this.rg=e(this.rg,t),this.gl=e(this.gl,t),this.coat&&(this.l0=e(this.l0,t*3),this.l1=e(this.l1,t*3),this.l2=e(this.l2,t*3),this.own=e(this.own,t),this.cq=e(this.cq,t*6))}v(t,e,i,s=this.region){let r=i===this.lastW?this.lastPrep:this.prepared.get(i);if(!r){const a=i.filter(([,c])=>c>1e-4).sort((c,u)=>u[1]-c[1]).slice(0,4),l=a.reduce((c,[,u])=>c+u,0)||1;r=[];for(let c=0;c<4;c++)r.push(a[c]?.[0]??0,a[c]?a[c][1]/l:0,a[c]?1:0);this.prepared.set(i,r)}if(i!==this.lastW&&(this.lastW=i,this.lastPrep=r,this.current))for(let a=0;a<4;a++)r[a*3+2]&&!this.current.bones.includes(r[a*3])&&this.current.bones.push(r[a*3]);this.nv>=this.rg.length&&this.grow();const o=this.nv++;for(let a=0;a<4;a++)this.si[o*4+a]=r[a*3],this.sw[o*4+a]=r[a*3+1];if(this.p[o*3]=t.x,this.p[o*3+1]=t.y,this.p[o*3+2]=t.z,this.c[o*3]=gn(e[0],0,1),this.c[o*3+1]=gn(e[1],0,1),this.c[o*3+2]=gn(e[2],0,1),this.rg[o]=s,this.gl[o]=0,this.coat){for(let a=0;a<3;a++){const l=this.c[o*3+a];this.l0[o*3+a]=l,this.l1[o*3+a]=l,this.l2[o*3+a]=l}this.own[o]=0,this.cq.fill(NaN,o*6,o*6+6)}return o}vc(t,e,i,s=this.region){const r=this.coat;if(!r){const l=e();return this.lastColour=l,this.v(t,l,i,s)}r.mode=0,r.calls=0,r.ok=!1;const o=e();this.lastColour=o;const a=this.v(t,o,i,s);if(r.calls===1&&r.ok&&r.sampledAt(t)){const l=r.sample;this.cq[a*6]=l.x,this.cq[a*6+1]=l.y,this.cq[a*6+2]=l.z,this.cq[a*6+3]=l.dorsal,this.cq[a*6+4]=l.along,this.cq[a*6+5]=l.footprint,r.mode=1;const c=e();r.mode=2;const u=e();r.mode=3;const d=e();r.mode=0;for(let p=0;p<3;p++)this.l0[a*3+p]=c[p],this.l1[a*3+p]=u[p],this.l2[a*3+p]=d[p];this.own[a]=1}return a}copyLayers(t,e){if(this.coat)for(let i=0;i<3;i++)this.l0[e*3+i]=this.l0[t*3+i],this.l1[e*3+i]=this.l1[t*3+i],this.l2[e*3+i]=this.l2[t*3+i]}patch(t,e,i,s,r,o=this.region){const a=this.nv,l=be();for(let c=0;c<e.length;c++){const u=this.v(l.set(t[c*3],t[c*3+1],t[c*3+2]),e[c],r,o);this.gl[u]=gn(i[c],0,1)}for(let c=0;c+2<s.length;c+=3)this.t(a+s[c],a+s[c+1],a+s[c+2]);return a}t(t,e,i){if(this.ni+3>this.ix.length){const s=new Uint32Array(this.ix.length*2);s.set(this.ix),this.ix=s;const r=new Uint8Array(this.ix.length/3);r.set(this.hid),this.hid=r}this.hid[this.ni/3]=this.hide?1:0,this.ix[this.ni++]=t,this.ix[this.ni++]=e,this.ix[this.ni++]=i}pos(t){return be(this.p[t*3],this.p[t*3+1],this.p[t*3+2])}to(t,e,i,s){const r=this.pos(t);be().crossVectors(this.pos(e).sub(r),this.pos(i).sub(r)).dot(s)>=0?this.t(t,e,i):this.t(t,i,e)}}const xo=n=>{const t=n.t.clone().normalize();let e=n.u.clone().addScaledVector(t,-n.u.dot(t));return e.lengthSq()<1e-10&&(e=Math.abs(t.y)<.9?be(0,1,0):be(1,0,0),e.addScaledVector(t,-e.dot(t))),e.normalize(),{t,u:e,v:be().crossVectors(e,t)}};function xa(n,t,e,i,s=1,r=0){const{t:o,u:a,v:l}=t,c=2/(n.n??2),u=Math.cos(e),d=Math.sin(e),p=c===1?u:Math.sign(u)*Math.pow(Math.abs(u),c),m=c===1?d:Math.sign(d)*Math.pow(Math.abs(d),c);let g=n.rx,x=d<0?n.ryBelow??n.ry:n.ry;if(n.lobe){const[M,_]=n.lobe(e);g=Math.max(1e-4,g+M),d>0&&(x=Math.max(1e-4,x+_))}const f=p*g*s,h=m*x*s;if(i.set(n.c.x+o.x*r+l.x*f+a.x*h,n.c.y+o.y*r+l.y*f+a.y*h,n.c.z+o.z*r+l.z*f+a.z*h),n.squash){const[M,_]=n.squash,b=-_*((i.x-n.c.x)*M.x+(i.y-n.c.y)*M.y+(i.z-n.c.z)*M.z);i.x+=M.x*b,i.y+=M.y*b,i.z+=M.z*b}return i}function zh(n,t){const e=n.c.distanceTo(t.c),i=n.t.angleTo(t.t),s=Math.max(n.rx,n.ry,n.ryBelow??n.ry,t.rx,t.ry,t.ryBelow??t.ry);return i*s>.9*e}function Ny(n,t=!1){if(n.length<4||!n.slice(0,-1).some((o,a)=>zh(o,n[a+1])))return;const e=n.map(o=>o.t.clone().normalize()),i=[0];for(let o=1;o<n.length;o++)i.push(i[o-1]+n[o-1].c.distanceTo(n[o].c));const s=n.map(o=>Math.max(o.rx,o.ry,o.ryBelow??o.ry)),r=new dt;for(const o of[.5,.8,1.2,1.8,2.5,3.5]){for(let a=0;a<n.length;a++){const l=Math.max(1e-6,o*s[a]);r.set(0,0,0);for(let u=0;u<n.length;u++){const d=(i[u]-i[a])/l;Math.abs(d)<3&&r.addScaledVector(e[u],Math.exp(-.5*d*d))}const c=t?Math.min(1,(i[i.length-1]-i[a])/(2*l)):1;n[a].t.copy(e[a]).lerp(r.normalize(),c).normalize()}if(!n.slice(0,-1).some((a,l)=>zh(a,n[l+1])))return}}function Oy(n,t,e){const i=[];for(let l=0;l+1<n.length;l++)e(l)&&i.push(l);const s=new Map,r=l=>{let c=s.get(l);if(!c){const u=n[l],d=xo(u);c=Array.from({length:t},(p,m)=>xa(u,d,ds*m/t,be())),s.set(l,c)}return c},o=new Float64Array(i.length*t*6);let a=0;for(const l of i){const c=r(l),u=r(l+1);for(let d=0;d<t;d++){const p=c[d],m=c[(d+1)%t],g=u[d],x=u[(d+1)%t];o[a++]=p.distanceTo(m),o[a++]=m.distanceTo(g),o[a++]=g.distanceTo(p),o[a++]=m.distanceTo(x),o[a++]=x.distanceTo(g),o[a++]=g.distanceTo(m)}}return o}function vn(n,t,e,i=.6,s=.6,r=0){if(t.length<2)return;const o=[],a=xo,l=be(),c=(M,_=1,b=0,S,y,E)=>{const R=a(M),w=[];for(let T=0;T<e;T++){const C=ds*T/e;if(xa(M,R,C,l,_,b),S){const I=n.v(l,S[T],M.w,M.region);E&&n.copyLayers(E[T],I),w.push(I);continue}w.push(n.vc(l,()=>M.color(C,l),M.w,M.region)),y?.push(n.lastColour)}return w},u=(M,_,b,S,y)=>{const E=[],w=Math.max(M.rx,M.ry)*b;for(let F=1;F<=3;F++){const V=F/4*Math.PI/2;E.push(c(M,Math.cos(V),_*Math.sin(V)*w,S,void 0,y))}const{t:T}=a(M),C=M.c.clone().addScaledVector(T,_*w),I=n.v(C,S[Math.floor(e*3/4)],M.w,M.region);return n.copyLayers(y[Math.floor(e*3/4)],I),{list:E,apex:I}},d=[],p=[],m=[];let g=-1;const x=t.map((M,_)=>c(M,1,0,void 0,_===0?d:_===t.length-1?p:void 0));if(i>0){const M=u(t[0],-1,i,d,x[0]);m.push(...M.list.reverse()),g=M.apex}o.push(...m,...x);const f=n.hide;if(g>=0&&(n.hide=f||(r&1)!==0,of(n,g,o[0],!0),n.hide=f),s>0){const M=u(t[t.length-1],1,s,p,x[x.length-1]);o.push(...M.list),n.hide=f||(r&2)!==0,of(n,M.apex,o[o.length-1],!1),n.hide=f}const h=m.length+x.length-1;for(let M=0;M+1<o.length;M++){n.hide=f||M<m.length&&(r&1)!==0||M>=h&&(r&2)!==0;for(let _=0;_<e;_++){const b=o[M][_],S=o[M][(_+1)%e],y=o[M+1][_],E=o[M+1][(_+1)%e];n.t(b,S,y),n.t(S,E,y)}}n.hide=f}function Fy(n,t,e,i,s){const r=(p,m)=>{const g=xo(p),x=be(),f=[];for(let h=0;h<m;h++){const M=ds*h/m;xa(p,g,M,x),f.push(n.vc(x,()=>p.color(M,x),p.w,p.region))}return f},o=r(t,e),a=r(i,s),l=t.c.clone().add(i.c).multiplyScalar(.5),c=(p,m,g)=>n.pos(p).add(n.pos(m)).add(n.pos(g)).multiplyScalar(1/3).sub(l);let u=0,d=0;for(;u<e||d<s;){const p=o[u%e],m=a[d%s];if(d>=s||u<e&&(u+1)/e<=(d+1)/s){const g=o[(u+1)%e];n.to(p,g,m,c(p,g,m)),u++}else{const g=a[(d+1)%s];n.to(p,g,m,c(p,g,m)),d++}}}function kc(n,t,e,i,s=1){const r=xo(t),o=be(),a=[],l=be(),c=[];for(let m=0;m<e;m++){const g=ds*m/e;xa(t,r,g,o),c.push(o.clone()),l.add(o)}l.multiplyScalar(1/e);for(let m=0;m<e;m++){const g=ds*m/e,x=s===1?c[m]:l.clone().lerp(c[m],s);a.push(n.vc(x,()=>t.color(g,x),t.w,t.region))}const u=n.vc(l,()=>t.color(-Math.PI/2,l),t.w,t.region),d=r.t.clone().multiplyScalar(i),p=n.hide;s<1&&(n.hide=!0);for(let m=0;m<e;m++)n.to(u,a[m],a[(m+1)%e],d);n.hide=p}function of(n,t,e,i){for(let s=0;s<e.length;s++){const r=e[s],o=e[(s+1)%e.length];i?n.t(o,r,t):n.t(r,o,t)}}function An(n,t,e,i,s,r,o=.5,a=.5,l=1,c){if(t.length<2)return;const u=[];let d=c?.clone()??be(0,1,0);for(let p=0;p<t.length;p++){const m=t[Math.min(t.length-1,p+1)].clone().sub(t[Math.max(0,p-1)]).normalize();d.addScaledVector(m,-d.dot(m)),d.lengthSq()<1e-8&&(d=Math.abs(m.y)<.9?be(0,1,0):be(1,0,0),d.addScaledVector(m,-d.dot(m))),d.normalize();const g=p;u.push({c:t[p],t:m,u:d.clone(),rx:Math.max(1e-4,e[p]),ry:Math.max(1e-4,e[p]*l),w:i[p],color:(x,f)=>s(g,x,f)})}vn(n,u,r,o,a)}function Fn(n,t,e,i,s,r,o=10,a=6){const[l,c]=e,u=[];for(let d=0;d<=a;d++){const p=d/a,m=Te(-.92,.92,p)*Math.PI/2,g=Math.cos(m);u.push({c:t.clone().addScaledVector(l,Math.sin(m)*i[0]),t:l,u:c,rx:i[2]*g,ry:i[1]*g,w:s,color:(x,f)=>r(x,p,f)})}vn(n,u,o,.32,.32)}function q0(n,t,e,i,s,r,o,a){const l=be().crossVectors(e,i).normalize(),c=be(),u=(x,f,h)=>t.clone().addScaledVector(e,x).addScaledVector(i,f).addScaledVector(l,h*r*.5),d=(x,f)=>typeof o=="function"?o(x,f):o,p=(x,f)=>typeof a=="function"?a(x,f):a,m=s.map(([x,f])=>n.v(u(x,f,1),p(x,f),d(x,f))),g=s.map(([x,f])=>n.v(u(x,f,-1),p(x,f),d(x,f)));s.forEach(([x,f])=>c.add(u(x,f,0))),c.multiplyScalar(1/s.length);for(let x=1;x+1<s.length;x++)n.to(m[0],m[x],m[x+1],l),n.to(g[0],g[x],g[x+1],l.clone().negate());for(let x=0;x<s.length;x++){const f=(x+1)%s.length,h=n.pos(m[x]).add(n.pos(m[f])).multiplyScalar(.5).sub(c);n.to(m[x],g[x],m[f],h),n.to(m[f],g[x],g[f],h)}}function ky(n,t,e,i){const s=(x,f)=>Math.max(1e-6,Math.sqrt(x.distanceTo(f))),o=s(n,t),a=o+s(t,e),l=a+s(e,i),c=be(),u=be(),d=be(),p=be(),m=be(),g=(x,f)=>(c.copy(n).lerp(t,(x-0)/(o-0)),u.copy(t).lerp(e,(x-o)/(a-o)),d.copy(e).lerp(i,(x-a)/(l-a)),p.copy(c).lerp(u,(x-0)/(a-0)),m.copy(u).lerp(d,(x-o)/(l-o)),f.copy(p).lerp(m,(x-o)/(a-o)));return x=>{const f=o+(a-o)*x,h=(a-o)*.001,M=g(f,be()),_=g(f+h,be()).sub(g(f-h,be()));return _.lengthSq()<1e-20&&_.copy(e).sub(t),{c:M,t:_.normalize()}}}const zy=12*Math.PI/180;function By(n,t,e,i,s){const r=P=>P.k+P.f,o=32*i,a=P=>{const H=Math.min(i-1,Math.floor(P));return t(H,P-H)},l=P=>{const H=Math.min(i-1,Math.floor(P));return Math.max(1e-6,e(H,P-H))},c=[],u=[],d=[],p=[];let m=a(0),g=l(0);for(let P=0;P<=o;P++){const H=i*P/o,W=a(H),j=l(H);c.push(H),u.push(P?u[P-1]+W.c.distanceTo(m.c):0),d.push(P?d[P-1]+W.t.angleTo(m.t):0),p.push(P?p[P-1]+Math.abs(Math.log(j/g)):0),m=W,g=j}const x=P=>{const H=Math.min(o-1,Math.floor(P/i*o)),W=P/i*o-H;return Te(u[H],u[H+1],W)},f=n.findIndex(P=>x(r(P))>=s);if(f<0||n.length-1-f<2)return n;const h=r(n[f]),M=i,_=n.length-1-f,b=(x(M)-x(h))/_,S=Math.max(0,c.findIndex(P=>P>=h)),y=[0],E=[0];for(let P=1;P<=o;P++)y.push(P>S?(u[P]-u[P-1])/Math.max(1e-9,b)+(d[P]-d[P-1])/$y:0),E.push(P>S?(p[P]-p[P-1])/Ky:0);let R=y.reduce((P,H)=>P+H,0)/_,w=y;for(let P=0;P<6;P++)w=y.map((H,W)=>Math.max(H,R*E[W])),R=w.reduce((H,W)=>H+W,0)/_;const T=[0];for(let P=1;P<=o;P++)T.push(T[P-1]+w[P]);const C=P=>{const H=Math.min(o-1,Math.floor(P/i*o)),W=P/i*o-H;return Te(T[H],T[H+1],W)},I=C(h),F=C(M),V=n.slice(0,f+1);let Y=0;for(let P=1;P<_;P++){const H=I+(F-I)*P/_;for(;Y<o-1&&T[Y+1]<H;)Y++;const W=Math.max(h,c[Y]+(c[Y+1]-c[Y])*(H-T[Y])/Math.max(1e-12,T[Y+1]-T[Y])),j=Math.min(i-1,Math.floor(W)),N=W-j;V.push({...n[f],k:j,f:N,kind:"bone"})}return V.push(n[n.length-1]),V}function af(n,t,e){let i=n,s=i.map(r=>t(r).clone().normalize());for(let r=0;r<3;r++){const o=[i[0]],a=[s[0]];let l=!1;for(let c=1;c<i.length;c++){const u=i[c-1],d=i[c];if(s[c-1].angleTo(s[c])>zy){const p=(u.k+u.f+d.k+d.f)/2,m=Math.min(e-1,Math.floor(p)),g=p-m,x={...u,k:m,f:g,kind:g<.12||g>.88?"joint":"bone"};o.push(x),a.push(t(x).clone().normalize()),l=!0}o.push(d),a.push(s[c])}if(i=o,s=a,!l)break}return i}function Vy(n,t,e,i){const s=.22*t;if(n==="muzzle"||n==="jaws"){const r=n==="jaws"?.82:1;return{x:s,w:.982*e,h:.973*i*r,yc:-.0133*i}}return n==="beak"?{x:s,w:e,h:i,yc:.02*i}:n==="flat-face"?{x:s,w:e,h:i,yc:.04*i}:n==="blunt"?{x:s,w:.985*e,h:.985*i,yc:0}:{x:s,w:.943*e,h:.931*i,yc:0}}const Hy=new Set(["stripes","bands","brindle"]),Gy=new Set(["limb-upper","limb-lower","foot"]),Yo=(n,t,e,i=e)=>{const s=Math.sin(n),r=Math.cos(n),o=s<0?i:e,a=Math.hypot(r*o,s*t);return a>1e-12?s*t/a:s},Wy=(n,t,e,i=e)=>{const s=Math.sin(n),r=Math.cos(n),o=s<0?i:e,a=Math.hypot(r*o,s*t);return a>1e-12?r*o/a:r},jo=(n,t,e)=>Lh(t,e,7,n)/4294967296;function jS(n,t={}){if(t.presentation!==void 0&&t.presentation!=="skin-5"&&t.presentation!=="realism-1")throw new Error("Unknown Composer skin presentation");const e=t.presentation==="realism-1",i=new Uy,s=n.recipe,r=n.dims,o=n.bones,a=t.traits??Zo(s),l=a.neutral?0:gn(s.variability,0,1.5),c=aa(`${s.colorSeed}/${s.palette}`),u=G=>new fn(...G.restQuaternion),d=G=>be(...G.restPosition),p=(G,St,_t=0,Nt=0)=>be(St,_t,Nt).applyQuaternion(u(G)).add(d(G)),m=(G,St,_t,Nt)=>be(St,_t,Nt).applyQuaternion(u(G)).normalize(),g=r.bodyLength,x=Math.max(g,.2),f=G=>[[G,1]],h=t.debug?[]:void 0;let M=0,_=!1;const b=Ay,S=du(`composer-skin-ind-v1/${a.coat.driftKey}`),y=[];for(let G=0;G<12;G++)y.push(S());const E=G=>Math.floor(G*4294967296)>>>0,R=E(y[0]),w=l*(.05+.07*y[1]),T=l*(y[2]-.5)*.24,C=1+l*(y[3]-.5)*.3,I=l*.45*y[4],F=.12+.3*y[5],V=1+l*(y[9]-.5)*.34,Y={traits:a,jv:l,osteoSeed:E(y[6]),plateSeed:E(y[7]),featherSeed:E(y[8])};let P=n.phenotype?structuredClone(n.phenotype.coat):T0(A0(s.palette,s.colorSeed,{pattern:s.pattern,marks:s.marks,scale:s.patternScale,contrast:s.patternContrast,countershade:s.countershade,juvenileSpots:a.coat.juvenileSpots}),w0(a.coat.driftKey,s.variability));l>0&&(P={...P,bellyLine:gn(P.bellyLine+T,-1,1),countershade:gn(P.countershade*C,0,1)});const H=P.scale,W=(1+l*(y[10]-.5)*.3)**2.2,j=(1+l*(y[11]-.5)*.2)**2.2,N={...P.colours,skin:je(P.colours.skin,W),keratin:je(P.colours.keratin,W),eye:je(P.colours.eye,j)},tt=a.sex==="male"&&s.dimorphism>0,$=tt?s.dimorphism*Ye(.55,.95,a.maturity):0,ut=[.155,.117,.08],{torso:st,tail:nt,neck:K,head:ct,trunk:rt}=n.chains,pt=o[st[0]],X=o[st[st.length-1]],lt=p(pt,0,pt.start.yc),J=p(X,X.length,X.end.yc),mt=lt.clone().add(J).multiplyScalar(.5),ot=J.clone().sub(lt);ot.z=0,ot.lengthSq()<1e-12&&ot.set(1,0,0),ot.normalize();const Pt=n.phenotype?.coatFrame.phase??0,U=n.phenotype?.coatFrame.lateral??1,yt=n.phenotype?.coatStage,Dt={x:0,y:0,z:0,halfH:r.torsoHeight/x,halfW:r.torsoWidth/x,cell:.024},It=new Float64Array(3),ht={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},Vt=Math.max(r.legReach,r.frontLegReach,.001),Et=P.pattern==="bands"?{...P,pattern:"plain"}:null,Lt=sf.includes(P.pattern)?P.pattern:null,B={mode:0,calls:0,ok:!1,sample:ht,sampledAt:G=>{const St=G.x-mt.x,_t=G.y-mt.y;return ht.x===(St*ot.x+_t*ot.y)/x+Pt&&ht.y===(_t*ot.x-St*ot.y)/x&&ht.z===G.z/x*U}};Lt&&(i.coat=B);const et=(G,St,_t,Nt,ne=0)=>{const kt=G.x-mt.x,Qt=G.y-mt.y;ht.x=(kt*ot.x+Qt*ot.y)/x+Pt,ht.y=(Qt*ot.x-kt*ot.y)/x,ht.z=G.z/x*U,ht.dorsal=gn(St,-1,1),ht.region=_t,ht.along=gn(Nt,0,1),ht.footprint=ne,yt&&(Dt.x=ht.x-Pt,Dt.y=ht.y,Dt.z=G.z/x);const fe=B.mode;fe===0?(yt?Al(P,yt,ht,Dt,It):Li(P,ht,It,0),B.calls++,B.ok=_t!=="eye"&&_t!=="horn"&&_t!=="armor"&&!(Hy.has(P.pattern)&&Gy.has(_t))):yt?Al(P,yt,ht,Dt,It,fe===1?0:1,fe===3?1:0):Ih(P,ht,It,0,fe===1?0:1,fe===3?1:0);let te=[It[0],It[1],It[2]];if(Et&&(_t==="limb-upper"||_t==="limb-lower"||_t==="foot")&&(yt?Al(Et,yt,ht,Dt,It):Li(Et,ht,It,0),te=oe([It[0],It[1],It[2]],te,.4)),_t==="eye"||_t==="horn"||_t==="armor")return te;let Pe=V;return w>0&&(Pe*=1+w*2*(mv(ht.x*4.5,ht.y*4.5,ht.z*4.5,R)-.5)),tt&&(Pe*=1-.06*s.dimorphism*Ye(-.2,.7,St)),Pe!==1&&(te=je(te,Math.pow(Pe,2.2))),$>0&&(te=Py(te,$*Ye(-.85,.15,St),s.palette==="plumage",N.accent,N.base)),s.palette==="plumage"&&_t==="neck"&&(te=oe(te,N.accent,.25)),I>0&&(_t==="limb-lower"||_t==="foot"||_t==="limb-upper")&&s.layout!=="limbless"&&(te=oe(te,ut,I*Ye(F*Vt,.02*Vt,G.y))),te},gt=(G,St)=>{const _t=[];G.forEach(({bone:Ht,reversed:se},Ee)=>{const Ie=se?Ht.end:Ht.start,Me=se?Ht.start:Ht.end;if(Ee===0)_t.push(Ie);else{const we=_t[_t.length-1];_t[_t.length-1]={w:(we.w+Ie.w)/2,h:(we.h+Ie.h)/2,yc:(we.yc+Ie.yc)/2}}_t.push(Me)});const Nt=(Ht,se)=>{const Ee=_t[Math.max(0,Ht-1)],Ie=_t[Ht],Me=_t[Ht+1],we=_t[Math.min(_t.length-1,Ht+2)],ze=(ss,_i,Zn,ks)=>.5*(2*_i+(-ss+Zn)*se+(2*ss-5*_i+4*Zn-ks)*se*se+(-ss+3*_i-3*Zn+ks)*se*se*se),an=Math.max(1e-4,ze(Ee.w,Ie.w,Me.w,we.w)),jn=ze(Ee.yc,Ie.yc,Me.yc,we.yc),Fs=Te(Ie.yc-Ie.h,Me.yc-Me.h,se);return{w:an,h:Math.max(1e-4,Math.min(ze(Ee.h,Ie.h,Me.h,we.h),jn-Fs)),yc:jn}},ne=[],kt=[];G.forEach(({bone:Ht,reversed:se},Ee)=>{const Ie=m(Ht,0,1,0),Me=p(Ht,se?Ht.length:0),we=p(Ht,se?0:Ht.length);Ee===0?(ne.push(Me),kt.push(Ie)):(ne[Ee].add(Me).multiplyScalar(.5),kt[Ee]=kt[Ee].clone().add(Ie).normalize()),ne.push(we),kt.push(Ie)}),ne.forEach((Ht,se)=>Ht.addScaledVector(kt[se],_t[se].yc));const Qt=[...ne,...St.extra??[]],fe=[Qt[0].clone().multiplyScalar(2).sub(Qt[1]),...Qt,Qt[Qt.length-1].clone().multiplyScalar(2).sub(Qt[Qt.length-2])],te=Qt.slice(0,-1).map((Ht,se)=>ky(fe[se],fe[se+1],fe[se+2],fe[se+3])),Pe=Ht=>Qt[Ht+1].clone().sub(Qt[Ht]).normalize(),qe=te.map(()=>!1),ye=new Set;for(let Ht=0;Ht<G.length;Ht++){const se=Qt[Ht],Ee=Pe(Ht),Ie=Qt[Ht+1].distanceTo(se),Me=Math.max(1e-4,Math.min((_t[Ht].w+_t[Ht].h)/2,(_t[Ht+1].w+_t[Ht+1].h)/2));for(let we=1;we<8;we++){const{c:ze,t:an}=te[Ht](we/8),jn=ze.clone().sub(se);if(jn.addScaledVector(Ee,-jn.dot(Ee)).length()>Math.max(.5*Me,.12*Ie)||an.dot(Ee)<.3){qe[Ht]=!0;break}}qe[Ht]&&(Ht>0&&ye.add(Ht),Ht+1<Qt.length-1&&ye.add(Ht+1))}M+=ye.size;const on=(Ht,se)=>{if(!qe[Ht])return te[Ht](se);const Ee=Pe(Ht),Ie=Ee.clone();return Ht>0&&ye.has(Ht)&&se<.12&&Ie.lerp(Pe(Ht-1),.5-se/.24),Ht+1<te.length&&ye.has(Ht+1)&&se>.88&&Ie.lerp(Pe(Ht+1),(se-.88)/.24),{c:Qt[Ht].clone().lerp(Qt[Ht+1],se),t:Ie.normalize()}};let ln=[];G.forEach(({bone:Ht},se)=>{const Ee=St.ringsFor(Ht);let Ie=[];for(let we=0;we<Ee;we++)Ie.push(we/Ee);se===G.length-1&&Ie.push(1);const Me=new Set;if(se>0&&Me.add(.12),(se<G.length-1||St.extra)&&Me.add(.88),Ie=Ie.filter(we=>![...Me].some(ze=>Math.abs(we-ze)<.04)),Ie=[...Ie,...Me].sort((we,ze)=>we-ze),se===0&&St.rootF!==void 0){const we=St.rootF,ze=.5/Ee;Ie=[we,...Ie.filter(an=>an>we+ze)]}for(const we of Ie)ln.push({k:se,f:we,kind:se===0&&we===St.rootF?"root":Me.has(we)?"joint":"bone"})}),ln=af(ln,Ht=>on(Ht.k,Ht.f).t,G.length),St.respaceFrom!==void 0&&(ln=By(ln,on,(Ht,se)=>{const Ee=Nt(Ht,se);return .5*(Ee.w+Ee.h)},G.length,St.respaceFrom));const ni=[],ii=[];return G.forEach(({bone:Ht},se)=>{const Ee=G[se-1]?.bone,Ie=G[se+1]?.bone;for(const{f:Me,kind:we}of ln.filter(ze=>ze.k===se)){const ze=Nt(se,Me),an=St.ripple?St.ripple(Ht,Me):1,{c:jn,t:Fs}=on(se,Me),ss=m(Ht,0,1,0);let _i;if(Me<.5&&Ee){const li=.5*(1-Ye(0,.5,Me));_i=[[Ee.index,li],[Ht.index,1-li]]}else if(Me>.5&&Ie){const li=.5*Ye(.5,1,Me);_i=[[Ie.index,li],[Ht.index,1-li]]}else if(Me>.5&&!Ie&&St.endBone!==void 0){const li=Ye(.5,1,Me);_i=[[St.endBone,li],[Ht.index,1-li]]}else _i=[[Ht.index,1]];se===0&&ni.length===0&&St.startWeights&&(_i=St.startWeights);const Zn={c:jn,t:Fs,u:ss,rx:ze.w*an,ry:ze.h*an,w:_i,color:()=>[0,0,0]},ks={kind:we,bone:Ht,k:se,f:Me,sec:ze,fp:0,along:0,region:"torso"};St.dress(Zn,ks);const rr=Te(_t[se].yc-_t[se].h,_t[se+1].yc-_t[se+1].h,Me),wo=jn.clone().sub(d(Ht)).dot(ss);let zs=Zn.ryBelow??Zn.ry;if(wo-zs<rr){zs=wo-rr;const li=.35*Zn.ry;zs<li&&(jn.addScaledVector(ss,li-zs),zs=li)}Zn.ryBelow=Math.max(1e-4,zs),St.after?.(Zn,ks),ni.push(Zn),ii.push(ks)}}),{rings:ni,metas:ii,sections:_t,evalSeg:on}},k=(G,St,_t)=>{G.forEach((Nt,ne)=>{const kt=ds*.5*(Nt.rx+.5*(Nt.ry+(Nt.ryBelow??Nt.ry)))/_t,Qt=ne>0?G[ne-1].c.distanceTo(Nt.c):1/0,fe=ne+1<G.length?G[ne+1].c.distanceTo(Nt.c):1/0,te=Math.min(Qt,fe);St[ne].fp=Math.max(kt,Number.isFinite(te)?te:kt)/x})},A=(G,St,_t)=>{h&&St.forEach((Nt,ne)=>{const kt=_t[ne];h.push({chain:G,kind:kt.kind,bone:kt.bone.index,part:kt.bone.part,f:kt.f,centre:rf(Nt.c),tangent:rf(Nt.t.clone().normalize()),rx:Nt.rx,ry:Nt.ry,ryBelow:Nt.ryBelow??Nt.ry,weights:Nt.w.map(([Qt,fe])=>[Qt,fe]),region:kt.region})})},v=s.torso==="segmented",D=s.torso==="annulated",q=(G,St)=>G.part!=="torso"?1:v?1-.14*Math.pow(Math.cos(Math.PI*St),8):D?1-.05*Math.pow(Math.cos(Math.PI*3*St),6):1,Q=(G,St)=>G.part!=="torso"?0:v?.55*Math.pow(Math.cos(Math.PI*St),6):D?.25*Math.pow(Math.cos(Math.PI*3*St),4):0,z=[...[...nt].reverse().map(G=>({bone:o[G],reversed:!0})),...st.map(G=>({bone:o[G],reversed:!1})),...K.map(G=>({bone:o[G],reversed:!1}))],xt=st.map(G=>o[G]),bt=xt.reduce((G,St)=>G+St.length,0),Ut=G=>{const St=new Map;let _t=0;for(const Nt of G)St.set(Nt,_t),_t+=o[Nt].length;return St},ee=G=>G.reduce((St,_t)=>St+o[_t].length,0),Rt=Ut(st),O=Ut(nt),wt=Ut(K),vt=ee(nt),At=ee(K),Gt=G=>((Rt.get(G.socketBone)??0)+G.socket[0])/Math.max(bt,1e-9),Ct=n.limbs.filter(G=>G.kind!=="wing"),pe=G=>G.length?G.reduce((St,_t)=>St+Gt(_t),0)/G.length:void 0,ge=pe(Ct.filter(G=>!G.front)),Ae=pe(Ct.filter(G=>G.front)),Bt=Ct.length>0&&(s.layout==="quadruped"||s.layout==="biped"||s.layout==="sprawled")&&!v&&!D,_e=.35*(Ct.length?Math.min(...Ct.map(G=>2*Math.abs(G.socket[2]))):0),Mt=(G,St)=>_t=>{const Nt=Math.cos(_t),ne=Math.sin(_t),kt=Nt*Nt,Qt=Ye(-.25,.35,ne),fe=Ye(.25,-.45,ne),te=.06*St.h*(1+.05*a.torso.withers)*Vo(G,.85,.09)*Math.max(0,ne)**2;let Pe=0;Ae!==void 0&&(Pe+=.08*St.w*Vo(G,Ae,.07)*kt*Qt),ge!==void 0&&(Pe+=.1*St.w*Vo(G,ge,.08)*kt*Qt),Pe-=.06*St.w*Vo(G,.25,.1)*kt*fe,tt&&(Pe+=.08*s.dimorphism*St.w*Ye(.72,.86,G)*kt*Qt);const qe=Ye(0,.06,G)*Ye(1,.9,G);return[gn(Pe,-_e,_e)*qe,te*qe]},Ot=(G,St)=>((Rt.get(G.index)??0)+St*G.length)/Math.max(bt,1e-9),Jt=(G,St)=>{if(G.part==="tail"){const _t=((O.get(G.index)??0)+(1-St)*G.length)/Math.max(vt,1e-9);return _t>.85?["tail-tip",(_t-.85)/.15]:["tail",_t/.85]}return G.part==="neck"?["neck",((wt.get(G.index)??0)+St*G.length)/Math.max(At,1e-9)]:["torso",Ot(G,St)]},$t=o[ct],qt=r.headLength,Wt=Vy(Uc(s.head),qt,r.craniumWidth,r.craniumHeight),ae=p($t,Wt.x,Wt.yc),Re=p($t,.5*qt,Wt.yc),he=v||D?b.torsoRadialBanded:b.torsoRadial,Ce=qy(s,r,et,he,x);i.begin("torso",v?"segmented trunk":D?"annulated body":"torso");const xe=gt(z,{ripple:q,extra:[ae,Re],ringsFor:G=>G.part==="torso"?D?b.torsoRingsAnnulated:b.torsoRings:G.part==="neck"?b.neckRings:b.tailRings,dress:(G,St)=>{const{bone:_t,f:Nt,sec:ne}=St,[kt,Qt]=Jt(_t,Nt);if(St.region=kt,St.along=Qt,G.region=Xe[kt],_t.part==="torso"){const te=Ot(_t,Nt);G.n=2+.3*Ye(0,.15,te)*Ye(1,.85,te),Bt&&(G.lobe=Mt(te,ne))}const fe=Q(_t,Nt);G.color=(te,Pe)=>{const qe=et(Pe,Yo(te,G.rx,G.ry,G.ryBelow),kt,Qt,St.fp);return fe?oe(qe,N.accent,fe):qe}}}),Oe=z[z.length-1].bone,$e=xe.sections[xe.sections.length-1],Ge=(G,St)=>(G+St)/2,Kn=Ge(Wt.w,Wt.h)/Math.max(1e-6,Ge($e.w,$e.h)),es=gn(Math.ceil(2*Math.abs(Math.log(Kn))/Math.log(1.12)),2,9),Sr=G=>1-(1-G)*(1-G),Er=G=>G<=.1*qt?.35*G/(.1*qt):Math.min(.7,.35+.35*(G-.1*qt)/(.12*qt)),Ns=[],wr=[],L=m($t,1,0,0),it=xe.rings[xe.rings.length-1],ft=af([{k:0,f:0,kind:"blend"},...Array.from({length:es},(G,St)=>({k:0,f:(St+1)/es,kind:"blend"}))],G=>G.f===0?it.t:G.f===1?L:xe.evalSeg(z.length,G.f).t,1).slice(1).map(G=>G.f);for(const G of ft){const St=Wt.x*G,_t=G===1,{c:Nt,t:ne}=xe.evalSeg(z.length,G),kt=Sr(G),Qt=$e.w*(Wt.w/$e.w)**kt,fe=$e.h*(Wt.h/$e.h)**kt,te=Er(St),Pe=_t?m($t,0,1,0):m(Oe,0,1,0).lerp(m($t,0,1,0),G).normalize(),qe={c:_t?ae.clone():Nt,t:_t?m($t,1,0,0):ne,u:Pe,rx:_t?Wt.w:Qt,ry:_t?Wt.h:fe,w:[[Oe.index,1-te],[$t.index,te]],color:()=>[0,0,0]},ye=G<.5?"neck":Ce.region(St),on=G<.5?1:Ce.along(St),ln={kind:"blend",bone:$t,k:z.length,f:G,sec:{w:Qt,h:fe,yc:0},fp:0,along:on,region:ye};qe.region=Xe[ye],_t?qe.color=Ce.col(St,Wt.w,Wt.h):qe.color=(ni,ii)=>{const Ht=Yo(ni,qe.rx,qe.ry),se=1-.12*Math.sin(Math.PI*G)*Ye(.1,-.7,Ht);return je(et(ii,Ht,ye,on,ln.fp),se)},Ns.push(qe),wr.push(ln)}const at=[...xe.rings,...Ns],Z=[...xe.metas,...wr];Ny(at,!0);const Ft=xe.rings.length-1;if(at.slice(Ft,-1).some((G,St)=>zh(G,at[Ft+St+1]))){_=!0;const G=at[Ft].t.clone().normalize(),St=at[at.length-1].t.clone().normalize(),_t=[0];for(let Qt=Ft+1;Qt<at.length;Qt++)_t.push(_t[_t.length-1]+at[Qt].c.distanceTo(at[Qt-1].c));const Nt=_t[_t.length-1]||1,ne=new fn().setFromUnitVectors(G,St),kt=new fn;for(let Qt=Ft+1;Qt<at.length-1;Qt++)at[Qt].t=G.clone().applyQuaternion(kt.clone().slerp(ne,Ye(0,1,_t[Qt-Ft]/Nt)))}k(at,Z,he);const Yt=Oy(at,he,G=>Z[G].region==="torso"&&Z[G+1].region==="torso");Yt.sort();const ie=Yt.length?Yt[Yt.length>>1]:0;yt&&(Dt.cell=ie/x);const Zt=go[P.pattern];if(Zt>0&&P.pattern!=="roan"&&ie>0){const G=x/(4.32*Zt*ie);P.scale>G&&(P={...P,scale:G})}yt&&(Object.freeze(P),Et&&Object.freeze(Et)),vn(i,at,he,nt.length?.25:.85,.25,2),A("axial",at,Z),i.end();const le={eyeMul:j,speciesBodyLength:Xy(s,a),fallbacks:0,eyes:[],colours:{eye:[...N.eye],iris:null,lidFactor:.35}},Xt=Yy(i,n,$t,N,p,m,Ce,Wt,Ns[Ns.length-1].w,Y,et,le);if(rt.length){i.begin("trunk","trunk"),i.region=Xe.muzzle;const G=rt.map(ne=>({bone:o[ne],reversed:!1})),St=Xt?cf*Math.max(Xt.rx,Xt.ry):0,_t=gt(G,{ringsFor:()=>4,respaceFrom:St,startWeights:[[ct,.7],[rt[0],.3]],dress:(ne,kt)=>{kt.region="muzzle",kt.along=1,ne.region=Xe.muzzle;const Qt=lf[0]*Math.pow(Math.sin(Math.PI*lf[1]*kt.f),6);ne.color=(fe,te)=>oe(et(te,Yo(fe,ne.rx,ne.ry,ne.ryBelow),"muzzle",1,kt.fp),N.accent,Qt)}});let Nt=_t.rings;if(k(_t.rings,_t.metas,Zr),Xt){Nt=[Xt,..._t.rings.slice(1)];const ne=cf*Math.max(Xt.rx,Xt.ry);let kt=1,Qt=0;for(;kt<Nt.length-2&&(Qt+=Nt[kt].c.distanceTo(Nt[kt-1].c))<ne;)kt++;if(Qt<ne){Qt=0;for(let Pe=1;Pe<Nt.length;Pe++){Qt+=Nt[Pe].c.distanceTo(Nt[Pe-1].c);const qe=1-Ye(0,ne,Qt),ye=Nt[Pe];if(qe<=0)break;ye.c=ye.c.clone().lerp(Xt.c.clone().addScaledVector(Xt.t.clone().normalize(),Qt),qe*qe),ye.t=ye.t.clone().normalize().lerp(Xt.t.clone().normalize(),qe).normalize(),ye.u=ye.u.clone().lerp(Xt.u,qe).normalize();const on=ye.ryBelow??ye.ry;ye.rx=Te(ye.rx,Xt.rx,qe),ye.ry=Te(ye.ry,Xt.ry,qe),ye.ryBelow=Te(on,Xt.ryBelow??Xt.ry,qe)}}else if(kt>1){const Pe=Xt.c,qe=Xt.t.clone().normalize(),ye=Nt[kt].c,on=Nt[kt].t.clone().normalize(),ln=Pe.distanceTo(ye),ni=(Me,we)=>{const ze=Me*Me,an=ze*Me;return we.copy(Pe).multiplyScalar(2*an-3*ze+1).addScaledVector(qe,jy*ln*(an-2*ze+Me)).addScaledVector(ye,-2*an+3*ze).addScaledVector(on,ln*(an-ze))},ii=64,Ht=[0],se=be(),Ee=ni(0,be());for(let Me=1;Me<=ii;Me++)ni(Me/ii,se),Ht.push(Ht[Me-1]+se.distanceTo(Ee)),Ee.copy(se);const Ie=Me=>{const we=Me*Ht[ii];let ze=1;for(;ze<ii&&Ht[ze]<we;)ze++;return(ze-1+(we-Ht[ze-1])/Math.max(1e-12,Ht[ze]-Ht[ze-1]))/ii};for(let Me=1;Me<kt;Me++){const we=Me/kt,ze=Ie(we),an=Nt[Me],jn=1-Ye(0,1,we);an.c=ni(ze,be()),an.t=ni(Math.min(1,ze+.001),be()).sub(ni(Math.max(0,ze-.001),be())).normalize(),an.u=an.u.clone().lerp(Xt.u,jn).normalize();const Fs=an.ryBelow??an.ry;an.rx=Te(an.rx,Xt.rx,jn),an.ry=Te(an.ry,Xt.ry,jn),an.ryBelow=Te(Fs,Xt.ryBelow??Xt.ry,jn)}}const fe=Zy*Math.max(Xt.rx,Xt.ry);let te=0;for(let Pe=0;te<Nt.length-3&&Pe<fe;te++)Pe+=Nt[te+1].c.distanceTo(Nt[te].c);kc(i,Xt,he,-1,j0),te>0&&vn(i,Nt.slice(0,te+1),he,0,0),Fy(i,Nt[te],he,Nt[te+1],Zr),vn(i,Nt.slice(te+1),Zr,0,0)}else vn(i,Nt,Zr,.2,0);A("trunk",Nt,_t.metas),t2(i,Nt[Nt.length-1],o[rt[rt.length-1]],N,p,m,(ne,kt)=>et(ne,kt,"muzzle",1)),i.end()}if(nt.length){const G=o[nt[nt.length-1]],St=p(G,G.length),_t=m(G,1,0,0),Nt=m(G,0,1,0),ne=m(G,0,0,1);if(i.begin("tail-tip",s.tail),i.region=Xe["tail-tip"],s.tail==="tufted"&&Fn(i,St.clone().addScaledVector(_t,G.end.h*2),[_t,Nt,ne],[Math.max(G.length*.9,G.end.h*4),G.end.h*2.6,G.end.h*2.6],f(G.index),(kt,Qt,fe)=>oe(oe(et(fe,Math.sin(kt),"tail-tip",1),N.accent,.75),N.keratin,.4+.2*Math.sin(kt*5+Qt*9)),10,6),s.tail==="club"){const kt=Math.max(G.end.h*2.4,g*.05);Fn(i,St.clone().addScaledVector(_t,kt*.6),[_t,Nt,ne],[kt*1.1,kt*.8,kt*1.3],f(G.index),()=>N.horn,12,7);for(const Qt of[-1,1])Fn(i,St.clone().addScaledVector(_t,kt*.6).addScaledVector(ne,Qt*kt*1.2),[_t,Nt,ne],[kt*.55,kt*.45,kt*.5],f(G.index),()=>N.horn,8,4)}if(s.tail==="feather-fan"){const kt=k0(s,g),Qt=Math.max(5,9+a.countScale.feather);for(let fe=0;fe<Qt;fe++){const te=Te(-.75,.75,fe/(Qt-1)),Pe=_t.clone().multiplyScalar(Math.cos(te)).addScaledVector(ne,Math.sin(te)).normalize(),qe=be().crossVectors(Nt,Pe).normalize(),ye=kt*(1-.18*Math.abs(te))*(1+.24*Y.jv*(jo(Y.featherSeed,fe,0)-.5)),on=kt*.11;q0(i,St.clone().addScaledVector(Nt,.004*fe*kt/Qt),Pe,qe,[[-.02*ye,0],[.3*ye,-on*.5],[.85*ye,-on*.55],[ye,0],[.85*ye,on*.55],[.3*ye,on*.5]],kt*.012,f(G.index),ln=>oe(N.accent,N.keratin,Ye(.7,1,ln/ye)*.7))}}i.end()}const de=(G,St)=>{const _t=z.findIndex(kt=>kt.bone.index===G.index),Nt=_t>0?z[_t-1].bone:void 0,ne=_t>=0?z[_t+1]?.bone:void 0;if(St<.5&&Nt){const kt=.5*(1-Ye(0,.5,St));return[[Nt.index,kt],[G.index,1-kt]]}if(St>.5&&ne){const kt=.5*Ye(.5,1,St);return[[ne.index,kt],[G.index,1-kt]]}return[[G.index,1]]},Le=at.map(xo),Ke=be(),_n=(G,St,_t)=>{Ke.copy(_t).sub(G.c);const Nt=Ke.dot(St.v),ne=Ke.dot(St.u),kt=G.n??2,Qt=ne<0?G.ryBelow??G.ry:G.ry;return(Math.abs(Nt/G.rx)**kt+Math.abs(ne/Qt)**kt)**(1/kt)},pn=at.slice(0,-1).map((G,St)=>{const _t=at[St+1];return{c:G.c.clone().add(_t.c).multiplyScalar(.5),r2:(.5*G.c.distanceTo(_t.c)+2.5*Math.max(G.rx,G.ry,G.ryBelow??G.ry,_t.rx,_t.ry,_t.ryBelow??_t.ry))**2}}),sn=pn.map((G,St)=>St),Dn=(G,St=sn)=>{let _t=1/0;for(const Nt of St){if(G.distanceToSquared(pn[Nt].c)>pn[Nt].r2)continue;const ne=at[Nt],kt=at[Nt+1],Qt=Ke.copy(G).sub(ne.c).dot(Le[Nt].t),fe=Ke.copy(G).sub(kt.c).dot(Le[Nt+1].t);if(Qt<0||fe>0)continue;const te=Qt/Math.max(1e-12,Qt-fe);_t=Math.min(_t,(1-te)*_n(ne,Le[Nt],G)+te*_n(kt,Le[Nt+1],G))}return _t},ue=be(),Gi=(G,St,_t=1/0)=>{const Nt=xo(G),ne=1.5*Math.max(G.rx,G.ry,G.ryBelow??G.ry),kt=sn.filter(fe=>{const te=Math.sqrt(pn[fe].r2)+ne;return G.c.distanceToSquared(pn[fe].c)<=te*te});let Qt=0;for(let fe=0;fe<St&&Qt<=_t;fe++)Qt=Math.max(Qt,Dn(xa(G,Nt,ds*fe/St,ue),kt));return Qt},We=(G,St,_t,Nt)=>{const ne=_t==="leg"&&s.legs==="arthropod",kt=_t==="arm"?b.armRadial:ne?b.legRadialArthropod:b.legRadial,Qt=_t==="arm"?b.armRings:ne?b.legRingsArthropod:b.legRings,fe=St[0],te=o[G.socketBone],Pe=_t==="leg"?o[G.bones[G.bones.length-1]]:void 0,qe=St.slice(1).reduce((ce,Be)=>ce+Be.length,0),ye=new Map;{let ce=0;for(const Be of St.slice(1))ye.set(Be.index,ce),ce+=Be.length}const on=d(fe),ln=m(fe,1,0,0),ni=u(te).invert(),ii=d(te),Ht=gn(on.clone().sub(ii).dot(m(te,1,0,0)),0,te.length),se=Ht/Math.max(te.length,1e-9),Ee={w:Te(te.start.w,te.end.w,se),h:Te(te.start.h,te.end.h,se),yc:Te(te.start.yc,te.end.yc,se)},Ie=ce=>ce.clone().sub(ii).applyQuaternion(ni),Me=ce=>{const Be=Ie(on.clone().addScaledVector(ln,ce)),Je=(Be.y-Ee.yc)/Ee.h,tn=Be.z/Ee.w;return Je*Je+tn*tn<1};let we=0;if(Me(0)){let Be=0,Je=fe.length;for(let tn=1;tn<=32;tn++){const hn=fe.length*tn/32;if(!Me(hn)){Je=hn;break}Be=hn}for(let tn=0;tn<24;tn++){const hn=(Be+Je)/2;Me(hn)?Be=hn:Je=hn}we=Je}const ze=Ie(on.clone().addScaledVector(ln,we)),an=be(0,(ze.y-Ee.yc)/(Ee.h*Ee.h),ze.z/(Ee.w*Ee.w)).applyQuaternion(u(te)).normalize(),jn=ce=>{const Be=Ie(ce),Je=(Be.y-Ee.yc)/(Ee.h*Ee.h),tn=Be.z/(Ee.w*Ee.w),hn=Math.hypot(Je,tn);return hn>1e-12?Je/hn:0},Fs=gn(we/fe.length,0,.9),ss=fe.start,_i=fe.end,Zn=Math.max(1e-4,Te((ss.w+ss.h)/2,(_i.w+_i.h)/2,Fs)),ks=Math.max(.35,Math.abs(ln.dot(an))),rr=we-.3*Zn/ks,wo=Math.max(rr+.6*Zn,we+.1*Zn),zs=gn(wo/fe.length,.01,.45),li=Math.abs(G.socket[2])*.9,_p=Ee.w*1.05-Math.abs(Ie(on).z),bp=.35*Math.max(2*Math.abs(G.socket[2]),1e-6),Mp=_t==="leg"&&(s.legs==="unguligrade"||s.legs==="digitigrade"),_u=new WeakMap,bu=(ce,Be,Je,tn,hn,Tn,bi)=>{let En=_u.get(ce);if(!En){const Gc=ce.t.clone().normalize(),wu=ce.u.clone().addScaledVector(Gc,-ce.u.dot(Gc)).normalize();En={u:wu,v:be().crossVectors(wu,Gc)},_u.set(ce,En)}const ui=Wy(Tn,ce.rx,ce.ry,ce.ryBelow),si=Yo(Tn,ce.rx,ce.ry,ce.ryBelow),Hn=En.v.z*ui+En.u.z*si,Di=En.v.y*ui+En.u.y*si,gs=-G.side*Hn;let Mi=gn(.35-.9*gs+.5*Di,-1,1);hn>0&&(Mi=Te(Mi,jn(bi),hn));const Eu=et(bi,Mi,Be,Je,tn);return ne&&s.palette==="ink"?oe(Eu,N.accent,.85):Eu},ba=gt(St.map(ce=>({bone:ce,reversed:!1})),{ringsFor:()=>Qt,endBone:Pe?.index,rootF:zs,dress:(ce,Be)=>{const{bone:Je,f:tn,sec:hn}=Be,Tn=St.indexOf(Je),bi=Tn===0?"limb-upper":"limb-lower",En=Tn===0?tn:((ye.get(Je.index)??0)+tn*Je.length)/Math.max(qe,1e-9);Be.region=bi,Be.along=En,ce.region=Xe[bi];let ui=1;ne||(Tn===0&&(ui+=.45*(1-Ye(.25,.75,tn))),Tn===1&&(ui+=.12*Vo(tn,.45,.15)),Tn>=1&&(ui+=(s.legs==="pillar"?.04:.12)*(1-Ye(.03,.14,tn))));let si=Math.min(hn.w*(1+.8*(ui-1)),hn.w+bp);const Hn=hn.h*ui;Tn===0&&(si=Math.min(si,Math.max(hn.w,_p))),Tn===0&&Math.abs(m(Je,0,0,1).z)>.7&&Math.abs(m(Je,1,0,0).y)>.6&&(si=Math.min(si,Math.max(li,.55*hn.w))),ce.rx=si,ce.ry=Hn,ce.ryBelow=Hn;const Di=Tn===0?1-Ye(0,.3,tn):0;ce.color=(gs,Mi)=>bu(ce,bi,En,Be.fp,Di,gs,Mi)},after:(ce,Be)=>{Mp&&St.indexOf(Be.bone)>=1&&(ce.rx=(ce.ry+(ce.ryBelow??ce.ry))/(2*1.3))}}),hi=ba.rings[0],vp=ba.metas[0],Mu=an.clone().addScaledVector(hi.t,-an.dot(hi.t)),Ma=Mu.lengthSq()>.01?Mu.normalize():void 0,yp=de(te,se),vu=[],yu=[],Sp=[[0,1,.18],[1/3,.7,.12],[2/3,.35,.06]],Ep=(ce,Be)=>{const Je={c:on.clone().addScaledVector(ln,ce),t:ln.clone(),u:hi.u.clone(),rx:hi.rx*Be,ry:hi.ry*Be,ryBelow:(hi.ryBelow??hi.ry)*Be,w:[],color:()=>[0,0,0]};return Ma&&(Je.squash=[Ma,.4]),Je};let Tr=rr,va=1.15;if(Number.isFinite(Dn(on.clone().addScaledVector(ln,rr)))){const ce=(Je,tn)=>Gi(Ep(Je,tn),kt,.96)<=.96;let Be=0;for(;Be<8&&!ce(Tr,va);)Be++,Tr=rr-Be*.15*Zn;if(!ce(Tr,va)){let Je=.3,tn=1.15;for(let hn=0;hn<8;hn++){const Tn=(Je+tn)/2;ce(Tr,Tn)?Je=Tn:tn=Tn}va=Je}}for(const[ce,Be,Je]of Sp){const tn=ce===0?va:Te(1.15,1,ce),hn=on.clone().addScaledVector(ln,Tr).lerp(hi.c,ce),Tn=ln.clone().lerp(hi.t,ce).normalize(),bi=[...yp.map(([si,Hn])=>[si,Hn*Be]),[fe.index,1-Be]],En={c:hn,t:Tn,u:hi.u.clone(),rx:hi.rx*tn,ry:hi.ry*tn,ryBelow:(hi.ryBelow??hi.ry)*tn,w:bi,region:Xe["limb-upper"],color:()=>[0,0,0]};Ma&&(En.squash=[Ma,.4*(1-ce)]);const ui={kind:"root",bone:fe,k:0,f:Te(Tr,wo,ce)/fe.length,sec:vp.sec,fp:0,along:0,region:"limb-upper"};En.color=(si,Hn)=>je(bu(En,"limb-upper",0,ui.fp,1,si,Hn),1-Je*(.5+.5*Ye(.2,-.6,jn(Hn)))),vu.push(En),yu.push(ui)}const Ar=[...vu,...ba.rings],Su=[...yu,...ba.metas],wp=m(te,0,0,1);for(const ce of Ar){const Be=Dn(ce.c);if(!(Be<1)||Gi(ce,kt,.97)<=.97)continue;const Je=Ie(ce.c).z,tn=wp.clone().multiplyScalar(-Math.sign(Je)||0),hn=ce.c.clone(),Tn=ce.rx,bi=(Hn,Di)=>(ce.c.copy(hn).addScaledVector(tn,Hn),ce.rx=Tn*Di,Gi(ce,kt,.97)<=.97);let En=.8*Math.abs(Je),ui=1;if(bi(En,1)){let Hn=0,Di=En;for(let gs=0;gs<8;gs++){const Mi=(Hn+Di)/2;bi(Mi,1)?Di=Mi:Hn=Mi}En=Di}else if(bi(En,.5)){let Hn=.5,Di=1;for(let gs=0;gs<8;gs++){const Mi=(Hn+Di)/2;bi(En,Mi)?Hn=Mi:Di=Mi}ui=Hn}else{ce.c.copy(hn),ce.rx=Tn;continue}const si=Be<.9?1:(1-Be)/.1;ce.c.copy(hn).addScaledVector(tn,En*si),ce.rx=Tn*Te(1,ui,si)}k(Ar,Su,kt);const Tp=e&&_t==="leg"&&["pad","hoof","claw"].includes(s.feet);return vn(i,Ar,kt,.1,Tp?0:_t==="arm"?.3:.4),A(Nt,Ar,Su),{ring:Ar[Ar.length-1],radial:kt}};for(const G of n.limbs){const St=o[G.socketBone],_t=`${G.side<0?"L":"R"}`;if(G.kind==="leg"){const Nt=`leg ${G.pair+1}${_t}`;i.begin("leg",Nt),i.region=Xe["limb-upper"];const ne=i.nv,kt=o[G.bones[G.bones.length-1]],Qt=We(G,G.bones.slice(0,G.segments.length).map(Pe=>o[Pe]),"leg",Nt);i.end(),i.begin("foot",`${s.feet} ${G.pair+1}${_t}`),i.region=Xe.foot;const fe=i.nv,te=Pe=>et(Pe,0,"foot",1);if(e&&(s.feet==="pad"||s.feet==="hoof"||s.feet==="claw")?b2(i,s.feet,kt,G.footHeight,G.footLength,G.side,Qt,N,p,m,te,n.phenotype?.dimensions):M2(i,s.feet,kt,o[G.bones[G.bones.length-2]],G.footHeight,G.footLength,G.side,N,p,m,te),n.phenotype&&s.feet==="paw"){const Pe=d(kt),qe=m(kt,0,0,1),ye=be();let on=1/0,ln=-1/0;for(let Ht=fe;Ht<i.nv;Ht++){const se=ye.fromArray(i.p,Ht*3).sub(Pe).dot(qe);on=Math.min(on,se),ln=Math.max(ln,se)}const ni=n.phenotype.dimensions.footWidth/(ln-on),ii=(on+ln)/2;for(let Ht=fe;Ht<i.nv;Ht++){ye.fromArray(i.p,Ht*3);const se=ye.clone().sub(Pe).dot(qe);ye.addScaledVector(qe,(se-ii)*ni-se),i.p.set([ye.x,ye.y,ye.z],Ht*3)}}i.end(),_2(i,ne,kt,G.footHeight,G.footExtent)}else G.kind==="arm"?(i.begin("arm",`arm ${_t}`),i.region=Xe["limb-upper"],We(G,G.bones.slice(0,2).map(Nt=>o[Nt]),"arm",`arm ${_t}`),i.end(),i.begin("hand",`${s.hands} ${_t}`),i.region=Xe.foot,v2(i,s.hands,o[G.bones[1]],o[G.bones[2]],o[G.bones[3]],G.side,N,p,m,Nt=>et(Nt,0,"foot",1)),i.end()):(i.begin("wing",`${s.wings} wing ${_t}`),i.region=Xe.wing,y2(i,n,G.bones.map(Nt=>o[Nt]),St,G.side,N,p,m,(Nt,ne)=>et(Nt,.6,"wing",ne)),i.end())}s.armor!=="none"&&(i.begin("armor",s.armor),i.region=Xe.armor,S2(i,n,N,p,m,c,Y),i.end()),i.end();const Yn=new Float32Array(i.p.subarray(0,i.nv*3)),Pi=i.c.slice(0,i.nv*3),ns=i.si.slice(0,i.nv*4),ps=i.sw.slice(0,i.nv*4),Qe=i.ix.slice(0,i.ni),wn=i.rg.slice(0,i.nv),is=i.gl.slice(0,i.nv),mn={...P,scale:H},Os=Lt?{version:Ty,pattern:Lt,code:sf.indexOf(Lt)+1,genome:mn,seed:Cv(mn.seed)>>>0,cellsPerBody:go[Lt]*mn.scale,threshold:mn.threshold,warp:mn.warp,bellyLine:mn.bellyLine,frame:{origin:[mt.x,mt.y],forward:[ot.x,ot.y],scale:x,...n.phenotype?{phase:Pt,lateral:U}:{}}}:null;let ms=null;if(Lt){const G=new Float32Array(i.nv*4);for(let St=0;St<i.nv;St++){if(i.own[St]){for(let ne=0;ne<4;ne++)G[St*4+ne]=i.cq[St*6+ne];continue}const _t=i.p[St*3]-mt.x,Nt=i.p[St*3+1]-mt.y;G[St*4]=(_t*ot.x+Nt*ot.y)/x+Pt,G[St*4+1]=(Nt*ot.x-_t*ot.y)/x,G[St*4+2]=i.p[St*3+2]/x*U,G[St*4+3]=0}ms={c0:i.l0.slice(0,i.nv*3),c1:i.l1.slice(0,i.nv*3),c2:i.l2.slice(0,i.nv*3),sample:G}}const _a=Iy(Yn,Qe,ns,ps,i.hid.subarray(0,i.ni/3),Dy(i.parts,Qe,i.nv)),xu={version:e?wy:Ey,positions:Yn,normals:_a,colors:Pi,skinIndex:ns,skinWeight:ps,index:Qe,regions:wn,gloss:is,eyeFallbacks:le.fallbacks,parts:i.parts,vertexCount:Yn.length/3,triangleCount:Qe.length/3,coatScale:{pattern:P.pattern,requested:H,effective:P.scale},coatCrisp:Os,coatLayers:ms};return t.debug&&(xu.debug={rings:h,splineFallbacks:M,coat:{pattern:P.pattern,requestedScale:H,effectiveScale:P.scale,cellsPerBody:Zt,meanCellDiameter:Zt>0?x/(Zt*P.scale):1/0,torsoEdgeEstimate:ie},traitsNeutral:a.neutral,coatVertex:Lt?{own:i.own.slice(0,i.nv),sample:i.cq.slice(0,i.nv*6)}:null,hiddenTriangles:i.hid.slice(0,i.ni/3),blendUnfolded:_,eyes:le.eyes,eyeColours:{eye:le.colours.eye,iris:le.colours.iris,lidFactor:le.colours.lidFactor,compound:le.colours.compound??null}}),xu}function Xy(n,t){if(t.neutral)return n.bodyLength;const e=n.variability,i=n.dimorphism,s=n.maturity,r=(1+.045*e*t.size)*(t.sex==="male"?1+.1*i:1)*(.45+.55*s);return Math.round(n.bodyLength/r*100)/100}const Tc=[.008,.008,.01],bn=n=>.2126*n[0]+.7152*n[1]+.0722*n[2],Kr=Object.freeze({min:.03,overSkin:2,tint:[.36,.13,.05]}),Y0=Object.freeze({overPupil:10,overLid:1.8,maxIrisGain:4,lid:.35,outerLid:.7});function qy(n,t,e,i,s){const r=Uc(n.head),o=t.headLength,a=t.snoutLength,l=r==="muzzle"||r==="jaws"?.4*o:1/0,c=m=>m>=l?"muzzle":"head",u=r==="flat-face"?o+a:.4*o+a,d=m=>m>=l?gn((m-l)/Math.max(a,.001),0,1):gn(m/u,0,1);return{region:c,along:d,col:(m,g,x)=>{const f=c(m),h=d(m),M=ds*.5*(g+x)/i/s;return(_,b)=>e(b,Yo(_,g,x),f,h,M)},radial:i}}function Yy(n,t,e,i,s,r,o,a,l,c,u,d){const p=t.recipe,m=t.dims,g=m.headLength,x=m.craniumWidth,f=m.craniumHeight,h=m.snoutLength,M=c.traits,_=Uc(p.head),b=ru(p);let S=null;const y=r(e,1,0,0),E=r(e,0,1,0),R=r(e,0,0,1),w=[[e.index,1]],T=o.radial,C=(N,tt,$,ut,st)=>({c:s(e,N,ut),t:y,u:E,rx:tt,ry:$,w,color:st??o.col(N,tt,$),region:Xe[o.region(N)]}),I=()=>({...C(a.x,a.w,a.h,a.yc),w:l}),F=n.parts.length,V=je(i.skin,.22),Y=oe(i.skin,[0,0,0],.7);n.begin("head",p.head),n.region=Xe.head;let P=.4*g+h,H=-.2*f,W=.5*f;const j=t.phenotype?t.phenotype.dimensions.earLength/(g*(p.head==="proboscis"?Bh.length:.34)):M.earScale;if(p.head==="proboscis"){const N=O0("proboscis",{headLength:g,craniumWidth:x,craniumHeight:f,snoutLength:h}),tt=t.chains.trunk[0],$=N.x-.4*g,ut=tt!==void 0?[[e.index,.7],[tt,.3]]:w,st=[I(),C(.36*g,.92*x,.9*f,-.04*f)],nt=4;for(let K=1;K<=nt;K++){const ct=K/nt,rt=1-(1-ct)**4,pt=C(.4*g+$*ct,Te(.84*x,N.w,rt),Te(.86*f,N.h,rt),Te(-.06*f,N.y,rt));K===nt&&(pt.w=ut),st.push(pt)}vn(n,st,T,.2,tt!==void 0?0:.45,1),tt!==void 0&&(S=st[st.length-1],kc(n,S,T,1,j0)),P=N.x,H=N.y,W=N.h,n.begin("head",`${p.head} ears`),n.region=Xe.ear;for(const K of j>0?[-1,1]:[]){const ct=Bh.flare*Math.PI/180,rt=y.clone().multiplyScalar(Math.cos(ct)).addScaledVector(R,-K*Math.sin(ct)).normalize(),pt=R.clone().multiplyScalar(K*Math.cos(ct)).addScaledVector(y,Math.sin(ct)).normalize(),X=s(e,.02*g,.4*f,K*.9*x).addScaledVector(rt,.06*g*j).addScaledVector(E,-.1*g*j).addScaledVector(pt,-.02*g*j);Qy(n,X,rt.clone().negate(),E,pt,g*j,w,(lt,J)=>oe(u(J,.4,"ear",lt),i.skin,.2))}n.begin("mouth","lower lip"),n.region=Xe.muzzle,Fn(n,s(e,N.x-.05*g,N.y-N.h+.02*f,0),[y,E,R],[.12*g,.08*f,.28*x],w,()=>oe(i.skin,[0,0,0],.45),8,4)}else if(_==="muzzle"||_==="jaws"){const N=_==="jaws",tt=N?.82:1,$=[I(),C(.36*g,.92*x,.88*f*tt,-.06*f)],ut=4;for(let nt=1;nt<=ut;nt++){const K=nt/ut,ct=.4*g+h*K,rt=Te(.8,N?.5:.48,K)*x,pt=Te(.82,N?.36:.52,K)*f,X=o.col(ct,rt,pt),lt=(J,mt)=>{const ot=X(J,mt);return Math.abs(Math.sin(J)+(N?.25:.35))<(N?.07:.05)&&Math.abs(Math.cos(J))>.5?i.keratin:N?ot:K>.75?oe(ot,i.skin,.6):ot};$.push(C(ct,rt,pt,Te(-.08,N?-.12:-.24,K)*f,lt))}const st=n.ni/3;if(vn(n,$,T,.2,N?.55:.45,1),H=(N?-.12:-.24)*f,W=(N?.36:.52)*f,n.region=Xe.muzzle,!N){const nt=Ol(n,e,st,n.ni/3);n.begin("head",`${p.head} nostrils`),n.region=Xe.muzzle;for(const K of[-1,1]){const ct=H+.15*f,rt=K*.18*x,pt=$r(nt,[P,ct,rt],[1,0,0]),X=(pt?pt.point[0]:P+.035*g)-.03*g+e2*g;Fn(n,s(e,X,ct,rt),[y,E,R],[.03*g,.06*f,.06*x],w,()=>V,6,3)}}if(N)for(const nt of[-1,1])for(let K=0;K<6;K++){const ct=.15+.13*K,rt=.4*g+h*ct,pt=Te(.8,.5,ct)*x*.93,X=Te(-.08,-.12,ct)*f-Te(.82,.36,ct)*f*.25;An(n,[s(e,rt,X,nt*pt),s(e,rt+.01*g,X-.07*f,nt*pt*.97)],[.028*f,.004*f],[w,w],()=>[.92,.9,.82],5,.2,.1)}if(!N){const nt=b.built==="ossicones"||b.built==="paired";n.begin("head",`${p.head} ears`),n.region=Xe.ear;for(const K of j>0?[-1,1]:[]){const ct=nt?s(e,-.06*g,.55*f,K*.62*x):s(e,.04*g,.75*f,K*.55*x),rt=nt?E.clone().multiplyScalar(.45).addScaledVector(R,K*.85).addScaledVector(y,-.25).normalize():E.clone().multiplyScalar(.8).addScaledVector(R,K*.6).addScaledVector(y,-.25).normalize();Fn(n,ct.clone().addScaledVector(rt,.16*g*j),[rt,y.clone().negate(),R],[.18*g*j,.03*g*j,.09*g*j],w,(pt,X,lt)=>oe(u(lt,.4,"ear",X),i.skin,.25),8,4)}}}else if(_==="beak"){vn(n,[I(),C(.4*g,.62*x,.66*f,.02*f)],T,.2,.3,1);const N=Math.max(h,.15*g),tt=6,$=[],ut=[];for(let st=0;st<=tt;st++){const nt=st/tt,K=.36*g+N*nt,ct=N<.35*g?Ye(.6,1,nt)*.18:0;$.push(C(K,Te(.55,.06,Math.pow(nt,.8))*x,Te(.42,.05,Math.pow(nt,.9))*f,(.08-.12*nt-ct)*f,()=>i.keratin)),nt<=.85&&ut.push(C(K,Te(.45,.08,nt/.85)*x,Te(.22,.04,nt/.85)*f,(-.3-.02*nt)*f,()=>oe(i.keratin,[0,0,0],.25)))}n.region=Xe.muzzle;for(const st of[...$,...ut])st.region=Xe.muzzle;vn(n,$,12,.2,.3),vn(n,ut,10,.2,.3),P=.36*g+N,H=-.05*f,W=.1*f}else if(_==="flat-face"){const N=K=>(ct,rt)=>Math.sin(ct)<.2?i.skin:K(ct,rt);vn(n,[I(),C(.4*g,.86*x,.86*f,-.02*f,N(o.col(.4*g,.86*x,.86*f))),C(.48*g,.55*x,.5*f,-.1*f,()=>i.skin)],T,.2,.45,1);const tt=Math.max(.05*g,h*.6),$=K=>Math.abs(Math.sin(K)+.38)<.07?je(i.keratin,.5):i.skin,ut=n.ni/3;vn(n,[C(.36*g,.55*x,.45*f,-.4*f,$),C(.36*g+tt,.42*x,.34*f,-.42*f,$)].map(K=>({...K,region:Xe.muzzle})),14,.3,.6);const st=Ol(n,e,ut,n.ni/3),nt=$r(st,[.36*g,-.2*f,0],[1,0,0]);n.region=Xe.muzzle,Fn(n,s(e,(nt?nt.point[0]:.36*g+tt)-.02*g,-.2*f,0),[y,E,R],[.05*g,.05*f,.12*x],w,()=>je(i.skin,.6),10,3),n.region=Xe.head,n.begin("head",`${p.head} brow`),Fn(n,s(e,.42*g,.32*f,0),[y,E,R],[.08*g,.09*f,.9*x],w,()=>oe(i.base,i.keratin,.3),12,4),n.begin("head",`${p.head} ears`),n.region=Xe.ear;for(const K of[-1,1])Fn(n,s(e,.12*g,0,K*.96*x),[y,E,R],[.08*g*j,.2*f*j,.05*x*j],w,()=>i.skin,8,4);P=.36*g+tt,H=-.42*f,W=.34*f}else if(_==="blunt"){const N=.6*g+h*.3,tt=o.col(N,.75*x,.75*f),$=n.ni/3;vn(n,[I(),C(N,.75*x,.75*f,0,(rt,pt)=>oe(tt(rt,pt),i.skin,.5))],T,.2,.75,1);const ut=Ol(n,e,$,n.ni/3);n.begin("mouth","mouth disc"),n.region=Xe.muzzle;const st=4,nt=20,K=n2*g,ct=(rt,pt)=>{if(vc(p)===1&&M.neutral){const ot=$r(ut,[N,rt,pt],[1,0,0]);if(!ot)return s(e,N+.72*x+K,rt,pt);const Pt=ot.normal[0]<0?-1:1;return s(e,ot.point[0]+Pt*ot.normal[0]*K,ot.point[1]+Pt*ot.normal[1]*K,ot.point[2]+Pt*ot.normal[2]*K)}Math.abs(pt)<1e-12*g&&(pt=0);const X=ga(ut,[N,rt,pt],[1,0,0]).filter(ot=>ot.t>1e-9),lt=X[0],J=lt?X.filter(ot=>Math.abs(ot.t-lt.t)<=1e-9).sort((ot,Pt)=>ot.tri-Pt.tri)[0]:null;if(!J)return s(e,N+.72*x+K,rt,pt);const mt=J.normal[0]<0?-1:1;return s(e,J.point[0]+mt*J.normal[0]*K,J.point[1]+mt*J.normal[1]*K,pt===0?0:J.point[2]+mt*J.normal[2]*K)};if(vc(p)===1){const rt=n.v(ct(0,0),Y,w),pt=[];for(let X=1;X<=st;X++){const lt=X/st,J=[];for(let mt=0;mt<nt;mt++){const ot=ds*mt/nt;J.push(n.v(ct(Math.sin(ot)*.32*f*lt,Math.cos(ot)*.32*x*lt),Y,w))}pt.push(J)}for(let X=0;X<nt;X++)n.to(rt,pt[0][X],pt[0][(X+1)%nt],y);for(let X=0;X+1<st;X++)for(let lt=0;lt<nt;lt++){const J=pt[X][lt],mt=pt[X][(lt+1)%nt],ot=pt[X+1][lt],Pt=pt[X+1][(lt+1)%nt];n.to(J,ot,mt,y),n.to(mt,ot,Pt,y)}}else{const rt=$0,pt=rt.halfWidth*x,X=rt.columns,lt=[],J=(yt,Dt)=>oe(tt(Math.asin(gn(yt/(.75*f),-1,1)),Dt),i.skin,.5),mt=(yt,Dt,It,ht)=>{const Vt=ct(yt,Dt);return n.v(Vt,r2(J(yt,Vt),It,ht),w)},ot=mt(rt.y*f,-pt,0,0),Pt=mt(rt.y*f,pt,0,0);for(let yt=1;yt<X;yt++){const Dt=2*yt/X-1,It=Math.sqrt(1-Dt*Dt),ht=Dt*pt,Vt=(rt.y-rt.droop*It)*f,Et=rt.halfHeight*f*It;lt.push(rt.rows.map((Lt,B)=>mt(Vt+Lt*Et,ht,B,It)))}const U=rt.rows.length;for(let yt=0;yt+1<U;yt++){n.to(ot,lt[0][yt],lt[0][yt+1],y),n.to(Pt,lt[X-2][yt],lt[X-2][yt+1],y);for(let Dt=0;Dt+1<X-1;Dt++){const It=lt[Dt][yt],ht=lt[Dt][yt+1],Vt=lt[Dt+1][yt],Et=lt[Dt+1][yt+1];n.to(It,Vt,ht,y),n.to(ht,Vt,Et,y)}}}P=.6*g+h*.3+.7*x,H=0,W=.5*f}else{vn(n,[I(),C(.3*g,x,f,0),C(.75*g,.8*x,.75*f,-.1*f)],T,.2,.5,1);const N=Math.max(.25*g,h*1.1);for(const tt of[-1,1]){const $=[0,.35,.7,1].map(st=>s(e,.72*g+N*st,-.25*f,tt*Te(.55,.05,st*st)*x));n.region=Xe.muzzle,An(n,$,[.16*x,.12*x,.08*x,.01*x],$.map(()=>w),()=>i.keratin,7,.3,.1,.7);const ut=[0,.25,.5,.75,1].map(st=>s(e,.6*g+1.5*g*st,.45*f+.8*g*st*(1-.4*st),tt*(.4*x+.55*g*st)));n.region=Xe.ear,An(n,ut,[.07,.06,.05,.04,.02].map(st=>st*x*M.earScale),ut.map(()=>w),st=>st%2?i.accent:i.keratin,5,.2,.2)}P=.72*g+N,H=-.25*f,W=.3*f}if(n.end(),a2(n,t,e,i,s,o,c,u,d,F),b.built!=="none"){const N=b.built==="crest"&&p.head==="beak",tt=b.built==="crest"?s2(n,e,F,N?"blend":"all"):null,$=N?-.5*f:.3*f,ut=(J,mt)=>{const ot=tt&&$r(tt,[J,2*f,0],[0,-1,0]);return ot&&ot.point[1]>=$&&ot.point[1]<=1.2*f?ot.point[1]:mt};n.begin("horn",N?"casque":b.built),n.region=Xe.horn;const st=Math.hypot(.05*g,.25*f,.3*x)+Math.hypot(.12*g,.3*f,.3*x)+Math.hypot(.03*g,.5*f,.05*x)+Math.hypot(.1*g,.35*f,.2*x),nt=t.phenotype&&b.built==="paired"?t.phenotype.dimensions.hornLength/st:M.hornScale,K=M.hornCurl,ct=M.hornAsym,rt=.5+.5*nt,pt=(J,mt,ot)=>oe(u(ot,1,"horn",J/mt),i.keratin,.35+.65*J/mt),X=(J,mt,ot,Pt)=>Pt===0?J:J.map((U,yt)=>yt===0?U:U.clone().sub(mt).applyAxisAngle(ot,Pt*yt/(J.length-1)).add(mt)),lt=(J,mt)=>mt===1?J:J.map((ot,Pt)=>Pt===0?ot:ot.clone().sub(J[0]).multiplyScalar(mt).add(J[0]));if(b.built==="nasal"){const J=.4*g+h*.65,mt=(_==="muzzle"?-.24*f*.65:H)+W*.9+.05*f,ot=.5*g*nt,Pt=s(e,J,mt,0),U=X([0,.33,.66,1].map(ht=>s(e,J+ot*(.12*ht-.25*ht*ht),mt+ot*ht,0)),Pt,R,-K);An(n,[s(e,J,mt-.12*f,0),...U],[.15*g,.14*g,.1*g,.05*g,.008*g].map(ht=>ht*rt),[w,w,w,w,w],(ht,Vt,Et)=>pt(ht,4,Et),10,.2,.15);const yt=J-.25*g,Dt=mt+.08*f,It=nt*(1+ct);An(n,[s(e,yt,Dt-.1*f,0),s(e,yt+.02*g*It,Dt+.12*g*It,0),s(e,yt-.02*g*It,Dt+.22*g*It,0)],[.09*g,.06*g,.008*g].map(ht=>ht*(.5+.5*It)),[w,w,w],(ht,Vt,Et)=>pt(ht,2,Et),8,.2,.15)}else if(b.built==="paired")for(const J of[-1,1]){const mt=nt*(1+J*ct),ot=[be(.05,.7,.55),be(0,.95,.85),be(-.12,1.25,1.15),be(-.15,1.75,1.2),be(-.05,2.1,1)].map(U=>s(e,(U.x+Ul[0])*g,(U.y+Ul[1])*f,J*(U.z+Ul[2])*x)),Pt=X(lt(ot,mt),ot[0],R,-K*J);An(n,Pt,[.1*g,.08*g,.06*g,.035*g,.006*g].map(U=>U*(.5+.5*mt)),Pt.map(()=>w),(U,yt,Dt)=>pt(U,4,Dt),9,.2,.15)}else if(b.built==="ossicones")for(const J of[-1,1]){const mt=nt*(1+J*ct),ot=s(e,.02*g,.8*f,J*.35*x),[,Pt]=X(lt([ot,s(e,-.03*g,.8*f+.32*g,J*.42*x)],mt),ot,R,-K);An(n,[ot,Pt],[.055*g,.045*g].map(U=>U*(.5+.5*mt)),[w,w],(U,yt,Dt)=>oe(u(Dt,Math.sin(yt),"head",.2),i.accent,.3),9,.2,.2),Fn(n,Pt,[y,E,R],[.06*g,.06*g,.06*g].map(U=>U*(.5+.5*mt)),w,()=>i.keratin,8,4)}else if(N){const J=Math.max(h,.15*g),mt=.26*g,ot=.36*g+.6*J,Pt=Math.max(.5*f,.25*g)*nt*.32,U=.04*f,yt=oe(i.horn,i.accent,.25),Dt=[.45,1,.8,.3],It=[.24,.3,.26,.14],ht=[];Dt.forEach((Vt,Et)=>{const Lt=Te(mt,ot,Et/3),B=ut(Lt,.5*f)-U,et=(Pt*Vt+U)/2;ht.push({c:s(e,Lt,B+et,0),t:y,u:E,rx:It[Et]*x,ry:et,w,color:()=>yt,region:Xe.horn})}),vn(n,ht,8,.3,.3)}else if(b.built==="crest"){const J=Math.max(.5*f,.25*g)*nt,ot=[[-.12,.15],[.05,.9],[.22,1],[.42,.45],[.5,.15]].map(([Pt,U])=>{const yt=Pt*g,Dt=ut(yt,.72*f)-hf*g,It=(J*U+hf*g)/2;return{c:s(e,yt,Dt+It,0),t:y,u:E,rx:i2*x,ry:It,w,color:ht=>oe(i.accent,i.plate,.6*gn(.5+.5*Math.sin(ht),0,1)*U),region:Xe.horn}});vn(n,ot,8,.3,.3)}n.end()}return S}const cf=1.2,jy=1.3,$y=2*Math.PI/180,Ky=Math.log(1.08),Zy=.5,Zr=16,j0=.96,lf=[.08,6],Bh=Object.freeze({flare:22,length:.44,top:.15,lobe:.3,root:.05,rim:.012,bow:.035,segments:12,stations:10});function Qy(n,t,e,i,s,r,o,a){const l=Bh,c=[],u=(d,p)=>Math.pow(Math.max(0,Math.sin(Math.PI*d)),p);for(let d=0;d<=l.stations;d++){const p=d/l.stations,m=u(Math.min(1,.08+.92*p),.6),g=(.035+l.top*u(Math.min(1,p*1.15),.7))*Math.max(0,1-Math.pow(p,6)),x=-(.035+l.lobe*u(Math.pow(p,.75),.8))*Math.max(0,1-Math.pow(p,6)),f=Math.max(.004,(g-x)/2),h=l.rim+(l.root-l.rim)*Math.pow(1-p,3),M=t.clone().addScaledVector(e,l.length*p*r).addScaledVector(i,(g+x)/2*r).addScaledVector(s,l.bow*m*r);c.push({c:M,t:e,u:i,rx:Math.min(h,f)*r,ry:f*r,w:o,color:(_,b)=>a(p,b)})}vn(n,c,l.segments,.3,.3)}const Jy=Object.freeze({bulb:[[.16,1.05],[.3,1.1],[.42,1.04],[.51,.9]],flare:1.1,faceAt:.56,face:.62,nostril:.22,nostrilTall:1.35,nostrilZ:.3,nostrilY:.02,finger:[.38,.8,.36,.26,.3],lipTone:[.66,.52,.48],lipMix:0,faceDark:.35});function t2(n,t,e,i,s,r,o){const a=Jy,l=Math.max(t.rx,t.ry),c=r(e,1,0,0),u=r(e,0,1,0),d=r(e,0,0,1),p=[[e.index,1]],m=s(e,e.length),g=(T,C)=>oe(o(C,Math.sin(T)),a.lipTone,a.lipMix),x=oe(oe(i.skin,[.62,.48,.45],.3),[0,0,0],a.faceDark),f=(T,C,I)=>({c:m.clone().addScaledVector(c,T*l),t:c,u,rx:C*l,ry:C*l,w:p,color:I}),M=[{...t,w:p},...a.bulb.map(([T,C])=>f(T,C,(I,F)=>oe(o(F,Math.sin(I)),a.lipTone,a.lipMix*Math.min(1,T/a.bulb[1][0])))),f(a.faceAt,a.face,()=>x)];vn(n,M,Zr,0,0),kc(n,M[M.length-1],Zr,1);const _=je(i.skin,.1),b=m.clone().addScaledVector(c,a.faceAt*l);for(const T of[-1,1]){const C=b.clone().addScaledVector(d,T*a.nostrilZ*l).addScaledVector(u,a.nostrilY*l),I=[];for(let Y=0;Y<8;Y++){const P=ds*Y/8;I.push(n.v(C.clone().addScaledVector(u,Math.cos(P)*a.nostril*a.nostrilTall*l).addScaledVector(d,Math.sin(P)*a.nostril*l).addScaledVector(c,.012*l),_,p))}const F=n.v(C.clone().addScaledVector(c,.012*l),_,p),V=n.v(C.clone().addScaledVector(c,-.02*l),_,p);for(let Y=0;Y<8;Y++)n.to(F,I[Y],I[(Y+1)%8],c),n.to(V,I[Y],I[(Y+1)%8],c.clone().negate())}const[S,y,E,R,w]=a.finger;Fn(n,m.clone().addScaledVector(c,S*l).addScaledVector(u,y*l),[c,u,d],[E*l,R*l,w*l],p,(T,C,I)=>g(T,I),10,5)}const e2=.012,n2=.0035,Ul=[.11,.1,-.07],i2=.09,hf=.01;function s2(n,t,e,i){const s=new fn(...t.restQuaternion).invert(),r=be(...t.restPosition),o=be(),a=[],l=c=>{for(let u=0;u<4;u++)if(n.si[c*4+u]===t.index&&n.sw[c*4+u]>0)return!0;return!1};return n.parts.forEach((c,u)=>{const d=u>=e;if(!(d?c.part!=="head"||c.label.endsWith("ears"):c.part!=="torso")){for(let p=c.firstTriangle*3;p<(c.firstTriangle+c.triangles)*3;p+=3)if(!(!d&&i==="blend"&&!l(n.ix[p])&&!l(n.ix[p+1])&&!l(n.ix[p+2])))for(let m=0;m<3;m++){const g=n.ix[p+m];o.set(n.p[g*3],n.p[g*3+1],n.p[g*3+2]).sub(r).applyQuaternion(s),a.push(o.x,o.y,o.z)}}}),new Float64Array(a)}const $0=Object.freeze({halfWidth:.3,y:-.04,droop:.06,halfHeight:.07,columns:12,rows:[1,.45,0,-.45,-1],slit:[.55,.16,.15],toSlit:.6,lip:[.85,.42,.4],toLip:.55,floor:.85,lipFloor:1});function r2(n,t,e){const i=$0,s=t===0||t===i.rows.length-1,r=i.rows[t]===0;if(s)return n;const o=r?oe(n,i.slit,i.toSlit*Math.sqrt(e)):oe(n,i.lip,i.toLip*e),a=(r?i.floor:1+(i.lipFloor-1)*e)*bn(n),l=bn(o);return l<a&&l>0?je(o,a/l):o}function K0(n,t,e,i){return n==="beak"?[.2*t,.3*e,.86*i]:n==="flat-face"?[.43*t,.06*e,.42*i]:n==="jaws"?[.24*t,.52*e,.72*i]:[.3*t,.38*e,.8*i]}const ea=5,o2=35;function a2(n,t,e,i,s,r,o,a,l,c){const u=t.recipe,d=t.dims,p=d.headLength,m=d.craniumWidth,g=d.craniumHeight,x=d.snoutLength,f=o.traits,h=Uc(u.head),M=yc({...u,bodyLength:l.speciesBodyLength}),_=f.eyeScale*f.allometry.eyeRel,b=new fn(...e.restQuaternion),S=b.clone().invert(),y=be(...e.restPosition),E=be(),R=[],w=[],T=$=>{for(let ut=0;ut<4;ut++)if(n.si[$*4+ut]===e.index&&n.sw[$*4+ut]>0)return!0;return!1};for(const $ of n.parts){const ut=n.parts.indexOf($)>=c;if(!(ut?$.part!=="head"||$.label.endsWith("ears"):$.part!=="torso")){for(let st=$.firstTriangle*3;st<($.firstTriangle+$.triangles)*3;st+=3)if(!(!ut&&!T(n.ix[st])&&!T(n.ix[st+1])&&!T(n.ix[st+2])))for(let nt=0;nt<3;nt++){const K=n.ix[st+nt];E.set(n.p[K*3],n.p[K*3+1],n.p[K*3+2]).sub(y).applyQuaternion(S),R.push(E.x,E.y,E.z),w.push(K)}}}const C=new Float64Array(R),I=($,ut,st)=>s(e,$,ut,st),F=be(0,1,0).applyQuaternion(S),V=[F.x,F.y,F.z],Y=$=>{const ut=$.tri*3,st=1-$.u-$.v,nt=w[ut]*3,K=w[ut+1]*3,ct=w[ut+2]*3;return[0,1,2].map(rt=>st*n.c[nt+rt]+$.u*n.c[K+rt]+$.v*n.c[ct+rt])};let P=null;const H=($,ut)=>{if(!P){P=new Map;for(let rt=0;rt+8<C.length;rt+=9){const pt=C[rt+3]-C[rt],X=C[rt+4]-C[rt+1],lt=C[rt+5]-C[rt+2],J=C[rt+6]-C[rt],mt=C[rt+7]-C[rt+1],ot=C[rt+8]-C[rt+2],Pt=[X*ot-lt*mt,lt*J-pt*ot,pt*mt-X*J];for(let U=0;U<3;U++){const yt=w[rt/3+U],Dt=P.get(yt)??[0,0,0];P.set(yt,[Dt[0]+Pt[0],Dt[1]+Pt[1],Dt[2]+Pt[2]])}}for(const[rt,pt]of P)P.set(rt,nn(pt))}const st=$.tri*3,nt=[1-$.u-$.v,$.u,$.v],K=$.point;let ct=0;for(let rt=0;rt<3;rt++){const pt=P.get(w[st+rt]),X=(st+rt)*3,lt=(K[0]-C[X])*pt[0]+(K[1]-C[X+1])*pt[1]+(K[2]-C[X+2])*pt[2];ct+=nt[rt]*-lt*(pt[0]*ut[0]+pt[1]*ut[1]+pt[2]*ut[2])}return Math.max(0,ct)},W=[[e.index,1]],j=($,ut,st,nt,K,ct,rt,pt)=>{const X=[];for(let J=0;J<$.positions.length;J+=3){const mt=I($.positions[J],$.positions[J+1],$.positions[J+2]);X.push(mt.x,mt.y,mt.z)}const lt=n.patch(X,ut,$.gloss,$.index,W,Xe.eye);l.eyes.push({side:st,type:nt,er:K,centre:[...ct],gaze:[...rt],surface:pt?[...pt]:null,firstVertex:lt,vertexCount:ut.length,rings:$.rings.map(J=>lt+J),triangles:$.index.length/3,rimFallbacks:$.rimFallbacks})},N=M.rules===1&&po(M.kind),tt=N?M.built:M.kind;if(n.begin("eyes",tt==="compound"?"compound eyes":tt==="eyespot"?"eyespots":`${tt} eyes`),n.region=Xe.eye,!N){g2({s:n,r:u,H:p,cW:m,cH:g,sn:x,skull:h,eyes:M,sizeK:_,tr:f,pal:i,hc:r,coatAt:a,ctx:l,headTris:C,worldUp:V,surfaceColour:Y,smoothOffset:H,toModel:I,emit:j}),n.end();return}if(M.built==="compound")for(const $ of[-1,1]){const ut=[.07*p*_,.18*g*_,.12*m*_],st=Ts(M.gazeYawDeg,ea,$),nt=[.45*p,.35*g,$*.82*m],K=Fi(C,nt,st);K||l.fallbacks++;const ct=K?Wn(K.point,st,-.35*ut[2]):nt,rt=my({er3:ut,centre:ct,gaze:st,up:[0,1,0]}),pt=K?Y(K):i.base,X=Math.max(Kr.min,Kr.overSkin*bn(pt));let lt=i.eye;bn(lt)<X&&(lt=oe(lt,Kr.tint,Math.min(1,(X-bn(lt))/Math.max(1e-6,bn(Kr.tint)-bn(lt))))),l.colours.compound=lt;const J=je(lt,.3),mt=[...rt.roles].map(ot=>ot===De.pseudopupil?J:ot===De["facet-a"]?je(lt,1.08):ot===De["facet-b"]?je(lt,.92):lt);j(rt,mt,$,"compound",Math.max(...ut),ct,st,K?K.point:null)}else if(M.built==="eyespot"){const $=.6*p+x*.3,ut=.1*g*_,st=.002*p;for(const nt of[-1,1]){const K=Ts(M.gazeYawDeg,o2,nt),ct=[$,0,0],rt=$r(C,ct,K);rt||l.fallbacks++;const pt=rt?rt.point:Wn(ct,K,.7*m),X=gy({r:ut,centre:Wn(pt,K,st),normal:K,up:[0,1,0],rimLift:(lt,J)=>{const mt=Fi(C,J,K,3*ut);return mt?mt.t+st:0}});j(X,[...X.roles].map(()=>i.eye),nt,"eyespot",ut,pt,K,rt?rt.point:null)}}else{const $=M.built,ut=M.k*g*_,[st,nt,K]=K0(h,p,g,m),ct=[];for(const It of[-1,1]){const ht=Ts(M.gazeYawDeg,ea,It),Vt=[st,nt,It*K],Et=Fi(C,Vt,ht);Et||l.fallbacks++;const Lt=Et?Wn(Et.point,ht,-So.recess*ut):Vt,B=Vh(C,Lt,x2*ut),et=X0({type:$,er:ut,centre:Lt,gaze:ht,barAxis:Fc(ht,V),surface:B.tris});for(const k of et.surface)k&&(k.tri=B.ids[k.tri]);const gt=et.surface.map((k,A)=>{if(k)return Y(k);const v=et.positions[A*3],D=I(v,et.positions[A*3+1],et.positions[A*3+2]);return a(D,.5,r.region(v),r.along(v))});ct.push({patch:et,side:It,centre:Lt,gaze:ht,hit:Et,surf:gt})}const rt=It=>je([...f0[It]],l.eyeMul);let pt=rt(M.irisBuilt??"dark-brown");u.head==="beak"&&u.maturity<.75&&(pt=oe(pt,rt("dark-brown"),(.75-u.maturity)/.75));const X=Y0,lt=De.lid;let J=0;for(const{patch:It,surf:ht}of ct)It.roles.forEach((Vt,Et)=>{Vt===lt&&(J=Math.max(J,bn(je(ht[Et],X.lid))))});const mt=(It,ht)=>[Math.min(1,It[0]*ht),Math.min(1,It[1]*ht),Math.min(1,It[2]*ht)],ot=Math.max(X.overPupil*bn(Tc),X.overLid*J),Pt=bn(pt);Pt<ot&&Pt>0&&(pt=mt(pt,Math.min(X.maxIrisGain,ot/Pt)));let U=X.lid;bn(pt)<X.overLid*J&&(U=X.lid*bn(pt)/(X.overLid*J)*.999),l.colours.iris=pt,l.colours.lidFactor=U;const yt=mt(pt,1.1),Dt=je(pt,.45);for(const{patch:It,side:ht,centre:Vt,gaze:Et,hit:Lt,surf:B}of ct){let et=[0,0,0],gt=0;const k=[...It.roles].map((v,D)=>{switch(v){case De.pupil:return Tc;case De["iris-inner"]:return yt;case De.iris:return pt;case De.limbus:return Dt;case De.lid:{const q=je(B[D],U);return et=[et[0]+q[0],et[1]+q[1],et[2]+q[2]],gt++,q}case De["outer-lid"]:return je(B[D],X.outerLid);case De.orbit:return B[D];default:return[0,0,0]}}),A=je(et,1/Math.max(1,gt));It.roles.forEach((v,D)=>{v===De.socket&&(k[D]=A)}),j(It,k,ht,$,ut,Vt,Et,Lt?Lt.point:null)}}n.end()}const Z0=Object.freeze({minK:.14,sizeBoost:1.12,irisMin:.1,maxIrisGain:8,periocular:[.36,.3,.25],periocularLum:.18,periocularOverSkin:1.3,periocularSkinGain:2.5,periocularOwnLum:.08,sclera:[.72,.68,.6],nictitans:[.5,.42,.4],nictitansMix:.6,brow:.85,disc:[.7,.64,.52],discMix:1,discLum:.4,discEdge:.6,facetMin:.15,facetOverSkin:3,lens:[1.5,1.15],lattice:.55,pseudopupil:.12,compoundScale:1.45,mandibleScale:1.3,compoundSink:.5,eyespotR:.09,eyespotOnFace:.75,pigment:[.62,.2,.07],pigmentMix:.85,rimGain:1,eyespotEdgeToSkin:.3,eyespotLum:.9,eyespotYawDeg:24,eyespotPitchDeg:42,ocellus:[.012,.012,.016],ocellusRim:[.5,.4,.32],ocellusRimMix:.6,ocellusClear:1.35,turretGain:1.2,turretOpen:2,turretRim:[.8,.72,.45],turretRimMix:.5,turretShape:{w:.78,lift:.62,aperture:1.3},turretSize:1.3,turretStripe:.6,brilleEdge:.8,barMin:.62,barMax:.17,barSquare:5,slitMin:.12,slitSize:1.25,cat:{size:1.8,tiltDeg:14,maxEr:.5},owl:{size:.68,up:.12,midline:.005},turretNormal:4,seat:{deg:30,tiltLidless:12,reach:1,dx:[-.3,.15],dy:[-.25,.25],step:.05,move:.5},stalkLength:{blunt:.9,other:.45},stalkDimorphism:.6,stalkR:[.07,.05],stalkBulb:.13,stalkBead:.09}),c2=Object.freeze([{r:.32,yaw:12,pitch:5,z:.2,dx:.1,dy:0,segments:10,stations:1,rim:!0},{r:.15,yaw:42,pitch:5,z:.5,dx:.04,dy:-.06,segments:5,stations:1,rim:!0},{r:.14,yaw:20,pitch:35,z:.28,dx:-.03,dy:.14,segments:5,stations:1,rim:!0},{r:.15,yaw:90,pitch:25,z:.55,dx:-.07,dy:.08,segments:5,stations:1,rim:!0}]),l2=[[.1,0],[-.05,-.3],[-.05,.3]],h2=1e-9;function u2(n,t,e,i){const s=ga(n,t,e).filter(a=>a.normal[0]*e[0]+a.normal[1]*e[1]+a.normal[2]*e[2]>0&&Math.abs(a.t-i.t)<=h2).sort((a,l)=>a.tri-l.tri);let r=0,o=0;for(const a of s)r+=a.normal[0],o+=a.normal[1];return nn([r,o,0])}const d2=5.2;function f2(n){const t=Z0,e=n.pupil,i=e.kind==="horizontal"?{...n,pupil:{...e,rx:Math.max(e.rx,t.barMin),ry:Math.min(e.ry,t.barMax),n:Math.max(e.n,t.barSquare)}}:e.kind==="vertical-slit"?{...n,pupil:{...e,rx:Math.max(e.rx,t.slitMin)}}:n;if(!i.turret)return i;const s=t.turretOpen,r=i.pupil;return{...i,pupil:{...r,r:r.r*s},iris:i.iris===null?null:i.iris*s,limbus:i.limbus===null?null:i.limbus*s,lid:{...i.lid,w:i.lid.w*s,above:i.lid.above*s,below:i.lid.below*s},turret:{...t.turretShape}}}function p2(n,t,e){const i=Math.acos(gn(n[0]*t[0]+n[1]*t[1]+n[2]*t[2],-1,1));if(i<=e||i>Math.PI-1e-6)return n;const s=Math.sin(e)/Math.sin(i),r=Math.sin(i-e)/Math.sin(i);return nn([t[0]*r+n[0]*s,t[1]*r+n[1]*s,t[2]*r+n[2]*s])}function m2(n,t){const e=n.positions.length/3;return{positions:[...n.positions,...t.positions],roles:Uint8Array.from([...n.roles,...t.roles]),gloss:[...n.gloss,...t.gloss],index:[...n.index,...t.index.map(i=>i+e)],surface:[...n.surface,...t.surface],rimFallbacks:n.rimFallbacks+t.rimFallbacks,rings:[...n.rings,...t.rings.map(i=>i+e)]}}const Yi=(n,t)=>[Math.min(1,n[0]*t),Math.min(1,n[1]*t),Math.min(1,n[2]*t)];function Nl(n,t,e){const i=bn(n),s=bn(t);return i>=e||s<=i?n:oe(n,t,Math.min(1,(e-i)/(s-i)))}function g2(n){const{r:t,H:e,cW:i,cH:s,sn:r,skull:o,eyes:a,sizeK:l,tr:c,pal:u,ctx:d,headTris:p,worldUp:m,surfaceColour:g,smoothOffset:x,emit:f}=n,h=Z0,M=Y0,_=a.traits,b=t.head,S=Math.PI/180,y=Ch[p0(t,"round")],E=Math.max(y.k,h.minK)*h.sizeBoost,[R,w,T]=K0(o,e,s,i),C=b==="mandibles",I=_.placement,F=$=>I.kind==="independent"&&$>0&&I.right?I.right:null,V=a.kind==="cat",Y=a.kind==="owl",P=$=>F($)?.yawDeg??I.yawByFace?.[b]??I.yawDeg??y.gazeYawDeg,H=$=>F($)?.pitchDeg??I.pitchDeg??ea,W=($,ut,st)=>{const nt=gn((y.gazeYawDeg-ut)/Math.max(y.gazeYawDeg,1),0,1),K=st>10?Math.sin(st*S):0;return[R+.1*e*nt,w+.2*s*K+(Y?h.owl.up*s:0),$*T*(1-.45*nt)*(1-.25*K)]},j=$=>$?g($):u.base,N=$=>{const ut=Math.max(h.facetMin,h.facetOverSkin*bn($));return Nl(u.eye,Kr.tint,Math.min(ut,bn(Kr.tint)))},tt=($,ut)=>[...$.roles].map(st=>st===De["facet-a"]?Yi(ut,h.lens[0]):st===De["facet-b"]?Yi(ut,h.lens[1]):st===De.pseudopupil?je(ut,h.pseudopupil):je(ut,h.lattice));if(_.structure==="camera"){const $=f2(xy(_)),ut=E*_.size*s*l*($.turret?h.turretSize:["vertical-slit","slit-wide","w"].includes($.pupil.kind)?h.slitSize:1),st=ut*(V?gn(h.cat.maxEr*s/ut,1,h.cat.size):Y?h.owl.size:1),nt=[],K=h.seat,ct=Vh(p,[R,w,0],.6*e+2*st).tris,rt=(Vt,Et)=>{const Lt=Fi(ct,Vt,Et);if(!Lt)return null;const B=gu(ct,Lt.point,Et,3*st);if(B&&B.t>.02*st)return{hit:Lt,score:-1/0};const et=nn(Math.abs(Et[1])>.95?[Et[1],-Et[0],0]:[Et[2],0,-Et[0]]),gt=[Et[1]*et[2]-Et[2]*et[1],Et[2]*et[0]-Et[0]*et[2],Et[0]*et[1]-Et[1]*et[0]];let k=[...Lt.normal];for(const[v,D]of[[1,0],[-1,0],[0,1],[0,-1]]){const q=Fi(ct,Wn(Wn(Lt.point,et,v*K.reach*st),gt,D*K.reach*st),Et,st);if(!q)return{hit:Lt,score:-1/0};k=Wn(k,q.normal,1)}const A=nn(k);return{hit:Lt,score:A[0]*Et[0]+A[1]*Et[1]+A[2]*Et[2],normal:A}};let pt=null;const X=(Vt,Et,Lt)=>{if($.turret)return[0,0];if(I.kind!=="independent"&&pt)return pt;const B=rt(Vt,Et);let et=[0,0];if(!B||B.score<Math.cos(K.deg*S)){let gt=B?B.score:-1/0;const k=Math.round((K.dx[1]-K.dx[0])/K.step),A=Math.round((K.dy[1]-K.dy[0])/K.step);for(let v=0;v<=k;v++)for(let D=0;D<=A;D++){const q=K.dx[0]+v*K.step,Q=K.dy[0]+D*K.step,z=rt([Vt[0]+q*e,Vt[1]+Q*s,Vt[2]],Et),xt=z?z.score-K.move*Math.hypot(q,Q):-1/0;xt>gt+1e-9&&(gt=xt,et=[q,Q])}}return Lt<0&&(pt=et),et};for(const Vt of[-1,1]){const Et=P(Vt),Lt=H(Vt),B=Ts(Et,Lt,Vt),et=W(Vt,Et,Lt),[gt,k]=X(et,B,Vt),A=[et[0]+gt*e,et[1]+k*s,et[2]],v=Fi(p,A,B);v||d.fallbacks++;let D=$.turret&&v?nn(Wn(B,v.normal,h.turretNormal)):B;const q=$.spectacle||V?rt(A,B):null;q?.normal&&Number.isFinite(q.score)&&(D=p2(B,q.normal,(V?h.cat.tiltDeg:K.tiltLidless)*S));const Q=v?Wn(v.point,D,-So.recess*st):A,z=Vh(p,Q,d2*st),xt=X0({type:"round",er:st,centre:Q,gaze:D,barAxis:Fc(D,m),surface:z.tris,spec:$,forward:[1,0,0],midline:{n:[0,0,Vt],min:($.disc?h.owl.midline:.03)*i},look:B});for(const Ut of xt.surface)Ut&&(Ut.tri=z.ids[Ut.tri]);const bt=xt.surface.map((Ut,ee)=>{if(Ut)return g(Ut);const Rt=xt.positions[ee*3],O=n.toModel(Rt,xt.positions[ee*3+1],xt.positions[ee*3+2]);return n.coatAt(O,.5,n.hc.region(Rt),n.hc.along(Rt))});nt.push({patch:xt,side:Vt,centre:Q,gaze:D,hit:v,surf:bt})}const lt=Vt=>je([...f0[Vt]],d.eyeMul);let J=lt(a.irisBuilt??"dark-brown");t.head==="beak"&&t.maturity<.75&&(J=oe(J,lt("dark-brown"),(.75-t.maturity)/.75));let mt=0;for(const{patch:Vt,surf:Et}of nt)Vt.roles.forEach((Lt,B)=>{Lt===De.lid&&(mt=Math.max(mt,bn(je(Et[B],M.lid))))});const ot=Math.max(M.overPupil*bn(Tc),M.overLid*mt,h.irisMin),Pt=bn(J);Pt<ot&&Pt>0&&(J=Yi(J,Math.min(h.maxIrisGain,ot/Pt)));let U=M.lid;const yt=M.overLid*mt,Dt=a.kind==="cephalopod"?yt*(1-1e-12):yt;bn(J)<Dt&&(U=M.lid*bn(J)/yt*.999),d.colours.iris=J,d.colours.lidFactor=U;const It=Yi(J,1.1),ht=je(J,.45);for(const{patch:Vt,side:Et,centre:Lt,gaze:B,hit:et,surf:gt}of nt){let k=[0,0,0],A=0;const v=Q=>Vt.shade?.[Q]??1,D=[...Vt.roles].map((Q,z)=>{switch(Q){case De.pupil:return Tc;case De["iris-inner"]:return Yi(It,v(z));case De.iris:return Yi(J,v(z));case De.limbus:return ht;case De.sclera:return h.sclera;case De.lid:case De.nictitans:{const xt=$.turret?oe(Yi(gt[z],h.turretGain),h.turretRim,h.turretRimMix):je(gt[z],$.spectacle?h.brilleEdge:U);return k=[k[0]+xt[0],k[1]+xt[1],k[2]+xt[2]],A++,Q===De.nictitans?oe(xt,h.nictitans,h.nictitansMix):xt}case De["outer-lid"]:{if($.spectacle)return je(gt[z],h.brilleEdge);const xt=je(gt[z],M.outerLid);if($.disc)return Nl(oe(xt,h.disc,h.discMix),h.disc,h.discLum);const bt=oe(h.periocular,Yi(gt[z],h.periocularSkinGain),gn(bn(gt[z])/h.periocularOwnLum,0,1));return Nl($.disc?oe(xt,h.disc,h.discMix):xt,bt,Math.max(h.periocularLum,h.periocularOverSkin*bn(gt[z])))}case De.brow:return je(gt[z],h.brow);case De.turret:return(z-Vt.rings[6])%2?je(gt[z],h.turretStripe):Yi(gt[z],h.turretGain);case De.orbit:return $.disc?oe(gt[z],h.disc,h.discEdge):gt[z];default:return[0,0,0]}}),q=je(k,1/Math.max(1,A));Vt.roles.forEach((Q,z)=>{Q===De.socket&&(D[z]=q)}),f(Vt,D,Et,a.kind,st,Lt,B,et?et.point:null)}}else if(_.structure==="compound"){const $=E*s*l*_.size,ut=h.compoundScale*l*_.size*h.mandibleScale,st=C?[.07*e*ut,.18*s*ut,.12*i*ut]:[1.05*$*h.compoundScale,1.2*$*h.compoundScale,.75*$*h.compoundScale],nt=C?Ch.mandibles.gazeYawDeg:y.gazeYawDeg;let K=u.eye;for(const ct of[-1,1]){const rt=Ts(nt,ea,ct),pt=C?[.45*e,.35*s,ct*.82*i]:[R,w,ct*T],X=Fi(p,pt,rt);X||d.fallbacks++;const lt=X?Wn(X.point,rt,-h.compoundSink*st[2]):pt,J=nf({er3:st,centre:lt,gaze:rt,up:[0,1,0]});K=N(j(X)),f(J,tt(J,K),ct,a.kind,Math.max(...st),lt,rt,X?X.point:null)}if(d.colours.compound=K,_.extras==="ocelli"){const ct=C?.45*e:R,rt=.25*st[1],pt=nn([.35,1,0]);for(const[X,lt]of l2){const J=[ct+X*e,.3*s,lt*i],mt=Fi(p,J,pt);mt||d.fallbacks++;const ot=mt?lt===0?u2(p,J,pt,mt):mt.normal:null,Pt=ot?nn(Wn(pt,ot,1)):pt,U=mt?Wn(mt.point,Pt,-.25*rt):J,yt=Il({r:rt,height:.7*rt,centre:U,normal:Pt,up:[1,0,0],segments:6,stations:1}),Dt=Yi(K,1.2);f(yt,[...yt.roles].map(()=>Dt),0,"ocellus",rt,U,Pt,mt?mt.point:null)}}}else if(_.structure==="ocellus"){const[$,ut]=C?[.45*e,.35*s]:[R,w];for(const st of[-1,1])for(const nt of c2){const K=nt.r*s*l,ct=Ts(nt.yaw,nt.pitch,st),rt=[$+nt.dx*e,ut+nt.dy*s,st*Math.max(nt.z*i,h.ocellusClear*kh.flange*K)],pt=Fi(p,rt,ct);pt||d.fallbacks++;const X=pt?nn(Wn(ct,pt.normal,1)):ct,lt=pt?Wn(pt.point,X,-.05*K):rt,J=Il({r:K,height:.75*K,centre:lt,normal:X,up:[0,1,0],segments:nt.segments,stations:nt.stations,rim:nt.rim,flange:nt.rim}),mt=oe(j(pt),h.ocellusRim,h.ocellusRimMix);f(J,[...J.roles].map(ot=>ot===De["ocellus-rim"]?mt:h.ocellus),st,"ocellus",K,lt,X,pt?pt.point:null)}}else if(_.structure==="eyespot"){const $=b==="blunt",ut=$?h.eyespotR*s*l:h.eyespotOnFace*E*s*l,st=oe(u.eye,h.pigment,h.pigmentMix),nt=.002*e;for(const K of[-1,1]){let ct,rt,pt;if($){const U=.6*e+r*.3,yt=[U,0,0];ct=Ts(h.eyespotYawDeg,h.eyespotPitchDeg,K),rt=$r(p,yt,ct),pt=rt?rt.point:Wn(yt,ct,.7*i)}else{ct=Ts(y.gazeYawDeg,ea,K);const U=[R,w,K*T];rt=Fi(p,U,ct),pt=rt?rt.point:U}rt||d.fallbacks++;const X=ct,lt=U=>Fi(p,U,X,3*ut),J=yy({r:ut,centre:pt,normal:ct,up:[0,1,0],rimLift:U=>{const yt=lt(U);return yt?yt.t+x(yt,X)+nt:nt}}),mt=j(rt),ot=je(st,h.eyespotLum*bn(mt)/Math.max(1e-6,bn(st))),Pt=[...J.roles].map((U,yt)=>{if(U===De.eyespot&&yt<=12)return ot;const Dt=[J.positions[yt*3],J.positions[yt*3+1],J.positions[yt*3+2]],It=lt(Wn(Dt,X,-ut)),ht=It?g(It):mt;return U===De.eyespot?oe(ot,ht,h.eyespotEdgeToSkin):U===De["eyespot-rim"]?Yi(ht,h.rimGain):ht});f(J,Pt,K,"eyespot",ut,pt,ct,rt?rt.point:null)}}else{const $=b==="blunt",ut=c.sex==="male"?1+h.stalkDimorphism*t.dimorphism:1,st=($?h.stalkLength.blunt:h.stalkLength.other)*s*l*ut,nt=h.stalkR[0]*s*l,K=h.stalkR[1]*s*l;for(const ct of[-1,1]){const rt=Ts(I.yawDeg??40,I.pitchDeg??55,ct),pt=$?[.55*e+.3*r,.35*s,ct*.3*i]:C?[.4*e,.45*s,ct*.45*i]:[R,w+.25*s,ct*.6*T],X=Fi(p,pt,rt);X||d.fallbacks++;const lt=X?X.point:pt,J=j(X),{patch:mt,tip:ot}=Sy({base:lt,dir:rt,up:[0,1,0],length:st,r0:nt,r1:K,segments:6,rings:$?4:2});let Pt,U,yt,Dt=ot,It=rt;if($){yt=h.stalkBead*s*l,Pt=Il({r:yt,height:.9*yt,centre:ot,normal:rt,up:[0,1,0],segments:8,stations:2,rim:!0});const Vt=oe(je(J,.9),h.ocellusRim,h.ocellusRimMix);U=[...Pt.roles].map(Et=>Et===De["ocellus-rim"]?Vt:h.ocellus)}else yt=h.stalkBulb*s*l,It=nn(Wn(rt,[0,0,ct],.6)),Dt=Wn(ot,It,-.2*yt),Pt=nf({er3:[yt,yt,.8*yt],centre:Dt,gaze:It,up:[0,1,0],segments:8,stations:2}),U=tt(Pt,N(J));const ht=je(J,.9);f(m2(mt,Pt),[...mt.roles].map(()=>ht).concat(U),ct,"stalk",yt,Dt,It,X?X.point:null)}}}function Ol(n,t,e,i){const s=new fn(...t.restQuaternion).invert(),r=be(...t.restPosition),o=be(),a=new Float64Array((i-e)*9);for(let l=e*3,c=0;l<i*3;l++,c+=3){const u=n.ix[l];o.set(n.p[u*3],n.p[u*3+1],n.p[u*3+2]).sub(r).applyQuaternion(s),a[c]=o.x,a[c+1]=o.y,a[c+2]=o.z}return a}const x2=4.5;function Vh(n,t,e){const i=[],s=[];for(let r=0;r+8<n.length;r+=9){const o=(n[r]+n[r+3]+n[r+6])/3,a=(n[r+1]+n[r+4]+n[r+7])/3,l=(n[r+2]+n[r+5]+n[r+8])/3;let c=0;for(let u=0;u<9;u+=3)c=Math.max(c,Math.hypot(n[r+u]-o,n[r+u+1]-a,n[r+u+2]-l));if(Math.hypot(o-t[0],a-t[1],l-t[2])<=e+c){s.push(r/9);for(let u=0;u<9;u++)i.push(n[r+u])}}return{tris:Float64Array.from(i),ids:s}}const Wn=(n,t,e)=>[n[0]+t[0]*e,n[1]+t[1]*e,n[2]+t[2]*e];function _2(n,t,e,i,[s,r]){const o=be(...e.restPosition),a=new fn(...e.restQuaternion).invert(),l=new fn(...e.restQuaternion);for(let c=t;c<n.nv;c++){let u=0;for(let m=0;m<4;m++)n.si[c*4+m]===e.index&&(u+=n.sw[c*4+m]);if(u<=0)continue;const d=n.pos(c).sub(o).applyQuaternion(a);if(u<.999){if(d.y>=0)continue;for(let m=0;m<4;m++)n.si[c*4+m]=m?0:e.index,n.sw[c*4+m]=m?0:1}d.set(gn(d.x,-s,r),Math.max(d.y,-i),d.z);const p=d.applyQuaternion(l).add(o);n.p[c*3]=p.x,n.p[c*3+1]=p.y,n.p[c*3+2]=p.z}}function b2(n,t,e,i,s,r,o,a,l,c,u,d){const p=[[e.index,1]],m=c(e,1,0,0),g=c(e,0,1,0),x=c(e,0,0,1),f=g.clone().negate(),h=o.ring,M=h.rx,_=T=>oe(u(T),a.skin,t==="claw"?.4:.18),b=(T,C)=>t==="hoof"?oe(u(C),a.keratin,Ye(0,2,T)):_(C),S=t==="claw"?[[.06,-.28,Math.max(h.ry,.16*s),Math.max(M,.15*s)],[.15,-.65,.25*s,Math.max(M,.19*s)],[.17,-1,.23*s,Math.max(M*.94,.17*s)]]:[[.03,-.25,Math.max(h.ry,M*1.08),M*1.05],[.11,-.7,Math.max(M*1.2,s*.38),M*1.23],[.14,-1,Math.max(M*1.23,s*.4),M*1.24]];d&&t!=="claw"&&(S[1][2]=d.footLength*.48,S[1][3]=d.footWidth*.48,S[2][2]=d.footLength*.5,S[2][3]=d.footWidth*.5);const y=[h,...S.map(([T,C,I,F],V)=>({c:l(e,T*s,C*i),t:f,u:m,rx:F,ry:I,w:p,region:Xe.foot,color:(Y,P)=>b(V+1,P)}))];if(vn(n,y,o.radial,0,0),kc(n,y[y.length-1],o.radial,1),t==="pad"){const T=S[2],C=T[2],I=T[3];for(let F=-1;F<=1;F++){const V=F*.56;Fn(n,l(e,T[0]*s+C*Math.cos(V)*.97,-.79*i,I*Math.sin(V)),[m,g,x],[.09*C,.16*i,.19*I],p,()=>oe(a.keratin,a.horn,.4),8,4)}}if(t!=="claw")return;const E=.082*s;for(const T of[-.42,0,.42]){const C=m.clone().multiplyScalar(Math.cos(T)).addScaledVector(x,Math.sin(T)*r).normalize(),I=l(e,.18*s,0,Math.sin(T)*r*.12*s),F=(.76-.18*Math.abs(T))*s,Y=[[0,1.08,-.55,.45],[.2,1.12,-.55,.45],[.36,.87,-.59,.4],[.53,.91,-.58,.41],[.72,.68,-.67,.32],[.9,.48,-.7,.28]].map(([W,j,N,tt])=>({c:I.clone().addScaledVector(C,F*W).addScaledVector(g,i*N),t:C,u:g,rx:E*j,ry:i*tt,w:p,region:Xe.foot,color:($,ut)=>_(ut)}));vn(n,Y,10,.12,.12);const P=Y[Y.length-1].c,H=[P,P.clone().addScaledVector(C,E*1.3).addScaledVector(g,-.02*i),P.clone().addScaledVector(C,E*2.3).addScaledVector(g,-.2*i)];An(n,H,[E*.48,E*.27,E*.025],[p,p,p],()=>a.keratin,8,.05,.05,.65,g)}const R=m.clone().negate().addScaledVector(x,-r*.15).normalize(),w=l(e,-.01*s,-.58*i);An(n,[w,w.clone().addScaledVector(R,.14*s),w.clone().addScaledVector(R,.28*s).addScaledVector(g,-.12*i)],[E*.8,E*.6,E*.16],[p,p,p],(T,C,I)=>T===2?a.keratin:_(I),8,.1,.1,.62,g)}function M2(n,t,e,i,s,r,o,a,l,c,u){const d=[[e.index,1]],p=[[e.index,.6],[i.index,.4]],m=c(e,1,0,0),g=c(e,0,1,0),x=c(e,0,0,1),f=Math.max(i.end.w,.001),h=(M,_,b,S=.25)=>{const y=M.map(([E,R,w,T],C)=>({c:l(e,E,R),t:g.clone().negate(),u:m,rx:T,ry:w,w:C===0?p:d,color:(I,F)=>_(C,F)}));vn(n,y,b,.15,S)};if(t==="hoof")h([[0,.25*s,f,f],[.05*r,-.3*s,f*1.15,f*1.1],[.18*r,-1.02*s,f*1.35,f*1.2]],(M,_)=>M===0?oe(a.keratin,u(_),.4):a.keratin,12,.08);else if(t==="pad"){h([[0,.3*s,f,f],[.02*r,-.4*s,f*1.2,f*1.2],[.05*r,-1.02*s,f*1.35,f*1.3]],(M,_)=>oe(u(_),a.skin,.3),14,.06);for(let M=-1;M<=1;M++)Fn(n,l(e,.05*r+f*1.25*Math.cos(M*.5),-.8*s,f*1.2*Math.sin(M*.5)),[m,g,x],[f*.18,s*.22,f*.3],d,()=>[.78,.72,.62],6,3)}else if(t==="paw"){Fn(n,l(e,.25*r,-.45*s),[m,g,x],[.42*r,.55*s+.01*r,Math.max(f*1.15,.28*r)],p,(M,_,b)=>oe(u(b),a.accent,.2),10,5);for(let M=0;M<4;M++){const _=(M-1.5)*.17*r,b=.62*r-Math.abs(M-1.5)*.06*r;Fn(n,l(e,b,-.62*s,_),[m,g,x],[.12*r,.38*s,.085*r],d,(S,y,E)=>u(E),7,4),An(n,[l(e,b+.08*r,-.5*s,_),l(e,b+.17*r,-.85*s,_)],[.03*r,.003*r],[d,d],()=>a.keratin,5,.1,.1)}}else if(t==="claw"||t==="hand"){const M=t==="hand",_=M?.06*r:Math.max(.035*r,.45*s),b=M?[-.36,-.12,.12,.36]:[-.42,0,.42];M?Fn(n,l(e,.32*r,-.6*s),[m,g,x],[.36*r,.4*s,.22*r],p,()=>a.skin,10,5):Fn(n,l(e,.02*r,-.3*s),[m,g,x],[_*2,_*1.5,_*2],p,()=>oe(a.keratin,a.skin,.5),8,4);for(const R of b){const w=(M?.55:1-.25*Math.abs(R))*r,T=M?l(e,.6*r,-.6*s,R*.5*r):l(e,.02*r,-.4*s,0),C=m.clone().multiplyScalar(Math.cos(R)).addScaledVector(x,Math.sin(R)*o*(M?.3:1)).normalize(),I=[0,.35,.7,.95].map(Y=>T.clone().addScaledVector(C,w*Y).addScaledVector(g,-s*.55*Y+(M?0:s*.1)));An(n,I,[_,_*.85,_*.7,_*.5],I.map(()=>d),()=>M?a.skin:oe(a.keratin,a.skin,.55),7,.3,.2);const F=I[3],V=[F,F.clone().addScaledVector(C,_*2.2).addScaledVector(g,-_*.2),F.clone().addScaledVector(C,_*3.6).addScaledVector(g,-_*1.1)];An(n,V,[_*.5,_*.32,_*.03],[d,d,d],()=>a.keratin,6,.1,.1)}const S=M?m.clone().multiplyScalar(.3).addScaledVector(x,-o*.95).normalize():m.clone().negate().addScaledVector(x,-o*.15).normalize(),y=M?l(e,.25*r,-.6*s,-o*.2*r):l(e,0,-.5*s,0),E=[0,.5,1].map(R=>y.clone().addScaledVector(S,(M?.35:.3)*r*R).addScaledVector(g,-.4*s*R));An(n,E,[_*.9,_*.7,_*.35],[d,d,d],()=>M?a.skin:a.keratin,6,.3,.2)}else An(n,[l(e,0,.25*s),l(e,.08*s,-.5*s),l(e,.12*s,-s)],[f,f*.6,f*.06],[p,d,d],M=>M?a.keratin:oe(a.keratin,a.accent,.4),6,.1,.05)}function v2(n,t,e,i,s,r,o,a,l,c){const u=[[i.index,1]],d=[[s.index,1]],p=[[i.index,.5],[e.index,.5]],m=[[i.index,.5],[s.index,.5]],g=l(i,1,0,0),x=l(i,0,1,0),f=l(i,0,0,1),h=i.length,M=s.length,_=Math.max(e.end.w,.001);if(t==="pincer"){const y=Math.max(h*1.6,_*3);Fn(n,a(i,y*.45),[g,x,f],[y*.6,_*1.7,_*1.4],p,()=>oe(o.plate,o.accent,.3),12,6);const E=[0,.5,1].map(w=>a(i,y*(.9+.7*w),_*(.6-.7*w*w)));An(n,E,[_*.7,_*.45,_*.05],[u,u,u],()=>o.keratin,8,.2,.1);const R=[0,.5,1].map(w=>a(s,y*(.45+.7*w)-M*0,-_*(.6-.6*w*w)));An(n,R,[_*.65,_*.42,_*.05],[d,d,d],()=>o.keratin,8,.2,.1);return}const b=t==="claw";Fn(n,a(i,h*.5),[g,x,f],[h*.62,_*.7,_*(b?1:1.25)],p,(y,E,R)=>b?c(R):o.skin,10,5);const S=b?[-.5,0,.5]:[-.45,-.15,.15,.45];for(const y of S){const E=M*(b?2.2:1.6)*(1-.2*Math.abs(y)),w=[a(i,h*.95,0,y*_*1.6),...[.33,.66,1].map(T=>a(s,E*T,-E*.18*T*T,y*_*1.6*(1-.15*T)))];An(n,w,b?[_*.35,_*.28,_*.18,_*.02]:[_*.28,_*.24,_*.2,_*.14],[m,d,d,d],()=>b?o.keratin:o.skin,6,.2,b?.05:.6)}if(!b){const y=a(i,h*.35,-_*.3,-r*_*1.1),E=g.clone().addScaledVector(f,-r*.8).addScaledVector(x,-.3).normalize();An(n,[y,y.clone().addScaledVector(E,M*.9),y.clone().addScaledVector(E,M*1.5)],[_*.3,_*.24,_*.16],[u,u,u],()=>o.skin,6,.2,.6)}}function y2(n,t,e,i,s,r,o,a,l){const c=t.recipe,u=c.wings==="feathered",d=e.reduce((S,y)=>S+y.length,0),p=16,m=4,g=[],x=[],f=B0(u,d),h=[];for(let S=0;S<=p;S++){const y=S/p*d;let E=0,R=0;for(;E<e.length-1&&R+e[E].length<y-1e-9;)R+=e[E].length,E++;const w=e[E],T=y-R,C=T/w.length,I=o(w,T),F=a(w,0,0,1).multiplyScalar(s),V=a(w,0,1,0),Y=S/p,P=z0(u,d,Y),H=[];for(let W=0;W<=m;W++){const j=W/m,N=C<.5&&E>0?[[e[E-1].index,.5*(1-Ye(0,.5,C))],[w.index,1]]:C>.5&&E<e.length-1?[[e[E+1].index,.5*Ye(.5,1,C)],[w.index,1]]:[[w.index,1]];let tt=N;!u&&Y<.2&&(tt=[...N.map(([st,nt])=>[st,nt*(1-j*(1-Y/.2))]),[i.index,j*(1-Y/.2)]]);const $=I.clone().addScaledVector(F,P*j).addScaledVector(V,P*.06*Math.sin(Math.PI*j)),ut=u?oe(oe(l($,Y),r.accent,Ye(.45,.9,j)*.8),r.keratin,Ye(.75,1,Y)*.5*j):oe(oe(r.skin,r.accent,.35),r.keratin,.25*Ye(.6,1,j));H.push({p:$,n:V,w:tt,col:ut})}h.push(H)}for(const S of h)g.push(S.map(({p:y,n:E,w:R,col:w},T)=>n.v(y.clone().addScaledVector(E,f*.5*(1-.7*T/m)),w,R))),x.push(S.map(({p:y,n:E,w:R,col:w},T)=>n.v(y.clone().addScaledVector(E,-f*.5*(1-.7*T/m)),oe(w,[.8,.78,.74],.12),R)));const M=be();let _=0;for(const S of h)for(const y of S)M.add(y.p),_++;M.multiplyScalar(1/_);for(let S=0;S<p;S++)for(let y=0;y<m;y++){const E=h[S][y].n;n.to(g[S][y],g[S+1][y],g[S][y+1],E),n.to(g[S+1][y],g[S+1][y+1],g[S][y+1],E);const R=E.clone().negate();n.to(x[S][y],x[S+1][y],x[S][y+1],R),n.to(x[S+1][y],x[S+1][y+1],x[S][y+1],R)}const b=[];for(let S=0;S<=p;S++)b.push([S,0]);for(let S=1;S<=m;S++)b.push([p,S]);for(let S=p-1;S>=0;S--)b.push([S,m]);for(let S=m-1;S>=1;S--)b.push([0,S]);for(let S=0;S<b.length;S++){const[y,E]=b[S],[R,w]=b[(S+1)%b.length],T=h[y][E].p.clone().add(h[R][w].p).multiplyScalar(.5).sub(M);n.to(g[y][E],x[y][E],g[R][w],T),n.to(g[R][w],x[y][E],x[R][w],T)}if(!u){const S=e[e.length-1];for(const y of[.35,.75]){const E=o(S,0),R=a(S,1,0,0).multiplyScalar(Math.cos(y)).addScaledVector(a(S,0,0,1),s*Math.sin(y)).normalize(),w=S.length*(1.2-.4*y);An(n,[E,E.clone().addScaledVector(R,w*.5),E.clone().addScaledVector(R,w)],[S.start.w*.5,S.start.w*.35,S.start.w*.1],[[[S.index,1]],[[S.index,1]],[[S.index,1]]],()=>r.keratin,5,.1,.1)}}for(const S of e)An(n,[o(S,0),o(S,S.length)],[S.start.w,S.end.w],[[[S.index,1]],[[S.index,1]]],(y,E,R)=>u?l(R,0):r.skin,7,.4,.4)}function S2(n,t,e,i,s,r,o){const a=t.recipe,l=t.bones,c=t.chains.torso.map(f=>l[f]),u=c.length,d=c.reduce((f,h)=>f+h.length,0),p=a.layout==="limbless"||a.layout==="many-legged",m=f=>{const h=gn(f,-.12,1.12)*d;let M=0,_=0;for(;_<u-1&&M+c[_].length<h;)M+=c[_].length,_++;const b=c[_],S=h-M,y=gn(S/b.length,0,1),E={w:Te(b.start.w,b.end.w,y),h:Te(b.start.h,b.end.h,y),yc:Te(b.start.yc,b.end.yc,y)},R=c[_-1],w=c[_+1],T=y<.5&&R?[[R.index,.5*(1-Ye(0,.5,y))],[b.index,1]]:y>.5&&w?[[w.index,.5*Ye(.5,1,y)],[b.index,1]]:[[b.index,1]];return{bone:b,local:S,sec:E,w:T}};if(a.armor==="dome"){const[f,h]=p?[.33,.67]:[-.08,1.04],M=[],_=10;for(let b=0;b<=_;b++){const S=Te(f,h,b/_),{bone:y,local:E,sec:R,w}=m(S),T=b/_,C=Math.pow(Math.sin(Math.PI*Te(.08,.92,T)),.45),I=i(y,E,R.yc+R.h*.12),F=s(y,1,0,0),V=s(y,0,1,0);M.push({c:I,t:F,u:V,rx:R.w*1.25*C,ry:R.h*1.32*C,ryBelow:R.h*Math.min(1.32*C,1.1),w,color:Y=>{const P=Math.sin(Y);if(P<-.15)return oe(e.belly,e.plate,.35);const H=Math.abs(Math.sin(T*Math.PI*5))<.12||Math.abs(Math.sin(Y*3))<.1;return P<.1?oe(e.plate,e.belly,.4):H?oe(e.plate,e.keratin,.6):oe(e.plate,e.horn,.25+.15*Math.sin(r+T*13))}})}vn(n,M,24,.25,.25);return}if(a.armor==="bands"){const f=p?u:Math.max(6,u*2);for(let h=0;h<f;h++){const M=(h+.05)/f,_=Math.min((h+1.15)/f,.985),b=-.35,S=Math.PI+.35,y=12,E=[];for(const[I,F]of[M,_].entries()){const{bone:V,local:Y,sec:P,w:H}=m(F),W=s(V,0,1,0),j=s(V,0,0,1),N=i(V,Y,P.yc),tt=[],$=h===f-1&&I===1||h===0&&I===0;for(const ut of $?[1.03,.95]:[1.16,1.02]){const st=[];for(let nt=0;nt<=y;nt++){const K=Te(b,S,nt/y),ct=N.clone().addScaledVector(j,-Math.cos(K)*P.w*ut).addScaledVector(W,Math.sin(K)*P.h*ut);st.push(n.v(ct,oe(e.plate,e.keratin,I?.35:.1),H))}tt.push(st)}E.push(tt)}const[R,w]=E,T=I=>{const{bone:F,local:V,sec:Y}=m(I);return i(F,V,Y.yc)},C=T((M+_)/2);for(let I=0;I<y;I++){const F=(H,W,j,N)=>n.to(H,W,j,N),V=n.pos(R[0][I]).sub(C);F(R[0][I],R[0][I+1],w[0][I],V),F(R[0][I+1],w[0][I+1],w[0][I],V),F(R[1][I],R[1][I+1],w[1][I],V.clone().negate()),F(R[1][I+1],w[1][I+1],w[1][I],V.clone().negate());const Y=T(M).sub(C),P=T(_).sub(C);F(R[0][I],R[0][I+1],R[1][I],Y),F(R[0][I+1],R[1][I+1],R[1][I],Y),F(w[0][I],w[0][I+1],w[1][I],P),F(w[0][I+1],w[1][I+1],w[1][I],P)}for(const I of[0,y]){const F=n.pos(R[0][I]).sub(n.pos(R[0][y/2]));n.to(R[0][I],R[1][I],w[0][I],F),n.to(R[1][I],w[1][I],w[0][I],F)}}return}if(a.armor==="plates"){const f=t.chains.tail.slice(0,Math.ceil(t.chains.tail.length/2)).map(_=>l[_]),h=[],M=p?u:Math.max(3,9+o.traits.countScale.plate);for(let _=0;_<M;_++){const b=(_+.5)/M,S=m(b);h.push({...S,size:.6+.5*Math.sin(Math.PI*b)})}for(const[_,b]of f.entries())h.push({bone:b,local:b.length*.5,sec:{w:b.start.w,h:b.start.h,yc:0},w:[[b.index,1]],size:.7-.12*_});h.forEach(({bone:_,local:b,sec:S,w:y,size:E},R)=>{const w=o.jv*((R%2?.07:-.07)+.12*(jo(o.plateSeed,R,0)-.5)),T=Math.max(S.h,t.dims.torsoHeight*.5)*.85*E*(1+w),C=T*.95,I=s(_,_.part==="tail"?-1:1,0,0),F=s(_,0,1,0),V=s(_,0,0,1),Y=i(_,b,S.yc+S.h*.82).addScaledVector(V,(R%2?1:-1)*S.w*.14);q0(n,Y,I,F,[[-C*.5,0],[-C*.3,T*.7],[0,T],[C*.35,T*.65],[C*.5,0]],T*.07,y,(P,H)=>oe(e.plate,e.accent,Ye(.5,1,H/T)*.6))});return}const g=Math.max(3,(p?u*2:10)+o.traits.countScale.osteoderm),x=[.55,.95,1.5707,2.19,2.59];for(let f=0;f<g;f++)for(const[h,M]of x.entries()){const _=o.jv*(jo(o.osteoSeed,f,h*3)-.5)*.5,b=o.jv*(jo(o.osteoSeed,f,h*3+1)-.5)*.2,S=1+o.jv*(jo(o.osteoSeed,f,h*3+2)-.5)*.3,y=(f+.5+h%2*.5+_)/(g+.5),E=M+b,{bone:R,local:w,sec:T,w:C}=m(y),I=s(R,0,1,0),F=s(R,0,0,1),V=i(R,w,T.yc),Y=F.clone().multiplyScalar(-Math.cos(E)*T.h).addScaledVector(I,Math.sin(E)*T.w).normalize(),P=V.clone().addScaledVector(F,-Math.cos(E)*T.w*.97).addScaledVector(I,Math.sin(E)*T.h*.97),H=Math.min(T.w,T.h)*.16*S;An(n,[P.clone().addScaledVector(Y,-H*.4),P.clone().addScaledVector(Y,H*.55),P.clone().addScaledVector(Y,H*.95)],[H,H*.75,H*.08],[C,C,C],W=>W?oe(e.plate,e.horn,.4):e.plate,5,.1,.05)}}const tc=n=>`0x${(n>>>0).toString(16)}u`,E2=n=>{const t=String(n);return/[.eE]/.test(t)?t:`${t}.0`},$S=`
// every integer the hash touches is highp (32-bit), whatever the program's default int precision
uniform highp uint coatSeed;
uniform float coatCells, coatThreshold, coatWarp, coatBellyLine;
varying vec3 vCoatL0;
varying vec3 vCoatL1;
varying vec3 vCoatL2;
varying vec4 vCoatSample;
const float COAT_INV32 = 1.0 / 4294967296.0;
const highp uint COAT_SALT_WARP = ${tc(Za.warp)}, COAT_SALT_DETAIL = ${tc(Za.detail)}, COAT_SALT_MARK = ${tc(Za.mark)}, COAT_SALT_BAND = ${tc(Za.band)};
const float COAT_JITTER = ${E2(Lv)};
highp uvec3 coatPcg3(highp ivec3 p, highp uint s) {
  highp uint a = uint(p.x) * 1664525u + 1013904223u + s;
  highp uint b = (uint(p.y) * 1664525u + 1013904223u) ^ ((s << 11u) | (s >> 21u));
  highp uint c = uint(p.z) * 1664525u + 1013904223u + s * 0x27d4eb2fu;
  a += b * c; b += c * a; c += a * b;
  a ^= a >> 16u; b ^= b >> 16u; c ^= c >> 16u;
  a += b * c; b += c * a; c += a * b;
  return uvec3(a, b, c);
}
float coatSmooth(float a, float b, float x) { float t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3.0 - 2.0 * t); }
vec3 coatFade(vec3 t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float coatVnoise(vec3 p, highp uint s) {
  vec3 fl = floor(p), u = coatFade(p - fl);
  highp ivec3 i = ivec3(fl);
  float c000 = float(coatPcg3(i, s).z), c100 = float(coatPcg3(i + ivec3(1, 0, 0), s).z);
  float c010 = float(coatPcg3(i + ivec3(0, 1, 0), s).z), c110 = float(coatPcg3(i + ivec3(1, 1, 0), s).z);
  float c001 = float(coatPcg3(i + ivec3(0, 0, 1), s).z), c101 = float(coatPcg3(i + ivec3(1, 0, 1), s).z);
  float c011 = float(coatPcg3(i + ivec3(0, 1, 1), s).z), c111 = float(coatPcg3(i + ivec3(1, 1, 1), s).z);
  float x00 = c000 + (c100 - c000) * u.x, x10 = c010 + (c110 - c010) * u.x;
  float x01 = c001 + (c101 - c001) * u.x, x11 = c011 + (c111 - c011) * u.x;
  float y0 = x00 + (x10 - x00) * u.y, y1 = x01 + (x11 - x01) * u.y;
  return (y0 + (y1 - y0) * u.z) * COAT_INV32;
}
vec3 coatVnoise3(vec3 p, highp uint s) {
  vec3 fl = floor(p), u = coatFade(p - fl), acc = vec3(0.0);
  highp ivec3 i = ivec3(fl);
  for (int k = 0; k < 8; k++) {
    highp ivec3 d = ivec3(k & 1, (k >> 1) & 1, (k >> 2) & 1);
    float w = (d.x == 1 ? u.x : 1.0 - u.x) * (d.y == 1 ? u.y : 1.0 - u.y) * (d.z == 1 ? u.z : 1.0 - u.z);
    acc += vec3(coatPcg3(i + d, s)) * w;
  }
  return acc * COAT_INV32;
}
float coatFbm2(vec3 p, highp uint s) { return (2.0 * coatVnoise(p, s) + coatVnoise(p * 2.03 + vec3(17.31, -9.17, 5.71), s ^ 0x5bd1e995u)) / 3.0; }
// F1, F2, nearest-cell hash and the vector from the nearest feature point
void coatWorley(vec3 p, highp uint s, out float f1, out float f2, out highp uint h, out vec3 v) {
  vec3 fl = floor(p);
  highp ivec3 i = ivec3(fl);
  float d1 = 1e9, d2 = 1e9, lo = (1.0 - COAT_JITTER) * 0.5;
  h = 0u; v = vec3(0.0);
  for (int a = -1; a <= 1; a++) for (int b = -1; b <= 1; b++) for (int c = -1; c <= 1; c++) {
    highp ivec3 cell = i + ivec3(a, b, c);
    highp uvec3 H = coatPcg3(cell, s);
    vec3 d = p - (vec3(cell) + lo + COAT_JITTER * vec3(H) * COAT_INV32);
    float q = dot(d, d);
    if (q < d1) { d2 = d1; d1 = q; h = ((H.x ^ (H.z >> 7u)) * 0x9e3779b1u) ^ H.y; v = d; }
    else if (q < d2) d2 = q;
  }
  f1 = sqrt(d1); f2 = sqrt(d2);
}
// raw pattern mask (x) and the reticulated patch shade (y), as patternMask / coatPatternProbe
vec2 coatPatternMask(vec3 sp, float dorsal, float fp) {
  highp uint seed = coatSeed;
  float t = coatThreshold, cpb = coatCells;
#if COAT_PATTERN == 5 || COAT_PATTERN == 6
  const bool stripes = COAT_PATTERN == 5;
  float u = (sp.x + (stripes ? 0.05 : 0.015) * (1.0 - dorsal)) * cpb;
  float wAmp = stripes ? 0.55 * coatWarp : 0.12 * coatWarp, qs = cpb * 0.6;
  u += wAmp * (coatFbm2(vec3(sp.x * qs, sp.y * qs * 1.6, sp.z * qs * 1.6), seed ^ COAT_SALT_WARP) - 0.5) * 2.0;
  float k = floor(u), f = u - k;
  highp uvec3 H = coatPcg3(ivec3(int(k), stripes ? 1 : 2, 0), seed ^ COAT_SALT_BAND);
  float width = 0.6 + 0.4 * (float(H.x) * COAT_INV32 + float(H.z & 0xffffu) / 65536.0);
  float duty = (stripes ? 0.43 : 0.42) + 0.3 * t, hw = 0.5 * duty * width, d = abs(f - 0.5);
  if (stripes) { float end = coatBellyLine + 0.1 + 0.45 * float(H.y) * COAT_INV32; hw *= coatSmooth(end - 0.04, end + 0.22, dorsal); }
  if (stripes && float(H.z) * COAT_INV32 < 0.3) { d = abs(d - 0.55 * hw); hw *= 0.42; }
  float edge = (coatVnoise(sp * cpb * 3.0, seed ^ COAT_SALT_DETAIL) - 0.5) * (stripes ? 0.08 : 0.05);
  float e = max(stripes ? 0.03 : 0.02, fp * cpb * 0.5);
  return vec2(hw <= 0.0 ? 0.0 : 1.0 - coatSmooth(hw - e, hw + e, d + edge), 0.0);
#elif COAT_PATTERN == 7
  float qs = cpb;
  float n1 = coatFbm2(vec3(sp.x * qs * 0.45, sp.y * qs * 0.6, sp.z * qs * 0.6), seed ^ COAT_SALT_WARP) - 0.5;
  float n2 = coatVnoise(sp * qs * 2.0, seed ^ COAT_SALT_DETAIL) - 0.5;
  float u = sp.x * qs + 0.4 * (1.0 - dorsal) + (1.3 + 1.2 * coatWarp) * n1 + 0.35 * n2;
  float f = u - floor(u);
  float thick = coatVnoise(vec3(sp.x * qs * 0.8 + 3.1, sp.y * qs * 0.8, sp.z * qs * 0.8), seed ^ COAT_SALT_MARK);
  float hw = (0.1 + 0.1 * thick) * (1.0 + 1.2 * t), e = max(0.035, fp * qs * 0.5);
  float breakup = coatSmooth(0.22, 0.4, coatVnoise(vec3(sp.x * qs * 1.3 - 7.7, sp.y * qs * 1.3, sp.z * qs * 1.3), seed ^ COAT_SALT_BAND));
  return vec2((1.0 - coatSmooth(hw - e, hw + e, abs(f - 0.5))) * breakup * 0.9, 0.0);
#else
  vec3 q = sp * cpb;
#if COAT_PATTERN == 3
  const float warpAmp = 0.32;
#elif COAT_PATTERN == 2
  const float warpAmp = 0.28;
#else
  const float warpAmp = 0.22;
#endif
  if (coatWarp > 0.0) q += coatWarp * warpAmp * 2.0 * (coatVnoise3(q * 0.45 + vec3(31.7, -12.9, 4.3), seed ^ COAT_SALT_WARP) - 0.5);
  float efp = fp * cpb * 0.5, f1, f2;
  highp uint hc; vec3 dv;
  coatWorley(q, seed, f1, f2, hc, dv);
#if COAT_PATTERN == 1
  float r0 = 0.35 + 0.06 * (2.0 * float(hc) * COAT_INV32 - 1.0) + 0.25 * t, soft = max(0.05, efp);
  return vec2(1.0 - coatSmooth(r0, r0 + soft, f1), 0.0);
#elif COAT_PATTERN == 2
  float rho = f1 / max(f2, 1e-6), inv = 1.0 / max(f1, 1e-6);
  vec3 g = dv * inv;
  float gap = coatVnoise(vec3(g.x * 1.6 + float(hc & 1023u) * 0.37, g.y * 1.6 + float((hc >> 10u) & 1023u) * 0.41, g.z * 1.6 + float((hc >> 20u) & 1023u) * 0.43), seed ^ COAT_SALT_DETAIL);
  float thick = coatVnoise(vec3(g.x * 2.3 + 9.1, g.y * 2.3 - 3.3, g.z * 2.3 + 1.7), seed ^ COAT_SALT_MARK);
  float e = max(0.035, efp * 0.6);
  float outer = 0.8 - 0.04 * (float(hc) * COAT_INV32) + 0.2 * t, inner = outer - 0.22 - 0.12 * (thick - 0.5) - 0.15 * t;
  float ring = coatSmooth(inner - e, inner + e, rho) * (1.0 - coatSmooth(outer - e, outer + e, rho)) * coatSmooth(0.3, 0.44, gap);
  float centre = 0.35 * (1.0 - coatSmooth(inner - e, inner + e, rho));
  return vec2(max(ring, centre), 0.0);
#elif COAT_PATTERN == 3
  float d = f2 - f1, h = float(hc) * COAT_INV32;
  float wob = (coatVnoise(q * 1.7, seed ^ COAT_SALT_DETAIL) - 0.5) * 0.04;
  float lo = 0.05 - 0.1 * t + wob, e = max(0.0, efp - 0.025);
  float shade = clamp(0.55 + 0.3 * h + 0.18 * coatSmooth(0.12, 0.6, d), 0.0, 1.0);
  return vec2(coatSmooth(lo - e, lo + 0.05 + e, d), shade);
#else
  float rho = f1 / max(f2, 1e-6), hi = 0.86 + 0.25 * t, e = max(0.0, efp * 0.5);
  return vec2(0.85 * (1.0 - coatSmooth(hi - 0.45 - e, hi + 0.04 + e, rho)), 0.0);
#endif
#endif
}
vec3 composerCoatCrisp() {
  vec3 sp = vCoatSample.xyz;
  // the fragment's footprint in body lengths (the larger screen-space step of the pattern-space point)
  float fp = max(length(dFdx(sp)), length(dFdy(sp)));
  vec2 mp = coatPatternMask(sp, clamp(vCoatSample.w, -1.0, 1.0), fp);
  return clamp(vCoatL0 + mp.x * (vCoatL1 - vCoatL0) + mp.x * mp.y * (vCoatL2 - vCoatL1), 0.0, 1.0);
}
`,ua="fauna-appearance-2",w2="fauna-appearance-1",Q0=["ungulate","cursorial","padded","long-neck","proboscidean","winged"],On=(n,t,e)=>Math.max(t,Math.min(e,n)),Is=(n,t,e)=>n+(t-n)*e,fr=(n,t,e)=>{const i=On((e-n)/(t-n),0,1);return i*i*(3-2*i)};function zc(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t^=t>>>16,t=Math.imul(t,2146121005),t^=t>>>15,(t^t>>>16)>>>0}const Ti=n=>zc(n)/4294967295*2-1,Cs=n=>zc(n)/4294967296;function T2(n){return[1,3,5].map(t=>parseInt(n.slice(t,t+2),16)/255)}function A2(n){return"#"+n.map(t=>Math.round(On(t,0,1)*255).toString(16).padStart(2,"0")).join("")}function Fl(n){return T2(n).map(t=>t<=.04045?t/12.92:((t+.055)/1.055)**2.4)}function fc(n){return A2([oo(On(n[0],0,1)),oo(On(n[1],0,1)),oo(On(n[2],0,1))])}const R2={runner:[["tawny",3],["dun",2],["fawn",2],["rufous",1]],browser:[["rufous",3],["fawn",2],["dun",2],["grey",1]],"long-neck":[["ochre",4],["tawny",2],["fawn",1]],"low-slung":[["grey",3],["sable",2],["dun",2],["olive",1]]},C2={plain:[["plain",.42],["saddle",.24],["dorsal-stripe",.19],["piebald",.09],["roan",.06]],spots:[["spots",.35],["rosettes",.25],["reticulated",.25],["dapple",.15]],stripes:[["stripes",.4],["bands",.25],["brindle",.15],["dorsal-stripe",.2]]},J0={runner:["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],browser:["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],"long-neck":["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],"low-slung":["socks","mask","blaze","tail-rings","tail-tip","ear-tips"]};function uf(n,t,e){let i=0;for(const[r,o]of n)i+=o*(e?e(r):1);let s=t*i;for(const[r,o]of n)if(s-=o*(e?e(r):1),s<0)return r;return n[n.length-1][0]}function tp(n){return`${n.archetype}/${n.color}/${n.pattern}/coat-lineage-v2`}function Bc(n){return`${n.archetype}/${n.torsoLength}/${n.torsoWidth}/${n.legLength}/${n.neckLength}/${n.color}/${n.pattern}`}function L2(n){const t=tp(n),e=n.archetype,i=uf(R2[e],Cs(`${t}/family`)),s=uf(C2[n.pattern],Cs(`${t}/pattern`),a=>a==="reticulated"&&e==="long-neck"?3:1);let r=0;for(const a of J0[e])Cs(`${t}/mark/${a}`)<.3&&(r|=yn[a]);const o=(e==="browser"||e==="long-neck")&&Cs(`${t}/juvenile-spots`)<.6;return{family:i,pattern:s,marks:r,juvenileSpots:o}}function P2(n){const t=Bc(n),e=Ac(n),i=.15+.55*Cs(`${t}/dimorphism-v2`),s=On(i*(e==="ungulate"||e==="long-neck"?1.3:1),.15,.7);return{dimorphism:s,hornlessFemales:s>.55&&Cs(`${t}/hornless-females-v2`)<.5}}function ep(n){const t=L2(n),e=Oc(`${Bc(n)}/coat-v2`),i=Math.floor(e()*4294967296)>>>0,s=1+(e()*2-1)*.25,r=1+(e()*2-1)*.2,o=.35+e()*.55,a=-.45+(e()*2-1)*.1;let l=t.marks;for(const m of J0[n.archetype])e()<.25&&(l^=yn[m]);const c=e()<.3?"belly":"accent",u=.35+e()*.4,d=(e()*2-1)*.1;t.juvenileSpots&&(l|=yn["juvenile-spots"]);const p=A0(t.family,i,{pattern:t.pattern,marks:l,scale:s,contrast:r,countershade:o,bellyLine:a,markRole:c,warp:u,threshold:d,juvenileSpots:0});return{lineage:t,coat:p}}const np={ungulate:{torso:.38,neck:.065,head:.052,tail:.021,upper:.289,lower:.124,foot:.069,footHoof:.671},cursorial:{torso:.353,neck:.055,head:.054,tail:.017,upper:.324,lower:.154,foot:.043,footHoof:.267},padded:{torso:.465,neck:.033,head:.104,tail:.038,upper:.13,lower:.104,foot:.126,footHoof:.413},"long-neck":{torso:.298,neck:.155,head:.037,tail:.015,upper:.319,lower:.129,foot:.046,footHoof:.665},proboscidean:{torso:.364,neck:.053,head:.095,tail:.021,upper:.231,lower:.118,foot:.118,footHoof:.441},winged:{torso:.382,neck:.085,head:.061,tail:.021,upper:.268,lower:.122,foot:.061,footHoof:.268}},ip=[.035,.03,.026];function sp(n,t){return t!=="proboscidean"&&n.archetype==="low-slung"&&n.armor>.05?On(.25*n.armor,0,.2):0}function Eo(n,t){return n.pattern==="rosettes"?2*t:t}const kn={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},fs=.022,Ki=new Float64Array(3);function D2(n,t,e=0){const i={},s=(p,m)=>{const g=i[p]??=[0,0,0,0];g[0]+=Ki[0]*m,g[1]+=Ki[1]*m,g[2]+=Ki[2]*m,g[3]+=m},r={torso:"torso",neck:"neck",head:"head",muzzle:"head",ear:"head",tail:"tail","tail-tip":"tail","limb-upper":"upper","limb-lower":"lower",foot:"foot"},o=dp(n,fs);for(const p of yo())Object.assign(kn,p),kn.footprint=Eo(n,fs),Li(o,kn,Ki,0),s(r[p.region]??"torso",p.weight),e>0&&p.region==="torso"&&p.dorsal>.3&&(kn.region="armor",Li(o,kn,Ki,0),s("armor",p.weight));const a=np[t],l=[0,0,0],c=[["torso",a.torso],["neck",a.neck],["head",a.head],["tail",a.tail],["upper",a.upper],["lower",a.lower],["foot",a.foot]],u=c.reduce((p,[,m])=>p+m,0),d=1-e;for(const[p,m]of c){const g=i[p],x=m/u*d;for(let f=0;f<3;f++){const h=g[f]/g[3];l[f]+=x*(p==="foot"?Is(h,ip[f],a.footHoof):h)}}if(e>0){const p=i.armor;for(let m=0;m<3;m++)l[m]+=e*p[m]/p[3]}return l}const ec=new Map,Vc={torso:0,neck:1,head:2,muzzle:2,ear:2,tail:3,"tail-tip":3,"limb-upper":4,"limb-lower":5,foot:6},qn=7,_r=4,I2=96,kl=4,na=(1<<qn)-1,U2=new Set(["piebald"]),N2=new Set(["bands"]),rp={bands:11},O2=.3,F2=.2,Go=new Float64Array(3),nc=new Float64Array(3);function Hc(n,t){const e=up(n,t);return n.scale>e?{...n,scale:e}:n}function Wr(n,t,e,i,s=_r){const r=Hc(n,fs),o=Eo(n,fs),a=O2,l=F2,c={...r,colours:{...r.colours,base:[a,a,a],accent:[a,a,a],belly:[a,a,a]}},u={...r,colours:{...r.colours,base:[a+l,a,a],accent:[a,a+l,a],belly:[a,a,a+l]}},d=new Float64Array(qn*7),p=yo(),m=(g,x,f,h,M,_)=>{const b=x*7,S=h+M+_;g[b]+=h*f,g[b+1]+=M*f,g[b+2]+=_*f;for(let y=0;y<3;y++)g[b+3+y]+=(Go[y]-a*S)*f;g[b+6]+=f};for(let g=0;g<p.length;g+=e){const x=p[g],f=Vc[x.region]??0;if(!(t>>f&1))continue;Object.assign(kn,x),kn.footprint=o,Li(u,kn,nc,0),Li(c,kn,Go,0);const h=(nc[0]-Go[0])/l,M=(nc[1]-Go[1])/l,_=(nc[2]-Go[2])/l;m(d,f,x.weight,h,M,_),i&&g%s===0&&m(i,f,x.weight,h,M,_)}for(const g of i?[d,i]:[d])for(let x=0;x<qn;x++){const f=x*7,h=g[f+6];if(h>0)for(let M=0;M<6;M++)g[f+M]/=h}return d}function ic(n,t,e,i){const s=t*7,r=e.base,o=e.accent,a=e.belly;for(let l=0;l<3;l++)i[l]=n[s]*r[l]+n[s+1]*o[l]+n[s+2]*a[l]+n[s+3+l]}const k2=[["contrast",.1,!1],["countershade",.1,!1],["threshold",.04,!0],["bellyLine",.04,!0]],df=new Float64Array(5);function pc(n,t){const e=Hc(n,fs),i=Eo(n,fs),s=yo(),r=rp[n.pattern]??na;t.fill(0);for(let o=0;o<s.length;o+=_r){const a=s[o],l=Vc[a.region]??0;op[l]<3||!(r>>l&1)||(Object.assign(kn,a),kn.footprint=i,Tv(e,kn,df),t[l*2]+=df[0]*a.weight,t[l*2+1]+=a.weight)}for(let o=0;o<qn;o++)t[o*2+1]>0&&(t[o*2]/=t[o*2+1]);return t}function z2(n,t,e){const i=ec.get(n);if(i)return i;let s=0;for(const x of hp[e])s|=yn[x];const r=new Float64Array(qn*7),o=Wr(t,na,1,r,_r),a={...t,marks:t.marks^s},l=k2.map(([x,f,h])=>{const M=Wr({...t,[x]:t[x]+f},na,_r),_=h?Wr({...t,[x]:t[x]-f},na,_r):r,b=new Float64Array(M.length);for(let S=0;S<M.length;S++)b[S]=S%7===6?0:(M[S]-_[S])/(h?2*f:f);return[x,b]}),c={...Hc(t,fs),colours:{...t.colours,plate:[.5,.5,.5]}};let u=0,d=0;for(const x of yo())x.region==="torso"&&x.dorsal>.3&&(Object.assign(kn,x),kn.region="armor",kn.footprint=Eo(t,fs),Li(c,kn,Ki,0),u+=Ki[0]/.5*x.weight,d+=x.weight);let p,m;if(N2.has(t.pattern)){p=pc(t,new Float64Array(qn*2));const x=pc({...t,threshold:t.threshold+.04},new Float64Array(qn*2)),f=pc({...t,threshold:t.threshold-.04},new Float64Array(qn*2));m=new Float64Array(qn);for(let h=0;h<qn;h++)m[h]=(x[h*2]-f[h*2])/.08}const g={species:t,flipBits:s,base:o,slopes:l,armour:u/d,mask:p,maskSlope:m,flipped:s?Wr(a,I2|kl,1):void 0,grey:Wr({...t,greying:1},kl,1),greyFlipped:s&yn.blaze?Wr({...a,greying:1},kl,1):void 0};return ec.size>=256&&ec.clear(),ec.set(n,g),g}const op=(()=>{const n=new Array(qn).fill(0),t=yo();for(let e=0;e<t.length;e+=_r)n[Vc[t[e].region]??0]++;return n})(),sc=Array.from({length:qn},()=>[0,0,0]),ff=[0,0,0],rc=[0,0,0],dr=new Float64Array(qn*4),B2=new Float64Array(qn*2);function ap(n,t,e,i,s,r=0){const o=z2(n,t,e),a=i.marks^o.species.marks|0;if(i.pattern!==o.species.pattern||a&~o.flipBits)return D2(i,s,r);const l=i.colours,c=a&yn.socks,u=a&yn.blaze;for(let f=0;f<qn;f++){const h=sc[f];if(ic((f===5||f===6?c:f===2?u:0)?o.flipped:o.base,f,l,h),f===2&&i.greying>0){ic(u?o.greyFlipped:o.grey,2,l,ff);for(let _=0;_<3;_++)h[_]=Is(h[_],ff[_],i.greying)}for(const[_,b]of o.slopes){const S=i[_]-o.species[_];if(S!==0){ic(b,f,l,rc);for(let y=0;y<3;y++)h[y]+=S*rc[y]}}}if(o.mask&&o.maskSlope){const f=pc(i,B2),h=i.threshold-o.species.threshold,M=o.slopes.find(([_])=>_==="threshold")[1];for(let _=0;_<qn;_++){const b=o.maskSlope[_];if(f[_*2+1]<=0||Math.abs(b)<.001)continue;const S=(f[_*2]-o.mask[_*2]-b*h)/b;ic(M,_,l,rc);for(let y=0;y<3;y++)sc[_][y]+=S*rc[y]}}else if(U2.has(i.pattern)){const f=Hc(i,fs),h=Eo(i,fs),M=yo();dr.fill(0);const _=rp[i.pattern]??na;for(let b=0;b<M.length;b+=_r){const S=M[b],y=Vc[S.region]??0,E=y*4;op[y]<3||!(_>>y&1)||(Object.assign(kn,S),kn.footprint=h,Li(f,kn,Ki,0),dr[E]+=Ki[0]*S.weight,dr[E+1]+=Ki[1]*S.weight,dr[E+2]+=Ki[2]*S.weight,dr[E+3]+=S.weight)}for(let b=0;b<qn;b++){const S=b*4,y=dr[S+3];if(y>0)for(let E=0;E<3;E++)sc[b][E]=dr[S+E]/y}}const d=np[s],p=[d.torso,d.neck,d.head,d.tail,d.upper,d.lower,d.foot],m=p.reduce((f,h)=>f+h,0),g=1-r,x=[0,0,0];for(let f=0;f<qn;f++){const h=p[f]/m*g,M=sc[f];for(let _=0;_<3;_++)x[_]+=h*(f===6?Is(M[_],ip[_],d.footHoof):M[_])}if(r>0)for(let f=0;f<3;f++)x[f]+=r*i.colours.plate[f]*o.armour;return x}function cp(n){return`${Bc(n)}|${tp(n)}`}function lp(n,t,e){const i=T0(t,w0(`${e}/coat`,1));return H2(n,i,e)}const hp={browser:["socks","blaze"],runner:["socks","blaze"],"long-neck":["socks"],"low-slung":["socks"]},V2={browser:.14,runner:.14,"low-slung":.22,"long-neck":.2},pf={browser:0,runner:0,"low-slung":.18,"long-neck":.3};function H2(n,t,e){const i=Oc(`${e}/coat-individual-v2`),s=()=>i()*2-1,r=Math.pow(1+V2[n]*s(),2.2),o=.15*s(),a=.1*s(),l=.05*s(),c=t.pattern==="stripes"||t.pattern==="bands"||t.pattern==="brindle",u=.05*s(),d=.15*s(),p=1+(c?.1:.06)*s();let m=t.marks;for(const h of["socks","blaze"])i()<.12&&hp[n].includes(h)&&(m^=yn[h]);const g=Nc,x={...t.colours};for(const h of["base","accent","belly"])x[h]=t.colours[h].map(M=>On(M*r,0,1));const f=Math.pow(1+pf[n]*s(),2.2);return pf[n]>0&&(x.accent=x.accent.map(h=>On(h*f,0,1))),{...t,colours:x,marks:m,contrast:On(t.contrast+o,g.contrast[0],g.contrast[1]),countershade:On(t.countershade+a,g.countershade[0],g.countershade[1]),bellyLine:On(t.bellyLine+l,g.bellyLine[0],g.bellyLine[1]),threshold:On(t.threshold+u,g.threshold[0],g.threshold[1]),warp:On(t.warp+d,g.warp[0],g.warp[1]),scale:On(t.scale*p,g.scale[0],g.scale[1])}}function G2(n){return 1-fr(.3,.7,n)}const oc=new Map;function W2(n){const t=cp(n),e=oc.get(t);if(e)return e;const i=Bc(n),{lineage:s,coat:r}=ep(n),{dimorphism:o,hornlessFemales:a}=P2(n),l={farId:t,lineage:s,coat:r,dimorphism:o,hornlessFemales:a,mass:Ti(`${i}/mass`),limb:Ti(`${i}/limb`),neck:Ti(`${i}/neck`),roughness:.84+Ti(`${i}/roughness`)*.035};return oc.size>=512&&oc.clear(),oc.set(t,l),l}function X2(n,t,e,i){const s=`${t}/${e}/appearance-v1`,{farId:r,lineage:o,coat:a,mass:l,limb:c,neck:u,roughness:d,dimorphism:p,hornlessFemales:m}=W2(n),g=lp(n.archetype,a,s),x=i==="adult"?1:.22+.23*Cs(`${s}/maturity-v2`),f=i==="adult"?g:{...g,juvenileSpots:g.marks&yn["juvenile-spots"]?G2(x):0,greying:0},h=Ac(n),M=ap(r,a,n.archetype,g,h,sp(n,h));return{version:ua,individualKey:s,markingSeed:zc(`${s}/markings`),pattern:n.pattern,palette:{base:fc(M),marking:fc(g.colours.accent),belly:fc(g.colours.belly)},roughness:d,profile:{mass:l,limb:c,neck:u,dimorphism:p,hornlessFemales:m},individual:{size:Ti(`${s}/size`),condition:Ti(`${s}/condition`),muzzle:Ti(`${s}/muzzle`),ears:Ti(`${s}/ears`),sex:Cs(`${s}/sex-v2`)<.5?"male":"female",coatPhase:Cs(`${s}/coat-phase-v2`),limb:Ti(`${s}/limb-v2`),neck:Ti(`${s}/neck-v2`),tail:Ti(`${s}/tail-v2`)},growth:{stage:i,maturity:x,lateral:1},coat:f,lineage:{family:o.family,pattern:o.pattern}}}function q2(n){if(!n||typeof n!="object"||n.version!=="fauna-coat-1")return["invalid coat genome"];const t=[];(!c0(n.pattern)||n.pattern==="auto")&&t.push("invalid coat pattern");for(const[e,[i,s]]of Object.entries(Nc)){const r=n[e];(!Number.isFinite(r)||r<i||r>s)&&t.push(`coat ${e} out of range`)}return(!Number.isInteger(n.seed)||n.seed<0||n.seed>4294967295)&&t.push("invalid coat seed"),n.markRole!=="accent"&&n.markRole!=="belly"&&t.push("invalid coat mark role"),(!n.colours||!fa.every(e=>Array.isArray(n.colours[e])&&n.colours[e].length===3&&n.colours[e].every(i=>Number.isFinite(i)&&i>=0&&i<=1)))&&t.push("invalid coat colours"),t}function Y2(n){return typeof n=="string"&&o0.includes(n)}function Ac(n){return n.morphology?n.morphology.family:n.archetype==="browser"?"ungulate":n.archetype==="runner"?"cursorial":n.archetype==="long-neck"?"long-neck":zc(`${n.torsoLength}/${n.torsoWidth}/${n.color}/family-v1`)%4===0?"proboscidean":"padded"}const j2={browser:{trunk:.58,width:.55,limb:.69,neck:.53,head:.75,foot:.76,ear:.82},runner:{trunk:.56,width:.56,limb:.63,neck:.57,head:.76,foot:.8,ear:.82},"low-slung":{trunk:.59,width:.58,limb:.62,neck:.56,head:.75,foot:.78,ear:.8},"long-neck":{trunk:.59,width:.56,limb:.71,neck:.43,head:.73,foot:.77,ear:.81}},$2=.28,K2={torso:"torso",neck:"neck",head:"head",tail:"tail",upper:"limb-upper",lower:"limb-lower",foot:"foot",armor:"armor",muzzle:"muzzle",ear:"ear","limb-upper":"limb-upper","limb-lower":"limb-lower","tail-tip":"tail-tip",horn:"horn",wing:"wing",eye:"eye"},Z2={rosettes:.4,reticulated:.67,dapple:.67,stripes:.67,bands:.67,brindle:.67,piebald:.67};function up(n,t){const e=4*t;if(!(e>0))return 1/0;if(n.pattern==="spots")return Rv({...n,scale:1})/e;const i=Z2[n.pattern],s=go[n.pattern];return i===void 0||!(s>0)?1/0:i/(s*e)}let mf,gf=NaN,zl;function dp(n,t){if(n===mf&&t===gf)return zl;const e=up(n,t);return mf=n,gf=t,zl=n.scale>e?{...n,scale:e}:n,zl}function Q2(n){const t=n.coat;return t.pattern!=="bands"&&t.pattern!=="stripes"||!Number.isFinite(n.individual.coatPhase)?0:n.individual.coatPhase/(go[t.pattern]*t.scale)}const mi={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},Ei=new Float64Array(3);function J2(n,t,e,i,s,r,o){const a=n.appearance,l=Math.max(n.torsoLength,.001);mi.x=t/l+Q2(a),mi.y=(e-s)/l,mi.z=i/l*(a.growth.lateral??1),mi.dorsal=o?.dorsal!==void 0&&Number.isFinite(o.dorsal)?On(o.dorsal,-1,1):On(2*(e-s)/Math.max(n.torsoHeight,.05),-1,1),mi.region=r!==void 0&&K2[r]||"torso",mi.along=o?.along!==void 0&&Number.isFinite(o.along)?On(o.along,0,1):0;const c=o?.cellM!==void 0&&o.cellM>0?o.cellM/l:0;return mi.footprint=Eo(a.coat,c),c>0?dp(a.coat,c):a.coat}let xf,_f;function tS(n){return n!==xf&&(xf=n,_f={...n,marks:n.marks&-129}),_f}function KS(n,t,e,i,s,r,o){return eS(n,t,e,i,s,r,o)}function eS(n,t,e,i,s,r,o,a,l=0,c=!1){const u=n.appearance;if(!u)return;if(u.version!==ua||!u.coat)return nS(n,t,e,i,s);const d=J2(n,t,e,i,s,r,o),p=u.growth.stage==="juvenile"&&(d.marks&yn.socks)!==0&&(mi.region==="limb-lower"||mi.region==="foot");if(!(d.marks&yn["juvenile-spots"])||!(d.juvenileSpots>0))return Li(d,mi,Ei,0),p&&yf(d,u.growth.maturity,a,l),[Ei[0],Ei[1],Ei[2]];const m=tS(d);if(Li(m,mi,Ei,0),p&&yf(m,u.growth.maturity,a,l),mi.region==="torso"||mi.region==="limb-upper"){const g=Math.max(n.torsoLength,.001),x=o?.cellM!==void 0&&o.cellM>0?o.cellM/g:0,f=N0(d.seed,t/g,(e-s)/g,i/g,x,n.torsoHeight/2/g,n.torsoWidth/2/g);if(f>0){const h=d.colours.belly,M=.85*d.juvenileSpots*f;for(let _=0;_<3;_++){const b=I0[_];Ei[_]=Is(Ei[_],Math.max(Is(h[_],b,.55),Is(Ei[_],b,.5)),M)}}}return[Ei[0],Ei[1],Ei[2]]}let bf,Mf;const vf=new Float64Array(3);function yf(n,t,e,i=0){const s=D0(t);if(!(s>=1)){n!==bf&&(bf=n,Mf={...n,marks:n.marks&-2}),Li(Mf,mi,vf,0);for(let r=0;r<3;r++)Ei[r]=Is(vf[r],Ei[r],s)}}function nS(n,t,e,i,s){const r=n.appearance,o=t/n.torsoLength,a=(e-s)/n.torsoHeight,l=Math.abs(i)/n.torsoWidth,c=(r.markingSeed>>>0)/4294967296*Math.PI*2;let u=0;if(r.pattern==="stripes"){const h=Math.sin(o*32+Math.sin(a*4+c)*.65+l*1.5+c);u=fr(.44,.72,h)*(1-fr(.6,1.3,Math.abs(a)))}else if(r.pattern==="spots"){const h=o*10,M=a*6+l*.7,_=Math.floor(h),b=Math.floor(M);let S=2;for(let y=-1;y<=1;y++)for(let E=-1;E<=1;E++){const R=_+y,w=b+E,T=`${r.markingSeed}/${R}/${w}`,C=.5+Ti(`${T}/x`)*.22,I=.5+Ti(`${T}/y`)*.22;S=Math.min(S,Math.hypot(h-R-C,M-w-I))}u=(1-fr(.2,.34,S))*(1-fr(.7,1.4,Math.abs(a)))}const d=Fl(r.palette.base),p=Fl(r.palette.marking),m=Fl(r.palette.belly),g=1-fr(-.42,.06,a),x=1-.1*fr(.02,.55,a),f=1+.018*Math.sin(o*69+a*23+c)*Math.sin(l*37-a*41);return d.map((h,M)=>On(Is(Is(h,p[M],u*.78),m[M],g*.62)*x*f,0,1))}const fp="creature-genome-1",pp=["browser","runner","low-slung","long-neck"],Sf=["#8d633e","#657a4b","#5f6d78","#9a7650","#78654a","#596f65"],Ef=["#e1c58a","#c98757","#a9bec3","#d6a56d","#b9a675","#d1d6c8"];function mp(n){let t=2166136261;for(let e=0;e<n.length;e++)t^=n.charCodeAt(e),t=Math.imul(t,16777619);return t^=t>>>16,t=Math.imul(t,2146121005),t^=t>>>15,t=Math.imul(t,2221713035),(t^t>>>16)>>>0}function mc(n){return mp(n)/4294967296}function iS(n,t,e){return t+(e-t)*mc(n)}function sS(n,t,e){return Math.max(t,Math.min(e,n))}function Zi(n){return Math.round(n*1e3)/1e3}function rS(n){if(typeof n!="string"||!n.trim()||n.length>160)throw new Error("seed must be a non-empty string up to 160 characters")}function oS(n){if(!pp.includes(n))throw new Error(`Unknown creature archetype: ${String(n)}`)}function aS(n){return{...n,mutationLog:[...n.mutationLog],...n.appearance?{appearance:cS(n.appearance)}:{},...n.morphology?{morphology:{...n.morphology}}:{}}}function cS(n){const t={...n,palette:{...n.palette},profile:{...n.profile},individual:{...n.individual},growth:{...n.growth}};return n.coat&&(t.coat={...n.coat,colours:Object.fromEntries(Object.entries(n.coat.colours).map(([e,i])=>[e,[...i]]))}),n.lineage&&(t.lineage={...n.lineage}),t}const lS={browser:{torsoLength:1.72,torsoHeight:.82,torsoWidth:.68,legLength:1.08,upperLegFraction:.53,stanceWidth:.76,neckLength:.58,neckRise:.34,headLength:.48,headWidth:.32,tailLength:.48,footLength:.25,footWidth:.15,hornLength:.22,earLength:.18,armor:.08,walkSpeed:1.05,runSpeed:3.15,strideLength:.9},runner:{torsoLength:1.94,torsoHeight:.66,torsoWidth:.48,legLength:1.46,upperLegFraction:.52,stanceWidth:.58,neckLength:.38,neckRise:.2,headLength:.44,headWidth:.25,tailLength:1.05,footLength:.3,footWidth:.11,hornLength:0,earLength:.24,armor:.02,walkSpeed:1.55,runSpeed:5.6,strideLength:1.35},"low-slung":{torsoLength:1.8,torsoHeight:.48,torsoWidth:.82,legLength:.62,upperLegFraction:.49,stanceWidth:.92,neckLength:.31,neckRise:.1,headLength:.52,headWidth:.42,tailLength:.3,footLength:.28,footWidth:.23,hornLength:.08,earLength:.12,armor:.58,walkSpeed:.72,runSpeed:2.25,strideLength:.58},"long-neck":{torsoLength:1.66,torsoHeight:.76,torsoWidth:.57,legLength:1.35,upperLegFraction:.54,stanceWidth:.68,neckLength:1.42,neckRise:.82,headLength:.43,headWidth:.27,tailLength:.72,footLength:.27,footWidth:.14,hornLength:0,earLength:.2,armor:.05,walkSpeed:1.12,runSpeed:3.45,strideLength:1.08}},gp={torsoLength:[.7,3.2],torsoHeight:[.25,1.5],torsoWidth:[.25,1.5],legLength:[.35,2.5],upperLegFraction:[.4,.62],stanceWidth:[.35,1.5],neckLength:[.15,2.8],neckRise:[0,1.8],headLength:[.2,1],headWidth:[.12,.7],tailLength:[0,1.8],footLength:[.1,.65],footWidth:[.06,.45],hornLength:[0,.9],earLength:[0,.45],armor:[0,1],walkSpeed:[.4,2.4],runSpeed:[1.2,7.5],strideLength:[.18,1.9]};function xp(n){for(const[t,[e,i]]of Object.entries(gp))n[t]=Zi(sS(n[t],e,i));return n.runSpeed=Zi(Math.max(n.runSpeed,n.walkSpeed*1.75)),n}function ZS(n,t,e){rS(n),oS(t);const i=mp(n).toString(16),s=lS[t],r={version:fp,archetype:t,...s,color:Sf[Math.floor(mc(`${i}/color`)*Sf.length)],accentColor:Ef[Math.floor(mc(`${i}/accent`)*Ef.length)],pattern:["plain","stripes","spots"][Math.floor(mc(`${i}/pattern`)*3)],mutationLog:[`${t} founder anatomy`]};for(const o of["torsoLength","torsoHeight","torsoWidth","legLength","neckLength","headLength","tailLength","footLength","earLength"])r[o]=Zi(r[o]*(1+iS(`${i}/${o}`,-.07,.07)));return xp(r)}function QS(n,t,e,i="adult",s){if(uS(n).length)throw new Error("Invalid creature genome");if(typeof t!="string"||!t||!Number.isInteger(e)||e<0||e>3||i!=="adult"&&i!=="juvenile")throw new Error("Invalid creature specimen request");if(s!==void 0&&!Q0.includes(s))throw new Error("Invalid fauna morphology family");const r=s??Ac(n),o=aS(n),a=X2(n,t,e,i),l=a.profile,c=a.individual,u=(b,S)=>{o[b]=Zi(o[b]*S)},d=1+c.size*(Ys(a)?n.archetype==="long-neck"?.1:.07:.045),p=1+c.condition*(Ys(a)?n.archetype==="low-slung"?.13:.09:.055);for(const b of["torsoLength","torsoHeight","torsoWidth","legLength","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","strideLength"])u(b,d);u("torsoLength",1+l.mass*.035),u("torsoHeight",(1+l.mass*.055)*p),u("torsoWidth",(1+l.mass*.075)*p),u("stanceWidth",1+l.mass*.065),u("footWidth",1+l.mass*.05),u("legLength",1+l.limb*.055-l.mass*.025),u("strideLength",1+l.limb*.055-l.mass*.025),u("neckLength",1+l.neck*.07),u("neckRise",1+l.neck*.06),u("headLength",1+c.muzzle*.065),u("headWidth",1+c.condition*.035),u("earLength",1+c.ears*.12);const m=Ys(a),g=m?1+(c.limb??0)*(n.archetype==="long-neck"?.06:.04):1,x=m?1+(c.neck??0)*(n.archetype==="long-neck"?.14:.07):1;m&&(u("legLength",g),u("strideLength",g),u("neckLength",x),u("neckRise",x),u("tailLength",1+(c.tail??0)*.1));const f=c.sex,h=Number.isFinite(l.dimorphism)?l.dimorphism:0;if(f==="male"){const b=1+.06*h;for(const S of["torsoLength","torsoHeight","torsoWidth","legLength","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","strideLength"])u(S,b);u("hornLength",1+.4*h)}else f==="female"&&(u("hornLength",1-.7*h),l.hornlessFemales&&(o.hornLength=0));if(s!==void 0){const S={ungulate:[.48,.39,.64,.34,.28,.17],cursorial:[.34,.26,.76,.23,.25,.14],padded:[.29,.48,.35,.18,.31,.24],"long-neck":[.46,.35,.83,.88,.25,.16],proboscidean:[.57,.49,.51,.17,.34,.29],winged:[.39,.34,.63,.34,.27,.17]}[r],y=o.torsoLength;o.torsoHeight=y*S[0]*p,o.torsoWidth=y*S[1]*p,o.legLength=y*S[2]*(1+l.limb*.035)*g,o.neckLength=y*S[3]*(1+l.neck*.035)*x,o.headLength=y*S[4]*(1+c.muzzle*.065),o.headWidth=y*S[5],o.neckRise=o.neckLength*(r==="long-neck"?.59:.45),o.stanceWidth=o.torsoWidth*1.1,o.footWidth=o.torsoWidth*(r==="proboscidean"?.27:.23),o.footLength=o.footWidth*1.5,o.strideLength=o.legLength*.82,o.hornLength=r==="ungulate"?Math.min(o.hornLength,o.headLength*.65):0,o.armor=r==="padded"?Math.min(o.armor,.4):0}if(r==="proboscidean"){const b=m?p:1,S=m?1+c.condition*.035:1,y=m?1+c.ears*.12:1;o.torsoHeight=Math.max(o.torsoHeight,o.torsoLength*.48*b),o.headWidth=Math.max(o.headWidth,o.headLength*.77*S),o.footWidth=Math.max(o.footWidth,o.torsoWidth*.25),o.hornLength=0,o.armor=0,o.earLength=Math.max(o.earLength,o.headLength*.52*y)}if(r!=="ungulate"&&o.hornLength>0&&(o.hornLength=0,o.mutationLog.push(`${r} face: horns not grown (only hoofed browsers carry horns)`)),s!==void 0&&Ys(a)&&s!==Ac(n)){const b=ep(n).coat;a.palette.base=fc(ap(cp(n),b,n.archetype,lp(n.archetype,b,a.individualKey),r,sp(o,r)))}f==="male"&&(o.torsoWidth*=1+.06*h);const M=o.legLength/n.legLength;o.walkSpeed*=Math.sqrt(M),o.runSpeed*=Math.sqrt(M),o.strideLength=Math.min(o.strideLength,o.legLength*.96);const _=o.torsoWidth/o.torsoLength;if(i==="juvenile"){const S=j2[r==="long-neck"?"long-neck":r==="cursorial"?"runner":r==="padded"||r==="proboscidean"?"low-slung":"browser"];Ys(a)?hS(o,S,a.growth.maturity):(u("torsoLength",S.trunk),u("torsoHeight",S.trunk),u("torsoWidth",S.width),u("legLength",S.limb),u("stanceWidth",S.width),u("neckLength",S.neck),u("neckRise",S.neck),u("headLength",S.head),u("headWidth",S.head),u("footLength",S.foot),u("footWidth",S.foot),u("earLength",S.ear),u("tailLength",S.trunk),u("hornLength",.18),u("armor",.6),u("strideLength",S.limb),u("walkSpeed",Math.sqrt(S.limb)),u("runSpeed",Math.sqrt(S.limb)))}if(Ys(a)&&r==="long-neck"&&o.neckLength<o.torsoLength*.6){const b=o.torsoLength*.6/o.neckLength;o.neckLength*=b,o.neckRise*=b}return Ys(a)&&r==="padded"&&(o.legLength=Math.min(o.legLength,o.torsoLength*.445)),xp(o),o.footWidth=Zi(Math.min(o.footWidth,o.stanceWidth*.55)),o.strideLength=Zi(Math.min(o.strideLength,o.legLength*.96)),Ys(a)&&i==="juvenile"&&(a.growth.lateral=Math.round(_/(o.torsoWidth/o.torsoLength)*1e6)/1e6),o.appearance=a,o.color=a.palette.base,o.accentColor=a.palette.marking,o.morphology={version:"fauna-morphology-1",family:r,footType:r==="ungulate"||r==="long-neck"?"hoof":r==="padded"||r==="proboscidean"?"broad-pad":"paw",trunkLength:r==="proboscidean"?Zi(Math.min(1.45,o.headLength*1.9)):0,wingSpan:r==="winged"?Zi(o.torsoLength*1.85):0,wingState:r==="winged"?"folded":"none"},o.mutationLog.push(`${r} phenotype; ${i} anatomy and identity-preserving coat${f?`; ${f}`:""}`),o}function Ys(n){return n.version===ua&&!!n.coat}function hS(n,t,e){const i=(1-e)/(1-$2),s=f=>1-(1-f)*i,r=s(t.trunk),o=s(t.width),a=s(t.limb)*(1+.12*(1-e)),l=s(t.neck),c=s(t.head),u=s(t.foot),d=s(t.ear),p=(f,h)=>{n[f]=Zi(n[f]*h)};p("torsoLength",r),p("torsoHeight",r),p("torsoWidth",o),p("legLength",a),p("stanceWidth",o),p("neckLength",l),p("neckRise",l),p("footLength",u),p("footWidth",u),p("earLength",d),p("tailLength",r);const m=n.headLength*c,g=.05*(1-e)/(1-.22)*n.torsoLength,x=(m+g)/m;n.headLength=Zi(m*x),n.headWidth=Zi(n.headWidth*c*x),p("hornLength",Math.min(e*e,.2)),p("armor",.6),p("strideLength",a),p("walkSpeed",Math.sqrt(a)),p("runSpeed",Math.sqrt(a))}function uS(n){const t=[];if(!n||typeof n!="object")return["genome must be an object"];n.version!==fp&&t.push("unsupported genome version"),pp.includes(n.archetype)||t.push("unknown archetype");const e=["torsoLength","torsoHeight","torsoWidth","legLength","upperLegFraction","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","armor","walkSpeed","runSpeed","strideLength"];for(const i of e){const s=n[i],[r,o]=gp[i];(!Number.isFinite(s)||s<r||s>o)&&t.push(`${i} must be a finite number from ${r} to ${o}`)}if((n.upperLegFraction<.35||n.upperLegFraction>.7)&&t.push("upperLegFraction must permit a two-segment leg"),(n.legLength<=0||n.torsoLength<=0||n.torsoHeight<=0||n.torsoWidth<=0||n.stanceWidth<=0||n.headLength<=0||n.footWidth<=0)&&t.push("core body dimensions must be positive"),n.runSpeed<=n.walkSpeed&&t.push("runSpeed must exceed walkSpeed"),(!/^#[0-9a-f]{6}$/i.test(n.color)||!/^#[0-9a-f]{6}$/i.test(n.accentColor))&&t.push("colors must be #RRGGBB"),["plain","stripes","spots"].includes(n.pattern)||t.push("unknown pattern"),(!Array.isArray(n.mutationLog)||!n.mutationLog.every(i=>typeof i=="string"))&&t.push("mutationLog must be string[]"),n.appearance!==void 0){const i=n.appearance;if(!i||i.version!==ua&&i.version!==w2)t.push("unsupported fauna appearance version");else{if(i.version===ua){t.push(...q2(i.coat)),(!i.individual||i.individual.sex!=="female"&&i.individual.sex!=="male")&&t.push("invalid individual sex"),(!i.individual||!Number.isFinite(i.individual.coatPhase)||i.individual.coatPhase<0||i.individual.coatPhase>1)&&t.push("invalid individual coat phase"),(!i.profile||!Number.isFinite(i.profile.dimorphism)||i.profile.dimorphism<0||i.profile.dimorphism>1||typeof i.profile.hornlessFemales!="boolean")&&t.push("invalid species dimorphism"),(!i.lineage||!Y2(i.lineage.family)||typeof i.lineage.pattern!="string")&&t.push("invalid coat lineage");for(const s of["limb","neck","tail"]){const r=i.individual?.[s];r!==void 0&&(!Number.isFinite(r)||r<-1||r>1)&&t.push(`invalid individual ${s} axis`)}(!i.growth||!Number.isFinite(i.growth.lateral)||i.growth.lateral<.5||i.growth.lateral>2)&&t.push("invalid coat growth frame")}(typeof i.individualKey!="string"||!i.individualKey||!Number.isInteger(i.markingSeed)||i.markingSeed<0||i.markingSeed>4294967295)&&t.push("invalid appearance identity"),["plain","stripes","spots"].includes(i.pattern)||t.push("invalid appearance pattern"),(!i.palette||!["base","marking","belly"].every(s=>/^#[0-9a-f]{6}$/i.test(i.palette[s]??"")))&&t.push("invalid appearance palette"),(!Number.isFinite(i.roughness)||i.roughness<.65||i.roughness>1)&&t.push("invalid coat roughness"),(!i.profile||!["mass","limb","neck"].every(s=>Number.isFinite(i.profile[s])&&Math.abs(i.profile[s])<=1))&&t.push("invalid species profile"),(!i.individual||!["size","condition","muzzle","ears"].every(s=>Number.isFinite(i.individual[s])&&Math.abs(i.individual[s])<=1))&&t.push("invalid individual profile"),(!i.growth||!["adult","juvenile"].includes(i.growth.stage)||!Number.isFinite(i.growth.maturity)||i.growth.maturity<0||i.growth.maturity>1)&&t.push("invalid growth profile")}}if(n.morphology!==void 0){const i=n.morphology;if(!i||i.version!=="fauna-morphology-1"||!Q0.includes(i.family))t.push("unsupported fauna morphology");else{["paw","hoof","broad-pad"].includes(i.footType)||t.push("invalid morphology feet"),(!Number.isFinite(i.trunkLength)||i.trunkLength<0||i.trunkLength>1.5||!Number.isFinite(i.wingSpan)||i.wingSpan<0||i.wingSpan>6)&&t.push("invalid morphology appendage dimensions"),i.wingState!=="none"&&i.wingState!=="folded"&&t.push("invalid wing state"),(i.family==="winged"!=i.wingSpan>0||i.wingState!==(i.family==="winged"?"folded":"none")||i.family==="proboscidean"!=i.trunkLength>0)&&t.push("incoherent morphology appendages");const s=i.family==="ungulate"||i.family==="long-neck"?"hoof":i.family==="padded"||i.family==="proboscidean"?"broad-pad":"paw";i.footType!==s&&t.push("incoherent morphology feet")}}return t}export{Ji as $,Jp as A,Hi as B,$S as C,fS as D,jM as E,zi as F,vS as G,_S as H,rd as I,kS as J,WS as K,du as L,dg as M,Ai as N,wS as O,ji as P,fn as Q,om as R,sr as S,YM as T,qM as U,dt as V,ES as W,XM as X,LS as Y,ru as Z,Ic as _,Ri as a,BS as a$,oa as a0,aa as a1,yn as a2,su as a3,pa as a4,TS as a5,Oi as a6,Nc as a7,fa as a8,iu as a9,zS as aA,jS as aB,Vf as aC,HS as aD,XS as aE,qS as aF,Ty as aG,Ov as aH,hu as aI,fp as aJ,uS as aK,oo as aL,ro as aM,ua as aN,KS as aO,us as aP,im as aQ,yS as aR,ZS as aS,QS as aT,fc as aU,D2 as aV,sp as aW,Ac as aX,SS as aY,MS as aZ,dS as a_,IS as aa,FS as ab,US as ac,yc as ad,oy as ae,Cc as af,ir as ag,PS as ah,OS as ai,IM as aj,M0 as ak,vM as al,RS as am,f0 as an,Im as ao,po as ap,Ch as aq,p0 as ar,Ci as as,tu as at,Yf as au,MM as av,FM as aw,kM as ax,As as ay,Fv as az,gS as b,AS as b0,YS as b1,VS as b2,CS as b3,rv as b4,Ey as b5,Xv as b6,wy as b7,cv as b8,fg as c,ke as d,Qh as e,Vi as f,ts as g,za as h,Kd as i,GS as j,pS as k,He as l,ki as m,Cp as n,bS as o,Lc as p,xS as q,DS as r,Jh as s,Mr as t,NS as u,Jd as v,mS as w,rg as x,qf as y,Wd as z};
