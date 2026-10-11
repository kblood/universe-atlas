const MS="181",Qr={ROTATE:0,DOLLY:1,PAN:2},Yr={ROTATE:0,PAN:1,DOLLY_PAN:2,DOLLY_ROTATE:3},Lp=0,vu=1,Pp=2,Sf=1,Dp=2,Ss=3,nr=0,gi=1,Ts=2,Cs=0,Jr=1,yu=2,Su=3,Eu=4,Ip=5,fr=100,Up=101,Np=102,Op=103,Fp=104,kp=200,zp=201,Bp=202,Vp=203,kl=204,zl=205,Hp=206,Gp=207,Wp=208,Xp=209,qp=210,Yp=211,jp=212,$p=213,Kp=214,Bl=0,Vl=1,Hl=2,ao=3,Gl=4,Wl=5,Xl=6,ql=7,Ef=0,Zp=1,Qp=2,tr=0,Jp=1,em=2,tm=3,nm=4,im=5,sm=6,rm=7,wu="attached",om="detached",wf=300,co=301,lo=302,Yl=303,jl=304,Tc=306,$l=1e3,As=1001,Kl=1002,Ti=1003,am=1004,va=1005,ki=1006,Hc=1007,mr=1008,ls=1009,Tf=1010,Af=1011,na=1012,Bh=1013,_r=1014,ji=1015,_o=1016,Vh=1017,Hh=1018,eo=1020,Rf=35902,Cf=35899,Lf=1021,Pf=1022,zi=1023,ho=1026,to=1027,Df=1028,Gh=1029,Wh=1030,Xh=1031,qh=1033,rc=33776,oc=33777,ac=33778,cc=33779,Zl=35840,Ql=35841,Jl=35842,eh=35843,th=36196,nh=37492,ih=37496,sh=37808,rh=37809,oh=37810,ah=37811,ch=37812,lh=37813,hh=37814,uh=37815,dh=37816,fh=37817,ph=37818,mh=37819,gh=37820,xh=37821,_h=36492,bh=36494,Mh=36495,vh=36283,yh=36284,Sh=36285,Eh=36286,cm=3200,lm=3201,If=0,hm=1,Zs="",Oi="srgb",uo="srgb-linear",pc="linear",hn="srgb",Ar=7680,Tu=519,um=512,dm=513,fm=514,Uf=515,pm=516,mm=517,gm=518,xm=519,Au=35044,Ru="300 es",cs=2e3,mc=2001;function Nf(n){for(let e=n.length-1;e>=0;--e)if(n[e]>=65535)return!0;return!1}function gc(n){return document.createElementNS("http://www.w3.org/1999/xhtml",n)}function _m(){const n=gc("canvas");return n.style.display="block",n}const Cu={};function Lu(...n){const e="THREE."+n.shift();console.log(e,...n)}function Mt(...n){const e="THREE."+n.shift();console.warn(e,...n)}function Rn(...n){const e="THREE."+n.shift();console.error(e,...n)}function ia(...n){const e=n.join(" ");e in Cu||(Cu[e]=!0,Mt(...n))}function bm(n,e,t){return new Promise(function(i,s){function r(){switch(n.clientWaitSync(e,n.SYNC_FLUSH_COMMANDS_BIT,0)){case n.WAIT_FAILED:s();break;case n.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:i()}}setTimeout(r,t)})}class Mr{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});const i=this._listeners;i[e]===void 0&&(i[e]=[]),i[e].indexOf(t)===-1&&i[e].push(t)}hasEventListener(e,t){const i=this._listeners;return i===void 0?!1:i[e]!==void 0&&i[e].indexOf(t)!==-1}removeEventListener(e,t){const i=this._listeners;if(i===void 0)return;const s=i[e];if(s!==void 0){const r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){const t=this._listeners;if(t===void 0)return;const i=t[e.type];if(i!==void 0){e.target=this;const s=i.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}}const Qn=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"];let Pu=1234567;const jo=Math.PI/180,sa=180/Math.PI;function vr(){const n=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,i=Math.random()*4294967295|0;return(Qn[n&255]+Qn[n>>8&255]+Qn[n>>16&255]+Qn[n>>24&255]+"-"+Qn[e&255]+Qn[e>>8&255]+"-"+Qn[e>>16&15|64]+Qn[e>>24&255]+"-"+Qn[t&63|128]+Qn[t>>8&255]+"-"+Qn[t>>16&255]+Qn[t>>24&255]+Qn[i&255]+Qn[i>>8&255]+Qn[i>>16&255]+Qn[i>>24&255]).toLowerCase()}function Vt(n,e,t){return Math.max(e,Math.min(t,n))}function Yh(n,e){return(n%e+e)%e}function Mm(n,e,t,i,s){return i+(n-e)*(s-i)/(t-e)}function vm(n,e,t){return n!==e?(t-n)/(e-n):0}function $o(n,e,t){return(1-t)*n+t*e}function ym(n,e,t,i){return $o(n,e,1-Math.exp(-t*i))}function Sm(n,e=1){return e-Math.abs(Yh(n,e*2)-e)}function Em(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*(3-2*n))}function wm(n,e,t){return n<=e?0:n>=t?1:(n=(n-e)/(t-e),n*n*n*(n*(n*6-15)+10))}function Tm(n,e){return n+Math.floor(Math.random()*(e-n+1))}function Am(n,e){return n+Math.random()*(e-n)}function Rm(n){return n*(.5-Math.random())}function Cm(n){n!==void 0&&(Pu=n);let e=Pu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Lm(n){return n*jo}function Pm(n){return n*sa}function Dm(n){return(n&n-1)===0&&n!==0}function Im(n){return Math.pow(2,Math.ceil(Math.log(n)/Math.LN2))}function Um(n){return Math.pow(2,Math.floor(Math.log(n)/Math.LN2))}function Nm(n,e,t,i,s){const r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+i)/2),u=o((e+i)/2),f=r((e-i)/2),p=o((e-i)/2),m=r((i-e)/2),g=o((i-e)/2);switch(s){case"XYX":n.set(a*u,l*f,l*p,a*c);break;case"YZY":n.set(l*p,a*u,l*f,a*c);break;case"ZXZ":n.set(l*f,l*p,a*u,a*c);break;case"XZX":n.set(a*u,l*g,l*m,a*c);break;case"YXY":n.set(l*m,a*u,l*g,a*c);break;case"ZYZ":n.set(l*g,l*m,a*u,a*c);break;default:Mt("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Wr(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return n/4294967295;case Uint16Array:return n/65535;case Uint8Array:return n/255;case Int32Array:return Math.max(n/2147483647,-1);case Int16Array:return Math.max(n/32767,-1);case Int8Array:return Math.max(n/127,-1);default:throw new Error("Invalid component type.")}}function ri(n,e){switch(e.constructor){case Float32Array:return n;case Uint32Array:return Math.round(n*4294967295);case Uint16Array:return Math.round(n*65535);case Uint8Array:return Math.round(n*255);case Int32Array:return Math.round(n*2147483647);case Int16Array:return Math.round(n*32767);case Int8Array:return Math.round(n*127);default:throw new Error("Invalid component type.")}}const Of={DEG2RAD:jo,RAD2DEG:sa,generateUUID:vr,clamp:Vt,euclideanModulo:Yh,mapLinear:Mm,inverseLerp:vm,lerp:$o,damp:ym,pingpong:Sm,smoothstep:Em,smootherstep:wm,randInt:Tm,randFloat:Am,randFloatSpread:Rm,seededRandom:Cm,degToRad:Lm,radToDeg:Pm,isPowerOfTwo:Dm,ceilPowerOfTwo:Im,floorPowerOfTwo:Um,setQuaternionFromProperEuler:Nm,normalize:ri,denormalize:Wr};class Ot{constructor(e=0,t=0){Ot.prototype.isVector2=!0,this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){const t=this.x,i=this.y,s=e.elements;return this.x=s[0]*t+s[3]*i+s[6],this.y=s[1]*t+s[4]*i+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Vt(this.x,e.x,t.x),this.y=Vt(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Vt(this.x,e,t),this.y=Vt(this.y,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Vt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Vt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y;return t*t+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){const i=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*i-o*s+e.x,this.y=r*s+o*i+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}}class dn{constructor(e=0,t=0,i=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=i,this._w=s}static slerpFlat(e,t,i,s,r,o,a){let l=i[s+0],c=i[s+1],u=i[s+2],f=i[s+3],p=r[o+0],m=r[o+1],g=r[o+2],x=r[o+3];if(a<=0){e[t+0]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f;return}if(a>=1){e[t+0]=p,e[t+1]=m,e[t+2]=g,e[t+3]=x;return}if(f!==x||l!==p||c!==m||u!==g){let d=l*p+c*m+u*g+f*x;d<0&&(p=-p,m=-m,g=-g,x=-x,d=-d);let h=1-a;if(d<.9995){const M=Math.acos(d),_=Math.sin(M);h=Math.sin(h*M)/_,a=Math.sin(a*M)/_,l=l*h+p*a,c=c*h+m*a,u=u*h+g*a,f=f*h+x*a}else{l=l*h+p*a,c=c*h+m*a,u=u*h+g*a,f=f*h+x*a;const M=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=M,c*=M,u*=M,f*=M}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,i,s,r,o){const a=i[s],l=i[s+1],c=i[s+2],u=i[s+3],f=r[o],p=r[o+1],m=r[o+2],g=r[o+3];return e[t]=a*g+u*f+l*m-c*p,e[t+1]=l*g+u*p+c*f-a*m,e[t+2]=c*g+u*m+a*p-l*f,e[t+3]=u*g-a*f-l*p-c*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,i,s){return this._x=e,this._y=t,this._z=i,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){const i=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(i/2),u=a(s/2),f=a(r/2),p=l(i/2),m=l(s/2),g=l(r/2);switch(o){case"XYZ":this._x=p*u*f+c*m*g,this._y=c*m*f-p*u*g,this._z=c*u*g+p*m*f,this._w=c*u*f-p*m*g;break;case"YXZ":this._x=p*u*f+c*m*g,this._y=c*m*f-p*u*g,this._z=c*u*g-p*m*f,this._w=c*u*f+p*m*g;break;case"ZXY":this._x=p*u*f-c*m*g,this._y=c*m*f+p*u*g,this._z=c*u*g+p*m*f,this._w=c*u*f-p*m*g;break;case"ZYX":this._x=p*u*f-c*m*g,this._y=c*m*f+p*u*g,this._z=c*u*g-p*m*f,this._w=c*u*f+p*m*g;break;case"YZX":this._x=p*u*f+c*m*g,this._y=c*m*f+p*u*g,this._z=c*u*g-p*m*f,this._w=c*u*f-p*m*g;break;case"XZY":this._x=p*u*f-c*m*g,this._y=c*m*f-p*u*g,this._z=c*u*g+p*m*f,this._w=c*u*f+p*m*g;break;default:Mt("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){const i=t/2,s=Math.sin(i);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(i),this._onChangeCallback(),this}setFromRotationMatrix(e){const t=e.elements,i=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],f=t[10],p=i+a+f;if(p>0){const m=.5/Math.sqrt(p+1);this._w=.25/m,this._x=(u-l)*m,this._y=(r-c)*m,this._z=(o-s)*m}else if(i>a&&i>f){const m=2*Math.sqrt(1+i-a-f);this._w=(u-l)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(r+c)/m}else if(a>f){const m=2*Math.sqrt(1+a-i-f);this._w=(r-c)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(l+u)/m}else{const m=2*Math.sqrt(1+f-i-a);this._w=(o-s)/m,this._x=(r+c)/m,this._y=(l+u)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let i=e.dot(t)+1;return i<1e-8?(i=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=i):(this._x=0,this._y=-e.z,this._z=e.y,this._w=i)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=i),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Vt(this.dot(e),-1,1)))}rotateTowards(e,t){const i=this.angleTo(e);if(i===0)return this;const s=Math.min(1,t/i);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){const i=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=i*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-i*c,this._z=r*u+o*c+i*l-s*a,this._w=o*u-i*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){if(t<=0)return this;if(t>=1)return this.copy(e);let i=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(i=-i,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){const c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+i*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,i){return this.copy(e).slerp(t,i)}random(){const e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),i=Math.random(),s=Math.sqrt(1-i),r=Math.sqrt(i);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}}class ue{constructor(e=0,t=0,i=0){ue.prototype.isVector3=!0,this.x=e,this.y=t,this.z=i}set(e,t,i){return i===void 0&&(i=this.z),this.x=e,this.y=t,this.z=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(Du.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(Du.setFromAxisAngle(e,t))}applyMatrix3(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*i+r[6]*s,this.y=r[1]*t+r[4]*i+r[7]*s,this.z=r[2]*t+r[5]*i+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*i+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*i+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*i+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*i+r[10]*s+r[14])*o,this}applyQuaternion(e){const t=this.x,i=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*i),u=2*(a*t-r*s),f=2*(r*i-o*t);return this.x=t+l*c+o*f-a*u,this.y=i+l*u+a*c-r*f,this.z=s+l*f+r*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){const t=this.x,i=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*i+r[8]*s,this.y=r[1]*t+r[5]*i+r[9]*s,this.z=r[2]*t+r[6]*i+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Vt(this.x,e.x,t.x),this.y=Vt(this.y,e.y,t.y),this.z=Vt(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Vt(this.x,e,t),this.y=Vt(this.y,e,t),this.z=Vt(this.z,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Vt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){const i=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-i*l,this.z=i*a-s*o,this}projectOnVector(e){const t=e.lengthSq();if(t===0)return this.set(0,0,0);const i=e.dot(this)/t;return this.copy(e).multiplyScalar(i)}projectOnPlane(e){return Gc.copy(this).projectOnVector(e),this.sub(Gc)}reflect(e){return this.sub(Gc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){const t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;const i=this.dot(e)/t;return Math.acos(Vt(i,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){const t=this.x-e.x,i=this.y-e.y,s=this.z-e.z;return t*t+i*i+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,i){const s=Math.sin(t)*e;return this.x=s*Math.sin(i),this.y=Math.cos(t)*e,this.z=s*Math.cos(i),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,i){return this.x=e*Math.sin(t),this.y=i,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){const t=this.setFromMatrixColumn(e,0).length(),i=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=i,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){const e=Math.random()*Math.PI*2,t=Math.random()*2-1,i=Math.sqrt(1-t*t);return this.x=i*Math.cos(e),this.y=t,this.z=i*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}}const Gc=new ue,Du=new dn;class Nt{constructor(e,t,i,s,r,o,a,l,c){Nt.prototype.isMatrix3=!0,this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,l,c)}set(e,t,i,s,r,o,a,l,c){const u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=l,u[6]=i,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],this}extractBasis(e,t,i){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),i.setFromMatrix3Column(this,2),this}setFromMatrix4(e){const t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[3],l=i[6],c=i[1],u=i[4],f=i[7],p=i[2],m=i[5],g=i[8],x=s[0],d=s[3],h=s[6],M=s[1],_=s[4],b=s[7],S=s[2],v=s[5],E=s[8];return r[0]=o*x+a*M+l*S,r[3]=o*d+a*_+l*v,r[6]=o*h+a*b+l*E,r[1]=c*x+u*M+f*S,r[4]=c*d+u*_+f*v,r[7]=c*h+u*b+f*E,r[2]=p*x+m*M+g*S,r[5]=p*d+m*_+g*v,r[8]=p*h+m*b+g*E,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-i*r*u+i*a*l+s*r*c-s*o*l}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=u*o-a*c,p=a*l-u*r,m=c*r-o*l,g=t*f+i*p+s*m;if(g===0)return this.set(0,0,0,0,0,0,0,0,0);const x=1/g;return e[0]=f*x,e[1]=(s*c-u*i)*x,e[2]=(a*i-s*o)*x,e[3]=p*x,e[4]=(u*t-s*l)*x,e[5]=(s*r-a*t)*x,e[6]=m*x,e[7]=(i*l-c*t)*x,e[8]=(o*t-i*r)*x,this}transpose(){let e;const t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){const t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,i,s,r,o,a){const l=Math.cos(r),c=Math.sin(r);return this.set(i*l,i*c,-i*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return this.premultiply(Wc.makeScale(e,t)),this}rotate(e){return this.premultiply(Wc.makeRotation(-e)),this}translate(e,t){return this.premultiply(Wc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,i,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<9;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<9;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e}clone(){return new this.constructor().fromArray(this.elements)}}const Wc=new Nt,Iu=new Nt().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Uu=new Nt().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Om(){const n={enabled:!0,workingColorSpace:uo,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===hn&&(s.r=Ls(s.r),s.g=Ls(s.g),s.b=Ls(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===hn&&(s.r=no(s.r),s.g=no(s.g),s.b=no(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===Zs?pc:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return ia("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),n.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return ia("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),n.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],i=[.3127,.329];return n.define({[uo]:{primaries:e,whitePoint:i,transfer:pc,toXYZ:Iu,fromXYZ:Uu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Oi},outputColorSpaceConfig:{drawingBufferColorSpace:Oi}},[Oi]:{primaries:e,whitePoint:i,transfer:hn,toXYZ:Iu,fromXYZ:Uu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Oi}}}),n}const tn=Om();function Ls(n){return n<.04045?n*.0773993808:Math.pow(n*.9478672986+.0521327014,2.4)}function no(n){return n<.0031308?n*12.92:1.055*Math.pow(n,.41666)-.055}let Rr;class Fm{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let i;if(e instanceof HTMLCanvasElement)i=e;else{Rr===void 0&&(Rr=gc("canvas")),Rr.width=e.width,Rr.height=e.height;const s=Rr.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),i=Rr}return i.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){const t=gc("canvas");t.width=e.width,t.height=e.height;const i=t.getContext("2d");i.drawImage(e,0,0,e.width,e.height);const s=i.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=Ls(r[o]/255)*255;return i.putImageData(s,0,0),t}else if(e.data){const t=e.data.slice(0);for(let i=0;i<t.length;i++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[i]=Math.floor(Ls(t[i]/255)*255):t[i]=Ls(t[i]);return{data:t,width:e.width,height:e.height}}else return Mt("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}}let km=0;class jh{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:km++}),this.uuid=vr(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){const t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):t instanceof VideoFrame?e.set(t.displayHeight,t.displayWidth,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];const i={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Xc(s[o].image)):r.push(Xc(s[o]))}else r=Xc(s);i.url=r}return t||(e.images[this.uuid]=i),i}}function Xc(n){return typeof HTMLImageElement<"u"&&n instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&n instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&n instanceof ImageBitmap?Fm.getDataURL(n):n.data?{data:Array.from(n.data),width:n.width,height:n.height,type:n.data.constructor.name}:(Mt("Texture: Unable to serialize Texture."),{})}let zm=0;const qc=new ue;class ai extends Mr{constructor(e=ai.DEFAULT_IMAGE,t=ai.DEFAULT_MAPPING,i=As,s=As,r=ki,o=mr,a=zi,l=ls,c=ai.DEFAULT_ANISOTROPY,u=Zs){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:zm++}),this.uuid=vr(),this.name="",this.source=new jh(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=i,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ot(0,0),this.repeat=new Ot(1,1),this.center=new Ot(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Nt,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0}get width(){return this.source.getSize(qc).x}get height(){return this.source.getSize(qc).y}get depth(){return this.source.getSize(qc).z}get image(){return this.source.data}set image(e=null){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(const t in e){const i=e[t];if(i===void 0){Mt(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Mt(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&i&&s.isVector2&&i.isVector2||s&&i&&s.isVector3&&i.isVector3||s&&i&&s.isMatrix3&&i.isMatrix3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];const i={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(i.userData=this.userData),t||(e.textures[this.uuid]=i),i}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==wf)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case $l:e.x=e.x-Math.floor(e.x);break;case As:e.x=e.x<0?0:1;break;case Kl:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case $l:e.y=e.y-Math.floor(e.y);break;case As:e.y=e.y<0?0:1;break;case Kl:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}}ai.DEFAULT_IMAGE=null;ai.DEFAULT_MAPPING=wf;ai.DEFAULT_ANISOTROPY=1;class Mn{constructor(e=0,t=0,i=0,s=1){Mn.prototype.isVector4=!0,this.x=e,this.y=t,this.z=i,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,i,s){return this.x=e,this.y=t,this.z=i,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){const t=this.x,i=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*i+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*i+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*i+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*i+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);const t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,i,s,r;const l=e.elements,c=l[0],u=l[4],f=l[8],p=l[1],m=l[5],g=l[9],x=l[2],d=l[6],h=l[10];if(Math.abs(u-p)<.01&&Math.abs(f-x)<.01&&Math.abs(g-d)<.01){if(Math.abs(u+p)<.1&&Math.abs(f+x)<.1&&Math.abs(g+d)<.1&&Math.abs(c+m+h-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;const _=(c+1)/2,b=(m+1)/2,S=(h+1)/2,v=(u+p)/4,E=(f+x)/4,R=(g+d)/4;return _>b&&_>S?_<.01?(i=0,s=.707106781,r=.707106781):(i=Math.sqrt(_),s=v/i,r=E/i):b>S?b<.01?(i=.707106781,s=0,r=.707106781):(s=Math.sqrt(b),i=v/s,r=R/s):S<.01?(i=.707106781,s=.707106781,r=0):(r=Math.sqrt(S),i=E/r,s=R/r),this.set(i,s,r,t),this}let M=Math.sqrt((d-g)*(d-g)+(f-x)*(f-x)+(p-u)*(p-u));return Math.abs(M)<.001&&(M=1),this.x=(d-g)/M,this.y=(f-x)/M,this.z=(p-u)/M,this.w=Math.acos((c+m+h-1)/2),this}setFromMatrixPosition(e){const t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Vt(this.x,e.x,t.x),this.y=Vt(this.y,e.y,t.y),this.z=Vt(this.z,e.z,t.z),this.w=Vt(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Vt(this.x,e,t),this.y=Vt(this.y,e,t),this.z=Vt(this.z,e,t),this.w=Vt(this.w,e,t),this}clampLength(e,t){const i=this.length();return this.divideScalar(i||1).multiplyScalar(Vt(i,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,i){return this.x=e.x+(t.x-e.x)*i,this.y=e.y+(t.y-e.y)*i,this.z=e.z+(t.z-e.z)*i,this.w=e.w+(t.w-e.w)*i,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}}class Bm extends Mr{constructor(e=1,t=1,i={}){super(),i=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:ki,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1},i),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=i.depth,this.scissor=new Mn(0,0,e,t),this.scissorTest=!1,this.viewport=new Mn(0,0,e,t);const s={width:e,height:t,depth:i.depth},r=new ai(s);this.textures=[];const o=i.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(i),this.depthBuffer=i.depthBuffer,this.stencilBuffer=i.stencilBuffer,this.resolveDepthBuffer=i.resolveDepthBuffer,this.resolveStencilBuffer=i.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=i.depthTexture,this.samples=i.samples,this.multiview=i.multiview}_setTextureOptions(e={}){const t={minFilter:ki,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let i=0;i<this.textures.length;i++)this.textures[i].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,i=1){if(this.width!==e||this.height!==t||this.depth!==i){this.width=e,this.height=t,this.depth=i;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=i,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,i=e.textures.length;t<i;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;const s=Object.assign({},e.textures[t].image);this.textures[t].source=new jh(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this}dispose(){this.dispatchEvent({type:"dispose"})}}class ir extends Bm{constructor(e=1,t=1,i={}){super(e,t,i),this.isWebGLRenderTarget=!0}}class Ff extends ai{constructor(e=null,t=1,i=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ti,this.minFilter=Ti,this.wrapR=As,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}}class Vm extends ai{constructor(e=null,t=1,i=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:i,depth:s},this.magFilter=Ti,this.minFilter=Ti,this.wrapR=As,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}class Ps{constructor(e=new ue(1/0,1/0,1/0),t=new ue(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t+=3)this.expandByPoint(Gi.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,i=e.count;t<i;t++)this.expandByPoint(Gi.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,i=e.length;t<i;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){const i=Gi.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(i),this.max.copy(e).add(i),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);const i=e.geometry;if(i!==void 0){const r=i.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Gi):Gi.fromBufferAttribute(r,o),Gi.applyMatrix4(e.matrixWorld),this.expandByPoint(Gi);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),ya.copy(e.boundingBox)):(i.boundingBox===null&&i.computeBoundingBox(),ya.copy(i.boundingBox)),ya.applyMatrix4(e.matrixWorld),this.union(ya)}const s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Gi),Gi.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,i;return e.normal.x>0?(t=e.normal.x*this.min.x,i=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,i=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,i+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,i+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,i+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,i+=e.normal.z*this.min.z),t<=-e.constant&&i>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Ao),Sa.subVectors(this.max,Ao),Cr.subVectors(e.a,Ao),Lr.subVectors(e.b,Ao),Pr.subVectors(e.c,Ao),Vs.subVectors(Lr,Cr),Hs.subVectors(Pr,Lr),rr.subVectors(Cr,Pr);let t=[0,-Vs.z,Vs.y,0,-Hs.z,Hs.y,0,-rr.z,rr.y,Vs.z,0,-Vs.x,Hs.z,0,-Hs.x,rr.z,0,-rr.x,-Vs.y,Vs.x,0,-Hs.y,Hs.x,0,-rr.y,rr.x,0];return!Yc(t,Cr,Lr,Pr,Sa)||(t=[1,0,0,0,1,0,0,0,1],!Yc(t,Cr,Lr,Pr,Sa))?!1:(Ea.crossVectors(Vs,Hs),t=[Ea.x,Ea.y,Ea.z],Yc(t,Cr,Lr,Pr,Sa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Gi).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Gi).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(gs[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),gs[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),gs[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),gs[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),gs[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),gs[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),gs[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),gs[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(gs),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}}const gs=[new ue,new ue,new ue,new ue,new ue,new ue,new ue,new ue],Gi=new ue,ya=new Ps,Cr=new ue,Lr=new ue,Pr=new ue,Vs=new ue,Hs=new ue,rr=new ue,Ao=new ue,Sa=new ue,Ea=new ue,or=new ue;function Yc(n,e,t,i,s){for(let r=0,o=n.length-3;r<=o;r+=3){or.fromArray(n,r);const a=s.x*Math.abs(or.x)+s.y*Math.abs(or.y)+s.z*Math.abs(or.z),l=e.dot(or),c=t.dot(or),u=i.dot(or);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}const Hm=new Ps,Ro=new ue,jc=new ue;class bo{constructor(e=new ue,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){const i=this.center;t!==void 0?i.copy(t):Hm.setFromPoints(e).getCenter(i);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,i.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){const t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){const i=this.center.distanceToSquared(e);return t.copy(e),i>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;Ro.subVectors(e,this.center);const t=Ro.lengthSq();if(t>this.radius*this.radius){const i=Math.sqrt(t),s=(i-this.radius)*.5;this.center.addScaledVector(Ro,s/i),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(jc.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(Ro.copy(e.center).add(jc)),this.expandByPoint(Ro.copy(e.center).sub(jc))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}}const xs=new ue,$c=new ue,wa=new ue,Gs=new ue,Kc=new ue,Ta=new ue,Zc=new ue;class Ac{constructor(e=new ue,t=new ue(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,xs)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);const i=t.dot(this.direction);return i<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,i)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){const t=xs.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(xs.copy(this.origin).addScaledVector(this.direction,t),xs.distanceToSquared(e))}distanceSqToSegment(e,t,i,s){$c.copy(e).add(t).multiplyScalar(.5),wa.copy(t).sub(e).normalize(),Gs.copy(this.origin).sub($c);const r=e.distanceTo(t)*.5,o=-this.direction.dot(wa),a=Gs.dot(this.direction),l=-Gs.dot(wa),c=Gs.lengthSq(),u=Math.abs(1-o*o);let f,p,m,g;if(u>0)if(f=o*l-a,p=o*a-l,g=r*u,f>=0)if(p>=-g)if(p<=g){const x=1/u;f*=x,p*=x,m=f*(f+o*p+2*a)+p*(o*f+p+2*l)+c}else p=r,f=Math.max(0,-(o*p+a)),m=-f*f+p*(p+2*l)+c;else p=-r,f=Math.max(0,-(o*p+a)),m=-f*f+p*(p+2*l)+c;else p<=-g?(f=Math.max(0,-(-o*r+a)),p=f>0?-r:Math.min(Math.max(-r,-l),r),m=-f*f+p*(p+2*l)+c):p<=g?(f=0,p=Math.min(Math.max(-r,-l),r),m=p*(p+2*l)+c):(f=Math.max(0,-(o*r+a)),p=f>0?r:Math.min(Math.max(-r,-l),r),m=-f*f+p*(p+2*l)+c);else p=o>0?-r:r,f=Math.max(0,-(o*p+a)),m=-f*f+p*(p+2*l)+c;return i&&i.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy($c).addScaledVector(wa,p),m}intersectSphere(e,t){xs.subVectors(e.center,this.origin);const i=xs.dot(this.direction),s=xs.dot(xs)-i*i,r=e.radius*e.radius;if(s>r)return null;const o=Math.sqrt(r-s),a=i-o,l=i+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){const t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;const i=-(this.origin.dot(e.normal)+e.constant)/t;return i>=0?i:null}intersectPlane(e,t){const i=this.distanceToPlane(e);return i===null?null:this.at(i,t)}intersectsPlane(e){const t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let i,s,r,o,a,l;const c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,p=this.origin;return c>=0?(i=(e.min.x-p.x)*c,s=(e.max.x-p.x)*c):(i=(e.max.x-p.x)*c,s=(e.min.x-p.x)*c),u>=0?(r=(e.min.y-p.y)*u,o=(e.max.y-p.y)*u):(r=(e.max.y-p.y)*u,o=(e.min.y-p.y)*u),i>o||r>s||((r>i||isNaN(i))&&(i=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(e.min.z-p.z)*f,l=(e.max.z-p.z)*f):(a=(e.max.z-p.z)*f,l=(e.min.z-p.z)*f),i>l||a>s)||((a>i||i!==i)&&(i=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(i>=0?i:s,t)}intersectsBox(e){return this.intersectBox(e,xs)!==null}intersectTriangle(e,t,i,s,r){Kc.subVectors(t,e),Ta.subVectors(i,e),Zc.crossVectors(Kc,Ta);let o=this.direction.dot(Zc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Gs.subVectors(this.origin,e);const l=a*this.direction.dot(Ta.crossVectors(Gs,Ta));if(l<0)return null;const c=a*this.direction.dot(Kc.cross(Gs));if(c<0||l+c>o)return null;const u=-a*Gs.dot(Zc);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}}class Ht{constructor(e,t,i,s,r,o,a,l,c,u,f,p,m,g,x,d){Ht.prototype.isMatrix4=!0,this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,i,s,r,o,a,l,c,u,f,p,m,g,x,d)}set(e,t,i,s,r,o,a,l,c,u,f,p,m,g,x,d){const h=this.elements;return h[0]=e,h[4]=t,h[8]=i,h[12]=s,h[1]=r,h[5]=o,h[9]=a,h[13]=l,h[2]=c,h[6]=u,h[10]=f,h[14]=p,h[3]=m,h[7]=g,h[11]=x,h[15]=d,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ht().fromArray(this.elements)}copy(e){const t=this.elements,i=e.elements;return t[0]=i[0],t[1]=i[1],t[2]=i[2],t[3]=i[3],t[4]=i[4],t[5]=i[5],t[6]=i[6],t[7]=i[7],t[8]=i[8],t[9]=i[9],t[10]=i[10],t[11]=i[11],t[12]=i[12],t[13]=i[13],t[14]=i[14],t[15]=i[15],this}copyPosition(e){const t=this.elements,i=e.elements;return t[12]=i[12],t[13]=i[13],t[14]=i[14],this}setFromMatrix3(e){const t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,i){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),i.setFromMatrixColumn(this,2),this}makeBasis(e,t,i){return this.set(e.x,t.x,i.x,0,e.y,t.y,i.y,0,e.z,t.z,i.z,0,0,0,0,1),this}extractRotation(e){const t=this.elements,i=e.elements,s=1/Dr.setFromMatrixColumn(e,0).length(),r=1/Dr.setFromMatrixColumn(e,1).length(),o=1/Dr.setFromMatrixColumn(e,2).length();return t[0]=i[0]*s,t[1]=i[1]*s,t[2]=i[2]*s,t[3]=0,t[4]=i[4]*r,t[5]=i[5]*r,t[6]=i[6]*r,t[7]=0,t[8]=i[8]*o,t[9]=i[9]*o,t[10]=i[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){const t=this.elements,i=e.x,s=e.y,r=e.z,o=Math.cos(i),a=Math.sin(i),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){const p=o*u,m=o*f,g=a*u,x=a*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=m+g*c,t[5]=p-x*c,t[9]=-a*l,t[2]=x-p*c,t[6]=g+m*c,t[10]=o*l}else if(e.order==="YXZ"){const p=l*u,m=l*f,g=c*u,x=c*f;t[0]=p+x*a,t[4]=g*a-m,t[8]=o*c,t[1]=o*f,t[5]=o*u,t[9]=-a,t[2]=m*a-g,t[6]=x+p*a,t[10]=o*l}else if(e.order==="ZXY"){const p=l*u,m=l*f,g=c*u,x=c*f;t[0]=p-x*a,t[4]=-o*f,t[8]=g+m*a,t[1]=m+g*a,t[5]=o*u,t[9]=x-p*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){const p=o*u,m=o*f,g=a*u,x=a*f;t[0]=l*u,t[4]=g*c-m,t[8]=p*c+x,t[1]=l*f,t[5]=x*c+p,t[9]=m*c-g,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){const p=o*l,m=o*c,g=a*l,x=a*c;t[0]=l*u,t[4]=x-p*f,t[8]=g*f+m,t[1]=f,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=m*f+g,t[10]=p-x*f}else if(e.order==="XZY"){const p=o*l,m=o*c,g=a*l,x=a*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=p*f+x,t[5]=o*u,t[9]=m*f-g,t[2]=g*f-m,t[6]=a*u,t[10]=x*f+p}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Gm,e,Wm)}lookAt(e,t,i){const s=this.elements;return Mi.subVectors(e,t),Mi.lengthSq()===0&&(Mi.z=1),Mi.normalize(),Ws.crossVectors(i,Mi),Ws.lengthSq()===0&&(Math.abs(i.z)===1?Mi.x+=1e-4:Mi.z+=1e-4,Mi.normalize(),Ws.crossVectors(i,Mi)),Ws.normalize(),Aa.crossVectors(Mi,Ws),s[0]=Ws.x,s[4]=Aa.x,s[8]=Mi.x,s[1]=Ws.y,s[5]=Aa.y,s[9]=Mi.y,s[2]=Ws.z,s[6]=Aa.z,s[10]=Mi.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){const i=e.elements,s=t.elements,r=this.elements,o=i[0],a=i[4],l=i[8],c=i[12],u=i[1],f=i[5],p=i[9],m=i[13],g=i[2],x=i[6],d=i[10],h=i[14],M=i[3],_=i[7],b=i[11],S=i[15],v=s[0],E=s[4],R=s[8],w=s[12],T=s[1],C=s[5],I=s[9],F=s[13],V=s[2],W=s[6],D=s[10],B=s[14],G=s[3],Y=s[7],N=s[11],te=s[15];return r[0]=o*v+a*T+l*V+c*G,r[4]=o*E+a*C+l*W+c*Y,r[8]=o*R+a*I+l*D+c*N,r[12]=o*w+a*F+l*B+c*te,r[1]=u*v+f*T+p*V+m*G,r[5]=u*E+f*C+p*W+m*Y,r[9]=u*R+f*I+p*D+m*N,r[13]=u*w+f*F+p*B+m*te,r[2]=g*v+x*T+d*V+h*G,r[6]=g*E+x*C+d*W+h*Y,r[10]=g*R+x*I+d*D+h*N,r[14]=g*w+x*F+d*B+h*te,r[3]=M*v+_*T+b*V+S*G,r[7]=M*E+_*C+b*W+S*Y,r[11]=M*R+_*I+b*D+S*N,r[15]=M*w+_*F+b*B+S*te,this}multiplyScalar(e){const t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){const e=this.elements,t=e[0],i=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],f=e[6],p=e[10],m=e[14],g=e[3],x=e[7],d=e[11],h=e[15];return g*(+r*l*f-s*c*f-r*a*p+i*c*p+s*a*m-i*l*m)+x*(+t*l*m-t*c*p+r*o*p-s*o*m+s*c*u-r*l*u)+d*(+t*c*f-t*a*m-r*o*f+i*o*m+r*a*u-i*c*u)+h*(-s*a*u-t*l*f+t*a*p+s*o*f-i*o*p+i*l*u)}transpose(){const e=this.elements;let t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,i){const s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=i),this}invert(){const e=this.elements,t=e[0],i=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=e[9],p=e[10],m=e[11],g=e[12],x=e[13],d=e[14],h=e[15],M=f*d*c-x*p*c+x*l*m-a*d*m-f*l*h+a*p*h,_=g*p*c-u*d*c-g*l*m+o*d*m+u*l*h-o*p*h,b=u*x*c-g*f*c+g*a*m-o*x*m-u*a*h+o*f*h,S=g*f*l-u*x*l-g*a*p+o*x*p+u*a*d-o*f*d,v=t*M+i*_+s*b+r*S;if(v===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);const E=1/v;return e[0]=M*E,e[1]=(x*p*r-f*d*r-x*s*m+i*d*m+f*s*h-i*p*h)*E,e[2]=(a*d*r-x*l*r+x*s*c-i*d*c-a*s*h+i*l*h)*E,e[3]=(f*l*r-a*p*r-f*s*c+i*p*c+a*s*m-i*l*m)*E,e[4]=_*E,e[5]=(u*d*r-g*p*r+g*s*m-t*d*m-u*s*h+t*p*h)*E,e[6]=(g*l*r-o*d*r-g*s*c+t*d*c+o*s*h-t*l*h)*E,e[7]=(o*p*r-u*l*r+u*s*c-t*p*c-o*s*m+t*l*m)*E,e[8]=b*E,e[9]=(g*f*r-u*x*r-g*i*m+t*x*m+u*i*h-t*f*h)*E,e[10]=(o*x*r-g*a*r+g*i*c-t*x*c-o*i*h+t*a*h)*E,e[11]=(u*a*r-o*f*r-u*i*c+t*f*c+o*i*m-t*a*m)*E,e[12]=S*E,e[13]=(u*x*s-g*f*s+g*i*p-t*x*p-u*i*d+t*f*d)*E,e[14]=(g*a*s-o*x*s-g*i*l+t*x*l+o*i*d-t*a*d)*E,e[15]=(o*f*s-u*a*s+u*i*l-t*f*l-o*i*p+t*a*p)*E,this}scale(e){const t=this.elements,i=e.x,s=e.y,r=e.z;return t[0]*=i,t[4]*=s,t[8]*=r,t[1]*=i,t[5]*=s,t[9]*=r,t[2]*=i,t[6]*=s,t[10]*=r,t[3]*=i,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){const e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],i=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,i,s))}makeTranslation(e,t,i){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,i,0,0,0,1),this}makeRotationX(e){const t=Math.cos(e),i=Math.sin(e);return this.set(1,0,0,0,0,t,-i,0,0,i,t,0,0,0,0,1),this}makeRotationY(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,0,i,0,0,1,0,0,-i,0,t,0,0,0,0,1),this}makeRotationZ(e){const t=Math.cos(e),i=Math.sin(e);return this.set(t,-i,0,0,i,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){const i=Math.cos(t),s=Math.sin(t),r=1-i,o=e.x,a=e.y,l=e.z,c=r*o,u=r*a;return this.set(c*o+i,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+i,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+i,0,0,0,0,1),this}makeScale(e,t,i){return this.set(e,0,0,0,0,t,0,0,0,0,i,0,0,0,0,1),this}makeShear(e,t,i,s,r,o){return this.set(1,i,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,i){const s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,u=o+o,f=a+a,p=r*c,m=r*u,g=r*f,x=o*u,d=o*f,h=a*f,M=l*c,_=l*u,b=l*f,S=i.x,v=i.y,E=i.z;return s[0]=(1-(x+h))*S,s[1]=(m+b)*S,s[2]=(g-_)*S,s[3]=0,s[4]=(m-b)*v,s[5]=(1-(p+h))*v,s[6]=(d+M)*v,s[7]=0,s[8]=(g+_)*E,s[9]=(d-M)*E,s[10]=(1-(p+x))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,i){const s=this.elements;let r=Dr.set(s[0],s[1],s[2]).length();const o=Dr.set(s[4],s[5],s[6]).length(),a=Dr.set(s[8],s[9],s[10]).length();this.determinant()<0&&(r=-r),e.x=s[12],e.y=s[13],e.z=s[14],Wi.copy(this);const c=1/r,u=1/o,f=1/a;return Wi.elements[0]*=c,Wi.elements[1]*=c,Wi.elements[2]*=c,Wi.elements[4]*=u,Wi.elements[5]*=u,Wi.elements[6]*=u,Wi.elements[8]*=f,Wi.elements[9]*=f,Wi.elements[10]*=f,t.setFromRotationMatrix(Wi),i.x=r,i.y=o,i.z=a,this}makePerspective(e,t,i,s,r,o,a=cs,l=!1){const c=this.elements,u=2*r/(t-e),f=2*r/(i-s),p=(t+e)/(t-e),m=(i+s)/(i-s);let g,x;if(l)g=r/(o-r),x=o*r/(o-r);else if(a===cs)g=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===mc)g=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=p,c[12]=0,c[1]=0,c[5]=f,c[9]=m,c[13]=0,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,i,s,r,o,a=cs,l=!1){const c=this.elements,u=2/(t-e),f=2/(i-s),p=-(t+e)/(t-e),m=-(i+s)/(i-s);let g,x;if(l)g=1/(o-r),x=o/(o-r);else if(a===cs)g=-2/(o-r),x=-(o+r)/(o-r);else if(a===mc)g=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=p,c[1]=0,c[5]=f,c[9]=0,c[13]=m,c[2]=0,c[6]=0,c[10]=g,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){const t=this.elements,i=e.elements;for(let s=0;s<16;s++)if(t[s]!==i[s])return!1;return!0}fromArray(e,t=0){for(let i=0;i<16;i++)this.elements[i]=e[i+t];return this}toArray(e=[],t=0){const i=this.elements;return e[t]=i[0],e[t+1]=i[1],e[t+2]=i[2],e[t+3]=i[3],e[t+4]=i[4],e[t+5]=i[5],e[t+6]=i[6],e[t+7]=i[7],e[t+8]=i[8],e[t+9]=i[9],e[t+10]=i[10],e[t+11]=i[11],e[t+12]=i[12],e[t+13]=i[13],e[t+14]=i[14],e[t+15]=i[15],e}}const Dr=new ue,Wi=new Ht,Gm=new ue(0,0,0),Wm=new ue(1,1,1),Ws=new ue,Aa=new ue,Mi=new ue,Nu=new Ht,Ou=new dn;class hs{constructor(e=0,t=0,i=0,s=hs.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=i,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,i,s=this._order){return this._x=e,this._y=t,this._z=i,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,i=!0){const s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],f=s[2],p=s[6],m=s[10];switch(t){case"XYZ":this._y=Math.asin(Vt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(p,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Vt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(Vt(p,-1,1)),Math.abs(p)<.9999999?(this._y=Math.atan2(-f,m),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Vt(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(p,m),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Vt(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-Vt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(p,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,m),this._y=0);break;default:Mt("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,i===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,i){return Nu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Nu,t,i)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Ou.setFromEuler(this),this.setFromQuaternion(Ou,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}}hs.DEFAULT_ORDER="XYZ";class kf{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}}let Xm=0;const Fu=new ue,Ir=new dn,_s=new Ht,Ra=new ue,Co=new ue,qm=new ue,Ym=new dn,ku=new ue(1,0,0),zu=new ue(0,1,0),Bu=new ue(0,0,1),Vu={type:"added"},jm={type:"removed"},Ur={type:"childadded",child:null},Qc={type:"childremoved",child:null};class kn extends Mr{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Xm++}),this.uuid=vr(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=kn.DEFAULT_UP.clone();const e=new ue,t=new hs,i=new dn,s=new ue(1,1,1);function r(){i.setFromEuler(t,!1)}function o(){t.setFromQuaternion(i,void 0,!1)}t._onChange(r),i._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:i},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new Ht},normalMatrix:{value:new Nt}}),this.matrix=new Ht,this.matrixWorld=new Ht,this.matrixAutoUpdate=kn.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=kn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new kf,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.userData={}}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ir.setFromAxisAngle(e,t),this.quaternion.multiply(Ir),this}rotateOnWorldAxis(e,t){return Ir.setFromAxisAngle(e,t),this.quaternion.premultiply(Ir),this}rotateX(e){return this.rotateOnAxis(ku,e)}rotateY(e){return this.rotateOnAxis(zu,e)}rotateZ(e){return this.rotateOnAxis(Bu,e)}translateOnAxis(e,t){return Fu.copy(e).applyQuaternion(this.quaternion),this.position.add(Fu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(ku,e)}translateY(e){return this.translateOnAxis(zu,e)}translateZ(e){return this.translateOnAxis(Bu,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(_s.copy(this.matrixWorld).invert())}lookAt(e,t,i){e.isVector3?Ra.copy(e):Ra.set(e,t,i);const s=this.parent;this.updateWorldMatrix(!0,!1),Co.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?_s.lookAt(Co,Ra,this.up):_s.lookAt(Ra,Co,this.up),this.quaternion.setFromRotationMatrix(_s),s&&(_s.extractRotation(s.matrixWorld),Ir.setFromRotationMatrix(_s),this.quaternion.premultiply(Ir.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Rn("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Vu),Ur.child=e,this.dispatchEvent(Ur),Ur.child=null):Rn("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let i=0;i<arguments.length;i++)this.remove(arguments[i]);return this}const t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(jm),Qc.child=e,this.dispatchEvent(Qc),Qc.child=null),this}removeFromParent(){const e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),_s.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),_s.multiply(e.parent.matrixWorld)),e.applyMatrix4(_s),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Vu),Ur.child=e,this.dispatchEvent(Ur),Ur.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let i=0,s=this.children.length;i<s;i++){const o=this.children[i].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,i=[]){this[e]===t&&i.push(this);const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,i);return i}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Co,e,qm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Co,Ym,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);const t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].traverseVisible(e)}traverseAncestors(e){const t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);const t=this.children;for(let i=0,s=t.length;i<s;i++)t[i].updateMatrixWorld(e)}updateWorldMatrix(e,t){const i=this.parent;if(e===!0&&i!==null&&i.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),t===!0){const s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].updateWorldMatrix(!1,!0)}}toJSON(e){const t=e===void 0||typeof e=="string",i={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},i.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});const s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);const a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){const l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){const f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){const a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){const l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){const a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),f=o(e.shapes),p=o(e.skeletons),m=o(e.animations),g=o(e.nodes);a.length>0&&(i.geometries=a),l.length>0&&(i.materials=l),c.length>0&&(i.textures=c),u.length>0&&(i.images=u),f.length>0&&(i.shapes=f),p.length>0&&(i.skeletons=p),m.length>0&&(i.animations=m),g.length>0&&(i.nodes=g)}return i.object=s,i;function o(a){const l=[];for(const c in a){const u=a[c];delete u.metadata,l.push(u)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let i=0;i<e.children.length;i++){const s=e.children[i];this.add(s.clone())}return this}}kn.DEFAULT_UP=new ue(0,1,0);kn.DEFAULT_MATRIX_AUTO_UPDATE=!0;kn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;const Xi=new ue,bs=new ue,Jc=new ue,Ms=new ue,Nr=new ue,Or=new ue,Hu=new ue,el=new ue,tl=new ue,nl=new ue,il=new Mn,sl=new Mn,rl=new Mn;class $i{constructor(e=new ue,t=new ue,i=new ue){this.a=e,this.b=t,this.c=i}static getNormal(e,t,i,s){s.subVectors(i,t),Xi.subVectors(e,t),s.cross(Xi);const r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,i,s,r){Xi.subVectors(s,t),bs.subVectors(i,t),Jc.subVectors(e,t);const o=Xi.dot(Xi),a=Xi.dot(bs),l=Xi.dot(Jc),c=bs.dot(bs),u=bs.dot(Jc),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;const p=1/f,m=(c*l-a*u)*p,g=(o*u-a*l)*p;return r.set(1-m-g,g,m)}static containsPoint(e,t,i,s){return this.getBarycoord(e,t,i,s,Ms)===null?!1:Ms.x>=0&&Ms.y>=0&&Ms.x+Ms.y<=1}static getInterpolation(e,t,i,s,r,o,a,l){return this.getBarycoord(e,t,i,s,Ms)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,Ms.x),l.addScaledVector(o,Ms.y),l.addScaledVector(a,Ms.z),l)}static getInterpolatedAttribute(e,t,i,s,r,o){return il.setScalar(0),sl.setScalar(0),rl.setScalar(0),il.fromBufferAttribute(e,t),sl.fromBufferAttribute(e,i),rl.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(il,r.x),o.addScaledVector(sl,r.y),o.addScaledVector(rl,r.z),o}static isFrontFacing(e,t,i,s){return Xi.subVectors(i,t),bs.subVectors(e,t),Xi.cross(bs).dot(s)<0}set(e,t,i){return this.a.copy(e),this.b.copy(t),this.c.copy(i),this}setFromPointsAndIndices(e,t,i,s){return this.a.copy(e[t]),this.b.copy(e[i]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,i,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,i),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Xi.subVectors(this.c,this.b),bs.subVectors(this.a,this.b),Xi.cross(bs).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return $i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return $i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,i,s,r){return $i.getInterpolation(e,this.a,this.b,this.c,t,i,s,r)}containsPoint(e){return $i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return $i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){const i=this.a,s=this.b,r=this.c;let o,a;Nr.subVectors(s,i),Or.subVectors(r,i),el.subVectors(e,i);const l=Nr.dot(el),c=Or.dot(el);if(l<=0&&c<=0)return t.copy(i);tl.subVectors(e,s);const u=Nr.dot(tl),f=Or.dot(tl);if(u>=0&&f<=u)return t.copy(s);const p=l*f-u*c;if(p<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(i).addScaledVector(Nr,o);nl.subVectors(e,r);const m=Nr.dot(nl),g=Or.dot(nl);if(g>=0&&m<=g)return t.copy(r);const x=m*c-l*g;if(x<=0&&c>=0&&g<=0)return a=c/(c-g),t.copy(i).addScaledVector(Or,a);const d=u*g-m*f;if(d<=0&&f-u>=0&&m-g>=0)return Hu.subVectors(r,s),a=(f-u)/(f-u+(m-g)),t.copy(s).addScaledVector(Hu,a);const h=1/(d+x+p);return o=x*h,a=p*h,t.copy(i).addScaledVector(Nr,o).addScaledVector(Or,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}}const zf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Xs={h:0,s:0,l:0},Ca={h:0,s:0,l:0};function ol(n,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?n+(e-n)*6*t:t<1/2?e:t<2/3?n+(e-n)*6*(2/3-t):n}class Et{constructor(e,t,i){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,i)}set(e,t,i){if(t===void 0&&i===void 0){const s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,i);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Oi){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,tn.colorSpaceToWorking(this,t),this}setRGB(e,t,i,s=tn.workingColorSpace){return this.r=e,this.g=t,this.b=i,tn.colorSpaceToWorking(this,s),this}setHSL(e,t,i,s=tn.workingColorSpace){if(e=Yh(e,1),t=Vt(t,0,1),i=Vt(i,0,1),t===0)this.r=this.g=this.b=i;else{const r=i<=.5?i*(1+t):i+t-i*t,o=2*i-r;this.r=ol(o,r,e+1/3),this.g=ol(o,r,e),this.b=ol(o,r,e-1/3)}return tn.colorSpaceToWorking(this,s),this}setStyle(e,t=Oi){function i(r){r!==void 0&&parseFloat(r)<1&&Mt("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r;const o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return i(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Mt("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){const r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Mt("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Oi){const i=zf[e.toLowerCase()];return i!==void 0?this.setHex(i,t):Mt("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=Ls(e.r),this.g=Ls(e.g),this.b=Ls(e.b),this}copyLinearToSRGB(e){return this.r=no(e.r),this.g=no(e.g),this.b=no(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Oi){return tn.workingToColorSpace(Jn.copy(this),e),Math.round(Vt(Jn.r*255,0,255))*65536+Math.round(Vt(Jn.g*255,0,255))*256+Math.round(Vt(Jn.b*255,0,255))}getHexString(e=Oi){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=tn.workingColorSpace){tn.workingToColorSpace(Jn.copy(this),t);const i=Jn.r,s=Jn.g,r=Jn.b,o=Math.max(i,s,r),a=Math.min(i,s,r);let l,c;const u=(a+o)/2;if(a===o)l=0,c=0;else{const f=o-a;switch(c=u<=.5?f/(o+a):f/(2-o-a),o){case i:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-i)/f+2;break;case r:l=(i-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=tn.workingColorSpace){return tn.workingToColorSpace(Jn.copy(this),t),e.r=Jn.r,e.g=Jn.g,e.b=Jn.b,e}getStyle(e=Oi){tn.workingToColorSpace(Jn.copy(this),e);const t=Jn.r,i=Jn.g,s=Jn.b;return e!==Oi?`color(${e} ${t.toFixed(3)} ${i.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(i*255)},${Math.round(s*255)})`}offsetHSL(e,t,i){return this.getHSL(Xs),this.setHSL(Xs.h+e,Xs.s+t,Xs.l+i)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,i){return this.r=e.r+(t.r-e.r)*i,this.g=e.g+(t.g-e.g)*i,this.b=e.b+(t.b-e.b)*i,this}lerpHSL(e,t){this.getHSL(Xs),e.getHSL(Ca);const i=$o(Xs.h,Ca.h,t),s=$o(Xs.s,Ca.s,t),r=$o(Xs.l,Ca.l,t);return this.setHSL(i,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){const t=this.r,i=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*i+r[6]*s,this.g=r[1]*t+r[4]*i+r[7]*s,this.b=r[2]*t+r[5]*i+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}}const Jn=new Et;Et.NAMES=zf;let $m=0;class Mo extends Mr{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:$m++}),this.uuid=vr(),this.name="",this.type="Material",this.blending=Jr,this.side=nr,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=kl,this.blendDst=zl,this.blendEquation=fr,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Et(0,0,0),this.blendAlpha=0,this.depthFunc=ao,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Tu,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ar,this.stencilZFail=Ar,this.stencilZPass=Ar,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(const t in e){const i=e[t];if(i===void 0){Mt(`Material: parameter '${t}' has value of undefined.`);continue}const s=this[t];if(s===void 0){Mt(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(i):s&&s.isVector3&&i&&i.isVector3?s.copy(i):this[t]=i}}toJSON(e){const t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});const i={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.color&&this.color.isColor&&(i.color=this.color.getHex()),this.roughness!==void 0&&(i.roughness=this.roughness),this.metalness!==void 0&&(i.metalness=this.metalness),this.sheen!==void 0&&(i.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(i.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(i.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(i.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(i.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(i.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(i.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(i.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(i.shininess=this.shininess),this.clearcoat!==void 0&&(i.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(i.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(i.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(i.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(i.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,i.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(i.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(i.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(i.dispersion=this.dispersion),this.iridescence!==void 0&&(i.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(i.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(i.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(i.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(i.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(i.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(i.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(i.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(i.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(i.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(i.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(i.lightMap=this.lightMap.toJSON(e).uuid,i.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(i.aoMap=this.aoMap.toJSON(e).uuid,i.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(i.bumpMap=this.bumpMap.toJSON(e).uuid,i.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(i.normalMap=this.normalMap.toJSON(e).uuid,i.normalMapType=this.normalMapType,i.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(i.displacementMap=this.displacementMap.toJSON(e).uuid,i.displacementScale=this.displacementScale,i.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(i.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(i.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(i.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(i.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(i.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(i.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(i.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(i.combine=this.combine)),this.envMapRotation!==void 0&&(i.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(i.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(i.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(i.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(i.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(i.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(i.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(i.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(i.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(i.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(i.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(i.size=this.size),this.shadowSide!==null&&(i.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(i.sizeAttenuation=this.sizeAttenuation),this.blending!==Jr&&(i.blending=this.blending),this.side!==nr&&(i.side=this.side),this.vertexColors===!0&&(i.vertexColors=!0),this.opacity<1&&(i.opacity=this.opacity),this.transparent===!0&&(i.transparent=!0),this.blendSrc!==kl&&(i.blendSrc=this.blendSrc),this.blendDst!==zl&&(i.blendDst=this.blendDst),this.blendEquation!==fr&&(i.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(i.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(i.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(i.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(i.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(i.blendAlpha=this.blendAlpha),this.depthFunc!==ao&&(i.depthFunc=this.depthFunc),this.depthTest===!1&&(i.depthTest=this.depthTest),this.depthWrite===!1&&(i.depthWrite=this.depthWrite),this.colorWrite===!1&&(i.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(i.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Tu&&(i.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(i.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(i.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ar&&(i.stencilFail=this.stencilFail),this.stencilZFail!==Ar&&(i.stencilZFail=this.stencilZFail),this.stencilZPass!==Ar&&(i.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(i.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(i.rotation=this.rotation),this.polygonOffset===!0&&(i.polygonOffset=!0),this.polygonOffsetFactor!==0&&(i.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(i.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(i.linewidth=this.linewidth),this.dashSize!==void 0&&(i.dashSize=this.dashSize),this.gapSize!==void 0&&(i.gapSize=this.gapSize),this.scale!==void 0&&(i.scale=this.scale),this.dithering===!0&&(i.dithering=!0),this.alphaTest>0&&(i.alphaTest=this.alphaTest),this.alphaHash===!0&&(i.alphaHash=!0),this.alphaToCoverage===!0&&(i.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(i.premultipliedAlpha=!0),this.forceSinglePass===!0&&(i.forceSinglePass=!0),this.wireframe===!0&&(i.wireframe=!0),this.wireframeLinewidth>1&&(i.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(i.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(i.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(i.flatShading=!0),this.visible===!1&&(i.visible=!1),this.toneMapped===!1&&(i.toneMapped=!1),this.fog===!1&&(i.fog=!1),Object.keys(this.userData).length>0&&(i.userData=this.userData);function s(r){const o=[];for(const a in r){const l=r[a];delete l.metadata,o.push(l)}return o}if(t){const r=s(e.textures),o=s(e.images);r.length>0&&(i.textures=r),o.length>0&&(i.images=o)}return i}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;const t=e.clippingPlanes;let i=null;if(t!==null){const s=t.length;i=new Array(s);for(let r=0;r!==s;++r)i[r]=t[r].clone()}return this.clippingPlanes=i,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}}class Bf extends Mo{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Et(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hs,this.combine=Ef,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}}const Pn=new ue,La=new Ot;let Km=0;class Bi{constructor(e,t,i=!1){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Km++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=i,this.usage=Au,this.updateRanges=[],this.gpuType=ji,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,i){e*=this.itemSize,i*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[i+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,i=this.count;t<i;t++)La.fromBufferAttribute(this,t),La.applyMatrix3(e),this.setXY(t,La.x,La.y);else if(this.itemSize===3)for(let t=0,i=this.count;t<i;t++)Pn.fromBufferAttribute(this,t),Pn.applyMatrix3(e),this.setXYZ(t,Pn.x,Pn.y,Pn.z);return this}applyMatrix4(e){for(let t=0,i=this.count;t<i;t++)Pn.fromBufferAttribute(this,t),Pn.applyMatrix4(e),this.setXYZ(t,Pn.x,Pn.y,Pn.z);return this}applyNormalMatrix(e){for(let t=0,i=this.count;t<i;t++)Pn.fromBufferAttribute(this,t),Pn.applyNormalMatrix(e),this.setXYZ(t,Pn.x,Pn.y,Pn.z);return this}transformDirection(e){for(let t=0,i=this.count;t<i;t++)Pn.fromBufferAttribute(this,t),Pn.transformDirection(e),this.setXYZ(t,Pn.x,Pn.y,Pn.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let i=this.array[e*this.itemSize+t];return this.normalized&&(i=Wr(i,this.array)),i}setComponent(e,t,i){return this.normalized&&(i=ri(i,this.array)),this.array[e*this.itemSize+t]=i,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Wr(t,this.array)),t}setX(e,t){return this.normalized&&(t=ri(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Wr(t,this.array)),t}setY(e,t){return this.normalized&&(t=ri(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Wr(t,this.array)),t}setZ(e,t){return this.normalized&&(t=ri(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Wr(t,this.array)),t}setW(e,t){return this.normalized&&(t=ri(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,i){return e*=this.itemSize,this.normalized&&(t=ri(t,this.array),i=ri(i,this.array)),this.array[e+0]=t,this.array[e+1]=i,this}setXYZ(e,t,i,s){return e*=this.itemSize,this.normalized&&(t=ri(t,this.array),i=ri(i,this.array),s=ri(s,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this}setXYZW(e,t,i,s,r){return e*=this.itemSize,this.normalized&&(t=ri(t,this.array),i=ri(i,this.array),s=ri(s,this.array),r=ri(r,this.array)),this.array[e+0]=t,this.array[e+1]=i,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){const e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Au&&(e.usage=this.usage),e}}class Vf extends Bi{constructor(e,t,i){super(new Uint16Array(e),t,i)}}class Hf extends Bi{constructor(e,t,i){super(new Uint32Array(e),t,i)}}class Ai extends Bi{constructor(e,t,i){super(new Float32Array(e),t,i)}}let Zm=0;const Pi=new Ht,al=new kn,Fr=new ue,vi=new Ps,Lo=new Ps,Hn=new ue;class Vi extends Mr{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Zm++}),this.uuid=vr(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(Nf(e)?Hf:Vf)(e,1):this.index=e,this}setIndirect(e){return this.indirect=e,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,i=0){this.groups.push({start:e,count:t,materialIndex:i})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){const t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);const i=this.attributes.normal;if(i!==void 0){const r=new Nt().getNormalMatrix(e);i.applyNormalMatrix(r),i.needsUpdate=!0}const s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}applyQuaternion(e){return Pi.makeRotationFromQuaternion(e),this.applyMatrix4(Pi),this}rotateX(e){return Pi.makeRotationX(e),this.applyMatrix4(Pi),this}rotateY(e){return Pi.makeRotationY(e),this.applyMatrix4(Pi),this}rotateZ(e){return Pi.makeRotationZ(e),this.applyMatrix4(Pi),this}translate(e,t,i){return Pi.makeTranslation(e,t,i),this.applyMatrix4(Pi),this}scale(e,t,i){return Pi.makeScale(e,t,i),this.applyMatrix4(Pi),this}lookAt(e){return al.lookAt(e),al.updateMatrix(),this.applyMatrix4(al.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Fr).negate(),this.translate(Fr.x,Fr.y,Fr.z),this}setFromPoints(e){const t=this.getAttribute("position");if(t===void 0){const i=[];for(let s=0,r=e.length;s<r;s++){const o=e[s];i.push(o.x,o.y,o.z||0)}this.setAttribute("position",new Ai(i,3))}else{const i=Math.min(e.length,t.count);for(let s=0;s<i;s++){const r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Mt("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ps);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Rn("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new ue(-1/0,-1/0,-1/0),new ue(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let i=0,s=t.length;i<s;i++){const r=t[i];vi.setFromBufferAttribute(r),this.morphTargetsRelative?(Hn.addVectors(this.boundingBox.min,vi.min),this.boundingBox.expandByPoint(Hn),Hn.addVectors(this.boundingBox.max,vi.max),this.boundingBox.expandByPoint(Hn)):(this.boundingBox.expandByPoint(vi.min),this.boundingBox.expandByPoint(vi.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Rn('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new bo);const e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Rn("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new ue,1/0);return}if(e){const i=this.boundingSphere.center;if(vi.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){const a=t[r];Lo.setFromBufferAttribute(a),this.morphTargetsRelative?(Hn.addVectors(vi.min,Lo.min),vi.expandByPoint(Hn),Hn.addVectors(vi.max,Lo.max),vi.expandByPoint(Hn)):(vi.expandByPoint(Lo.min),vi.expandByPoint(Lo.max))}vi.getCenter(i);let s=0;for(let r=0,o=e.count;r<o;r++)Hn.fromBufferAttribute(e,r),s=Math.max(s,i.distanceToSquared(Hn));if(t)for(let r=0,o=t.length;r<o;r++){const a=t[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Hn.fromBufferAttribute(a,c),l&&(Fr.fromBufferAttribute(e,c),Hn.add(Fr)),s=Math.max(s,i.distanceToSquared(Hn))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Rn('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){const e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Rn("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}const i=t.position,s=t.normal,r=t.uv;this.hasAttribute("tangent")===!1&&this.setAttribute("tangent",new Bi(new Float32Array(4*i.count),4));const o=this.getAttribute("tangent"),a=[],l=[];for(let R=0;R<i.count;R++)a[R]=new ue,l[R]=new ue;const c=new ue,u=new ue,f=new ue,p=new Ot,m=new Ot,g=new Ot,x=new ue,d=new ue;function h(R,w,T){c.fromBufferAttribute(i,R),u.fromBufferAttribute(i,w),f.fromBufferAttribute(i,T),p.fromBufferAttribute(r,R),m.fromBufferAttribute(r,w),g.fromBufferAttribute(r,T),u.sub(c),f.sub(c),m.sub(p),g.sub(p);const C=1/(m.x*g.y-g.x*m.y);isFinite(C)&&(x.copy(u).multiplyScalar(g.y).addScaledVector(f,-m.y).multiplyScalar(C),d.copy(f).multiplyScalar(m.x).addScaledVector(u,-g.x).multiplyScalar(C),a[R].add(x),a[w].add(x),a[T].add(x),l[R].add(d),l[w].add(d),l[T].add(d))}let M=this.groups;M.length===0&&(M=[{start:0,count:e.count}]);for(let R=0,w=M.length;R<w;++R){const T=M[R],C=T.start,I=T.count;for(let F=C,V=C+I;F<V;F+=3)h(e.getX(F+0),e.getX(F+1),e.getX(F+2))}const _=new ue,b=new ue,S=new ue,v=new ue;function E(R){S.fromBufferAttribute(s,R),v.copy(S);const w=a[R];_.copy(w),_.sub(S.multiplyScalar(S.dot(w))).normalize(),b.crossVectors(v,w);const C=b.dot(l[R])<0?-1:1;o.setXYZW(R,_.x,_.y,_.z,C)}for(let R=0,w=M.length;R<w;++R){const T=M[R],C=T.start,I=T.count;for(let F=C,V=C+I;F<V;F+=3)E(e.getX(F+0)),E(e.getX(F+1)),E(e.getX(F+2))}}computeVertexNormals(){const e=this.index,t=this.getAttribute("position");if(t!==void 0){let i=this.getAttribute("normal");if(i===void 0)i=new Bi(new Float32Array(t.count*3),3),this.setAttribute("normal",i);else for(let p=0,m=i.count;p<m;p++)i.setXYZ(p,0,0,0);const s=new ue,r=new ue,o=new ue,a=new ue,l=new ue,c=new ue,u=new ue,f=new ue;if(e)for(let p=0,m=e.count;p<m;p+=3){const g=e.getX(p+0),x=e.getX(p+1),d=e.getX(p+2);s.fromBufferAttribute(t,g),r.fromBufferAttribute(t,x),o.fromBufferAttribute(t,d),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),a.fromBufferAttribute(i,g),l.fromBufferAttribute(i,x),c.fromBufferAttribute(i,d),a.add(u),l.add(u),c.add(u),i.setXYZ(g,a.x,a.y,a.z),i.setXYZ(x,l.x,l.y,l.z),i.setXYZ(d,c.x,c.y,c.z)}else for(let p=0,m=t.count;p<m;p+=3)s.fromBufferAttribute(t,p+0),r.fromBufferAttribute(t,p+1),o.fromBufferAttribute(t,p+2),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),i.setXYZ(p+0,u.x,u.y,u.z),i.setXYZ(p+1,u.x,u.y,u.z),i.setXYZ(p+2,u.x,u.y,u.z);this.normalizeNormals(),i.needsUpdate=!0}}normalizeNormals(){const e=this.attributes.normal;for(let t=0,i=e.count;t<i;t++)Hn.fromBufferAttribute(e,t),Hn.normalize(),e.setXYZ(t,Hn.x,Hn.y,Hn.z)}toNonIndexed(){function e(a,l){const c=a.array,u=a.itemSize,f=a.normalized,p=new c.constructor(l.length*u);let m=0,g=0;for(let x=0,d=l.length;x<d;x++){a.isInterleavedBufferAttribute?m=l[x]*a.data.stride+a.offset:m=l[x]*u;for(let h=0;h<u;h++)p[g++]=c[m++]}return new Bi(p,u,f)}if(this.index===null)return Mt("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;const t=new Vi,i=this.index.array,s=this.attributes;for(const a in s){const l=s[a],c=e(l,i);t.setAttribute(a,c)}const r=this.morphAttributes;for(const a in r){const l=[],c=r[a];for(let u=0,f=c.length;u<f;u++){const p=c[u],m=e(p,i);l.push(m)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;const o=this.groups;for(let a=0,l=o.length;a<l;a++){const c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){const e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){const l=this.parameters;for(const c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};const t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});const i=this.attributes;for(const l in i){const c=i[l];e.data.attributes[l]=c.toJSON(e.data)}const s={};let r=!1;for(const l in this.morphAttributes){const c=this.morphAttributes[l],u=[];for(let f=0,p=c.length;f<p;f++){const m=c[f];u.push(m.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);const o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));const a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;const t={};this.name=e.name;const i=e.index;i!==null&&this.setIndex(i.clone());const s=e.attributes;for(const c in s){const u=s[c];this.setAttribute(c,u.clone(t))}const r=e.morphAttributes;for(const c in r){const u=[],f=r[c];for(let p=0,m=f.length;p<m;p++)u.push(f[p].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;const o=e.groups;for(let c=0,u=o.length;c<u;c++){const f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}const a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());const l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}}const Gu=new Ht,ar=new Ac,Pa=new bo,Wu=new ue,Da=new ue,Ia=new ue,Ua=new ue,cl=new ue,Na=new ue,Xu=new ue,Oa=new ue;class Us extends kn{constructor(e=new Vi,t=new Bf){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){const i=this.geometry,s=i.attributes.position,r=i.morphAttributes.position,o=i.morphTargetsRelative;t.fromBufferAttribute(s,e);const a=this.morphTargetInfluences;if(r&&a){Na.set(0,0,0);for(let l=0,c=r.length;l<c;l++){const u=a[l],f=r[l];u!==0&&(cl.fromBufferAttribute(f,e),o?Na.addScaledVector(cl,u):Na.addScaledVector(cl.sub(t),u))}t.add(Na)}return t}raycast(e,t){const i=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(i.boundingSphere===null&&i.computeBoundingSphere(),Pa.copy(i.boundingSphere),Pa.applyMatrix4(r),ar.copy(e.ray).recast(e.near),!(Pa.containsPoint(ar.origin)===!1&&(ar.intersectSphere(Pa,Wu)===null||ar.origin.distanceToSquared(Wu)>(e.far-e.near)**2))&&(Gu.copy(r).invert(),ar.copy(e.ray).applyMatrix4(Gu),!(i.boundingBox!==null&&ar.intersectsBox(i.boundingBox)===!1)&&this._computeIntersections(e,t,ar)))}_computeIntersections(e,t,i){let s;const r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,p=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let g=0,x=p.length;g<x;g++){const d=p[g],h=o[d.materialIndex],M=Math.max(d.start,m.start),_=Math.min(a.count,Math.min(d.start+d.count,m.start+m.count));for(let b=M,S=_;b<S;b+=3){const v=a.getX(b),E=a.getX(b+1),R=a.getX(b+2);s=Fa(this,h,e,i,c,u,f,v,E,R),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=d.materialIndex,t.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(a.count,m.start+m.count);for(let d=g,h=x;d<h;d+=3){const M=a.getX(d),_=a.getX(d+1),b=a.getX(d+2);s=Fa(this,o,e,i,c,u,f,M,_,b),s&&(s.faceIndex=Math.floor(d/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let g=0,x=p.length;g<x;g++){const d=p[g],h=o[d.materialIndex],M=Math.max(d.start,m.start),_=Math.min(l.count,Math.min(d.start+d.count,m.start+m.count));for(let b=M,S=_;b<S;b+=3){const v=b,E=b+1,R=b+2;s=Fa(this,h,e,i,c,u,f,v,E,R),s&&(s.faceIndex=Math.floor(b/3),s.face.materialIndex=d.materialIndex,t.push(s))}}else{const g=Math.max(0,m.start),x=Math.min(l.count,m.start+m.count);for(let d=g,h=x;d<h;d+=3){const M=d,_=d+1,b=d+2;s=Fa(this,o,e,i,c,u,f,M,_,b),s&&(s.faceIndex=Math.floor(d/3),t.push(s))}}}}function Qm(n,e,t,i,s,r,o,a){let l;if(e.side===gi?l=i.intersectTriangle(o,r,s,!0,a):l=i.intersectTriangle(s,r,o,e.side===nr,a),l===null)return null;Oa.copy(a),Oa.applyMatrix4(n.matrixWorld);const c=t.ray.origin.distanceTo(Oa);return c<t.near||c>t.far?null:{distance:c,point:Oa.clone(),object:n}}function Fa(n,e,t,i,s,r,o,a,l,c){n.getVertexPosition(a,Da),n.getVertexPosition(l,Ia),n.getVertexPosition(c,Ua);const u=Qm(n,e,t,i,Da,Ia,Ua,Xu);if(u){const f=new ue;$i.getBarycoord(Xu,Da,Ia,Ua,f),s&&(u.uv=$i.getInterpolatedAttribute(s,a,l,c,f,new Ot)),r&&(u.uv1=$i.getInterpolatedAttribute(r,a,l,c,f,new Ot)),o&&(u.normal=$i.getInterpolatedAttribute(o,a,l,c,f,new ue),u.normal.dot(i.direction)>0&&u.normal.multiplyScalar(-1));const p={a,b:l,c,normal:new ue,materialIndex:0};$i.getNormal(Da,Ia,Ua,p.normal),u.face=p,u.barycoord=f}return u}class ua extends Vi{constructor(e=1,t=1,i=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:i,widthSegments:s,heightSegments:r,depthSegments:o};const a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);const l=[],c=[],u=[],f=[];let p=0,m=0;g("z","y","x",-1,-1,i,t,e,o,r,0),g("z","y","x",1,-1,i,t,-e,o,r,1),g("x","z","y",1,1,e,i,t,s,o,2),g("x","z","y",1,-1,e,i,-t,s,o,3),g("x","y","z",1,-1,e,t,i,s,r,4),g("x","y","z",-1,-1,e,t,-i,s,r,5),this.setIndex(l),this.setAttribute("position",new Ai(c,3)),this.setAttribute("normal",new Ai(u,3)),this.setAttribute("uv",new Ai(f,2));function g(x,d,h,M,_,b,S,v,E,R,w){const T=b/E,C=S/R,I=b/2,F=S/2,V=v/2,W=E+1,D=R+1;let B=0,G=0;const Y=new ue;for(let N=0;N<D;N++){const te=N*C-F;for(let q=0;q<W;q++){const fe=q*T-I;Y[x]=fe*M,Y[d]=te*_,Y[h]=V,c.push(Y.x,Y.y,Y.z),Y[x]=0,Y[d]=0,Y[h]=v>0?1:-1,u.push(Y.x,Y.y,Y.z),f.push(q/E),f.push(1-N/R),B+=1}}for(let N=0;N<R;N++)for(let te=0;te<E;te++){const q=p+te+W*N,fe=p+te+W*(N+1),re=p+(te+1)+W*(N+1),ne=p+(te+1)+W*N;l.push(q,fe,ne),l.push(fe,re,ne),G+=6}a.addGroup(m,G,w),m+=G,p+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new ua(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}}function fo(n){const e={};for(const t in n){e[t]={};for(const i in n[t]){const s=n[t][i];s&&(s.isColor||s.isMatrix3||s.isMatrix4||s.isVector2||s.isVector3||s.isVector4||s.isTexture||s.isQuaternion)?s.isRenderTargetTexture?(Mt("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][i]=null):e[t][i]=s.clone():Array.isArray(s)?e[t][i]=s.slice():e[t][i]=s}}return e}function oi(n){const e={};for(let t=0;t<n.length;t++){const i=fo(n[t]);for(const s in i)e[s]=i[s]}return e}function Jm(n){const e=[];for(let t=0;t<n.length;t++)e.push(n[t].clone());return e}function Gf(n){const e=n.getRenderTarget();return e===null?n.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:tn.workingColorSpace}const eg={clone:fo,merge:oi};var tg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ng=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`;class Ns extends Mo{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=tg,this.fragmentShader=ng,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=fo(e.uniforms),this.uniformsGroups=Jm(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){const t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(const s in this.uniforms){const o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;const i={};for(const s in this.extensions)this.extensions[s]===!0&&(i[s]=!0);return Object.keys(i).length>0&&(t.extensions=i),t}}class Wf extends kn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new Ht,this.projectionMatrix=new Ht,this.projectionMatrixInverse=new Ht,this.coordinateSystem=cs,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}}const qs=new ue,qu=new Ot,Yu=new Ot;class Yi extends Wf{constructor(e=50,t=1,i=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=i,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){const t=.5*this.getFilmHeight()/e;this.fov=sa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){const e=Math.tan(jo*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return sa*2*Math.atan(Math.tan(jo*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,i){qs.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(qs.x,qs.y).multiplyScalar(-e/qs.z),qs.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),i.set(qs.x,qs.y).multiplyScalar(-e/qs.z)}getViewSize(e,t){return this.getViewBounds(e,qu,Yu),t.subVectors(Yu,qu)}setViewOffset(e,t,i,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=this.near;let t=e*Math.tan(jo*.5*this.fov)/this.zoom,i=2*t,s=this.aspect*i,r=-.5*s;const o=this.view;if(this.view!==null&&this.view.enabled){const l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*i/c,s*=o.width/l,i*=o.height/c}const a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-i,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}}const kr=-90,zr=1;class ig extends kn{constructor(e,t,i){super(),this.type="CubeCamera",this.renderTarget=i,this.coordinateSystem=null,this.activeMipmapLevel=0;const s=new Yi(kr,zr,e,t);s.layers=this.layers,this.add(s);const r=new Yi(kr,zr,e,t);r.layers=this.layers,this.add(r);const o=new Yi(kr,zr,e,t);o.layers=this.layers,this.add(o);const a=new Yi(kr,zr,e,t);a.layers=this.layers,this.add(a);const l=new Yi(kr,zr,e,t);l.layers=this.layers,this.add(l);const c=new Yi(kr,zr,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){const e=this.coordinateSystem,t=this.children.concat(),[i,s,r,o,a,l]=t;for(const c of t)this.remove(c);if(e===cs)i.up.set(0,1,0),i.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===mc)i.up.set(0,-1,0),i.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(const c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();const{renderTarget:i,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());const[r,o,a,l,c,u]=this.children,f=e.getRenderTarget(),p=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),g=e.xr.enabled;e.xr.enabled=!1;const x=i.texture.generateMipmaps;i.texture.generateMipmaps=!1,e.setRenderTarget(i,0,s),e.render(t,r),e.setRenderTarget(i,1,s),e.render(t,o),e.setRenderTarget(i,2,s),e.render(t,a),e.setRenderTarget(i,3,s),e.render(t,l),e.setRenderTarget(i,4,s),e.render(t,c),i.texture.generateMipmaps=x,e.setRenderTarget(i,5,s),e.render(t,u),e.setRenderTarget(f,p,m),e.xr.enabled=g,i.texture.needsPMREMUpdate=!0}}class Xf extends ai{constructor(e=[],t=co,i,s,r,o,a,l,c,u){super(e,t,i,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}}class sg extends ir{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;const i={width:e,height:e,depth:1},s=[i,i,i,i,i,i];this.texture=new Xf(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new ua(5,5,5),r=new Ns({name:"CubemapFromEquirect",uniforms:fo(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:gi,blending:Cs});r.uniforms.tEquirect.value=t;const o=new Us(s,r),a=t.minFilter;return t.minFilter===mr&&(t.minFilter=ki),new ig(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,i=!0,s=!0){const r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,i,s);e.setRenderTarget(r)}}class ka extends kn{constructor(){super(),this.isGroup=!0,this.type="Group"}}const rg={type:"move"};class ll{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ka,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ka,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new ue,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new ue),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ka,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new ue,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new ue),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){const t=this._hand;if(t)for(const i of e.hand.values())this._getHandJoint(t,i)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,i){let s=null,r=null,o=null;const a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(const x of e.hand.values()){const d=t.getJointPose(x,i),h=this._getHandJoint(c,x);d!==null&&(h.matrix.fromArray(d.transform.matrix),h.matrix.decompose(h.position,h.rotation,h.scale),h.matrixWorldNeedsUpdate=!0,h.jointRadius=d.radius),h.visible=d!==null}const u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],p=u.position.distanceTo(f.position),m=.02,g=.005;c.inputState.pinching&&p>m+g?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&p<=m-g&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,i),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1));a!==null&&(s=t.getPose(e.targetRaySpace,i),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(rg)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){const i=new ka;i.matrixAutoUpdate=!1,i.visible=!1,e.joints[t.jointName]=i,e.add(i)}return e.joints[t.jointName]}}class vS extends kn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new hs,this.environmentIntensity=1,this.environmentRotation=new hs,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){const t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}}const ju=new ue,$u=new Mn,Ku=new Mn,og=new ue,Zu=new Ht,za=new ue,hl=new bo,Qu=new Ht,ul=new Ac;class yS extends Us{constructor(e,t){super(e,t),this.isSkinnedMesh=!0,this.type="SkinnedMesh",this.bindMode=wu,this.bindMatrix=new Ht,this.bindMatrixInverse=new Ht,this.boundingBox=null,this.boundingSphere=null}computeBoundingBox(){const e=this.geometry;this.boundingBox===null&&(this.boundingBox=new Ps),this.boundingBox.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,za),this.boundingBox.expandByPoint(za)}computeBoundingSphere(){const e=this.geometry;this.boundingSphere===null&&(this.boundingSphere=new bo),this.boundingSphere.makeEmpty();const t=e.getAttribute("position");for(let i=0;i<t.count;i++)this.getVertexPosition(i,za),this.boundingSphere.expandByPoint(za)}copy(e,t){return super.copy(e,t),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,e.boundingBox!==null&&(this.boundingBox=e.boundingBox.clone()),e.boundingSphere!==null&&(this.boundingSphere=e.boundingSphere.clone()),this}raycast(e,t){const i=this.material,s=this.matrixWorld;i!==void 0&&(this.boundingSphere===null&&this.computeBoundingSphere(),hl.copy(this.boundingSphere),hl.applyMatrix4(s),e.ray.intersectsSphere(hl)!==!1&&(Qu.copy(s).invert(),ul.copy(e.ray).applyMatrix4(Qu),!(this.boundingBox!==null&&ul.intersectsBox(this.boundingBox)===!1)&&this._computeIntersections(e,t,ul)))}getVertexPosition(e,t){return super.getVertexPosition(e,t),this.applyBoneTransform(e,t),t}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){const e=new Mn,t=this.geometry.attributes.skinWeight;for(let i=0,s=t.count;i<s;i++){e.fromBufferAttribute(t,i);const r=1/e.manhattanLength();r!==1/0?e.multiplyScalar(r):e.set(1,0,0,0),t.setXYZW(i,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode===wu?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode===om?this.bindMatrixInverse.copy(this.bindMatrix).invert():Mt("SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}applyBoneTransform(e,t){const i=this.skeleton,s=this.geometry;$u.fromBufferAttribute(s.attributes.skinIndex,e),Ku.fromBufferAttribute(s.attributes.skinWeight,e),ju.copy(t).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let r=0;r<4;r++){const o=Ku.getComponent(r);if(o!==0){const a=$u.getComponent(r);Zu.multiplyMatrices(i.bones[a].matrixWorld,i.boneInverses[a]),t.addScaledVector(og.copy(ju).applyMatrix4(Zu),o)}}return t.applyMatrix4(this.bindMatrixInverse)}}class ag extends kn{constructor(){super(),this.isBone=!0,this.type="Bone"}}class qf extends ai{constructor(e=null,t=1,i=1,s,r,o,a,l,c=Ti,u=Ti,f,p){super(null,o,a,l,c,u,s,r,f,p),this.isDataTexture=!0,this.image={data:e,width:t,height:i},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}}const Ju=new Ht,cg=new Ht;class Yf{constructor(e=[],t=[]){this.uuid=vr(),this.bones=e.slice(0),this.boneInverses=t,this.boneMatrices=null,this.boneTexture=null,this.init()}init(){const e=this.bones,t=this.boneInverses;if(this.boneMatrices=new Float32Array(e.length*16),t.length===0)this.calculateInverses();else if(e.length!==t.length){Mt("Skeleton: Number of inverse bone matrices does not match amount of bones."),this.boneInverses=[];for(let i=0,s=this.bones.length;i<s;i++)this.boneInverses.push(new Ht)}}calculateInverses(){this.boneInverses.length=0;for(let e=0,t=this.bones.length;e<t;e++){const i=new Ht;this.bones[e]&&i.copy(this.bones[e].matrixWorld).invert(),this.boneInverses.push(i)}}pose(){for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&i.matrixWorld.copy(this.boneInverses[e]).invert()}for(let e=0,t=this.bones.length;e<t;e++){const i=this.bones[e];i&&(i.parent&&i.parent.isBone?(i.matrix.copy(i.parent.matrixWorld).invert(),i.matrix.multiply(i.matrixWorld)):i.matrix.copy(i.matrixWorld),i.matrix.decompose(i.position,i.quaternion,i.scale))}}update(){const e=this.bones,t=this.boneInverses,i=this.boneMatrices,s=this.boneTexture;for(let r=0,o=e.length;r<o;r++){const a=e[r]?e[r].matrixWorld:cg;Ju.multiplyMatrices(a,t[r]),Ju.toArray(i,r*16)}s!==null&&(s.needsUpdate=!0)}clone(){return new Yf(this.bones,this.boneInverses)}computeBoneTexture(){let e=Math.sqrt(this.bones.length*4);e=Math.ceil(e/4)*4,e=Math.max(e,4);const t=new Float32Array(e*e*4);t.set(this.boneMatrices);const i=new qf(t,e,e,zi,ji);return i.needsUpdate=!0,this.boneMatrices=t,this.boneTexture=i,this}getBoneByName(e){for(let t=0,i=this.bones.length;t<i;t++){const s=this.bones[t];if(s.name===e)return s}}dispose(){this.boneTexture!==null&&(this.boneTexture.dispose(),this.boneTexture=null)}fromJSON(e,t){this.uuid=e.uuid;for(let i=0,s=e.bones.length;i<s;i++){const r=e.bones[i];let o=t[r];o===void 0&&(Mt("Skeleton: No bone found with UUID:",r),o=new ag),this.bones.push(o),this.boneInverses.push(new Ht().fromArray(e.boneInverses[i]))}return this.init(),this}toJSON(){const e={metadata:{version:4.7,type:"Skeleton",generator:"Skeleton.toJSON"},bones:[],boneInverses:[]};e.uuid=this.uuid;const t=this.bones,i=this.boneInverses;for(let s=0,r=t.length;s<r;s++){const o=t[s];e.bones.push(o.uuid);const a=i[s];e.boneInverses.push(a.toArray())}return e}}const dl=new ue,lg=new ue,hg=new Nt;class Ks{constructor(e=new ue(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,i,s){return this.normal.set(e,t,i),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,i){const s=dl.subVectors(i,t).cross(lg.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){const e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t){const i=e.delta(dl),s=this.normal.dot(i);if(s===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;const r=-(e.start.dot(this.normal)+this.constant)/s;return r<0||r>1?null:t.copy(e.start).addScaledVector(i,r)}intersectsLine(e){const t=this.distanceToPoint(e.start),i=this.distanceToPoint(e.end);return t<0&&i>0||i<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){const i=t||hg.getNormalMatrix(e),s=this.coplanarPoint(dl).applyMatrix4(e),r=this.normal.applyMatrix3(i).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}}const cr=new bo,ug=new Ot(.5,.5),Ba=new ue;class $h{constructor(e=new Ks,t=new Ks,i=new Ks,s=new Ks,r=new Ks,o=new Ks){this.planes=[e,t,i,s,r,o]}set(e,t,i,s,r,o){const a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(i),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){const t=this.planes;for(let i=0;i<6;i++)t[i].copy(e.planes[i]);return this}setFromProjectionMatrix(e,t=cs,i=!1){const s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],f=r[5],p=r[6],m=r[7],g=r[8],x=r[9],d=r[10],h=r[11],M=r[12],_=r[13],b=r[14],S=r[15];if(s[0].setComponents(c-o,m-u,h-g,S-M).normalize(),s[1].setComponents(c+o,m+u,h+g,S+M).normalize(),s[2].setComponents(c+a,m+f,h+x,S+_).normalize(),s[3].setComponents(c-a,m-f,h-x,S-_).normalize(),i)s[4].setComponents(l,p,d,b).normalize(),s[5].setComponents(c-l,m-p,h-d,S-b).normalize();else if(s[4].setComponents(c-l,m-p,h-d,S-b).normalize(),t===cs)s[5].setComponents(c+l,m+p,h+d,S+b).normalize();else if(t===mc)s[5].setComponents(l,p,d,b).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),cr.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{const t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),cr.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(cr)}intersectsSprite(e){cr.center.set(0,0,0);const t=ug.distanceTo(e.center);return cr.radius=.7071067811865476+t,cr.applyMatrix4(e.matrixWorld),this.intersectsSphere(cr)}intersectsSphere(e){const t=this.planes,i=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(i)<s)return!1;return!0}intersectsBox(e){const t=this.planes;for(let i=0;i<6;i++){const s=t[i];if(Ba.x=s.normal.x>0?e.max.x:e.min.x,Ba.y=s.normal.y>0?e.max.y:e.min.y,Ba.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Ba)<0)return!1}return!0}containsPoint(e){const t=this.planes;for(let i=0;i<6;i++)if(t[i].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}}class Kh extends Mo{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Et(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}}const xc=new ue,_c=new ue,ed=new Ht,Po=new Ac,Va=new bo,fl=new ue,td=new ue;class dg extends kn{constructor(e=new Vi,t=new Kh){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[0];for(let s=1,r=t.count;s<r;s++)xc.fromBufferAttribute(t,s-1),_c.fromBufferAttribute(t,s),i[s]=i[s-1],i[s]+=xc.distanceTo(_c);e.setAttribute("lineDistance",new Ai(i,1))}else Mt("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){const i=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=i.drawRange;if(i.boundingSphere===null&&i.computeBoundingSphere(),Va.copy(i.boundingSphere),Va.applyMatrix4(s),Va.radius+=r,e.ray.intersectsSphere(Va)===!1)return;ed.copy(s).invert(),Po.copy(e.ray).applyMatrix4(ed);const a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=i.index,p=i.attributes.position;if(u!==null){const m=Math.max(0,o.start),g=Math.min(u.count,o.start+o.count);for(let x=m,d=g-1;x<d;x+=c){const h=u.getX(x),M=u.getX(x+1),_=Ha(this,e,Po,l,h,M,x);_&&t.push(_)}if(this.isLineLoop){const x=u.getX(g-1),d=u.getX(m),h=Ha(this,e,Po,l,x,d,g-1);h&&t.push(h)}}else{const m=Math.max(0,o.start),g=Math.min(p.count,o.start+o.count);for(let x=m,d=g-1;x<d;x+=c){const h=Ha(this,e,Po,l,x,x+1,x);h&&t.push(h)}if(this.isLineLoop){const x=Ha(this,e,Po,l,g-1,m,g-1);x&&t.push(x)}}}updateMorphTargets(){const t=this.geometry.morphAttributes,i=Object.keys(t);if(i.length>0){const s=t[i[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){const a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}}function Ha(n,e,t,i,s,r,o){const a=n.geometry.attributes.position;if(xc.fromBufferAttribute(a,s),_c.fromBufferAttribute(a,r),t.distanceSqToSegment(xc,_c,fl,td)>i)return;fl.applyMatrix4(n.matrixWorld);const c=e.ray.origin.distanceTo(fl);if(!(c<e.near||c>e.far))return{distance:c,point:td.clone().applyMatrix4(n.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:n}}const nd=new ue,id=new ue;class jf extends dg{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){const e=this.geometry;if(e.index===null){const t=e.attributes.position,i=[];for(let s=0,r=t.count;s<r;s+=2)nd.fromBufferAttribute(t,s),id.fromBufferAttribute(t,s+1),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+nd.distanceTo(id);e.setAttribute("lineDistance",new Ai(i,1))}else Mt("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}}class $f extends ai{constructor(e,t,i=_r,s,r,o,a=Ti,l=Ti,c,u=ho,f=1){if(u!==ho&&u!==to)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");const p={width:e,height:t,depth:f};super(p,s,r,o,a,l,u,i,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new jh(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){const t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}}class Kf extends ai{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}}class Rc extends Vi{constructor(e=1,t=1,i=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:i,heightSegments:s};const r=e/2,o=t/2,a=Math.floor(i),l=Math.floor(s),c=a+1,u=l+1,f=e/a,p=t/l,m=[],g=[],x=[],d=[];for(let h=0;h<u;h++){const M=h*p-o;for(let _=0;_<c;_++){const b=_*f-r;g.push(b,-M,0),x.push(0,0,1),d.push(_/a),d.push(1-h/l)}}for(let h=0;h<l;h++)for(let M=0;M<a;M++){const _=M+c*h,b=M+c*(h+1),S=M+1+c*(h+1),v=M+1+c*h;m.push(_,b,v),m.push(b,S,v)}this.setIndex(m),this.setAttribute("position",new Ai(g,3)),this.setAttribute("normal",new Ai(x,3)),this.setAttribute("uv",new Ai(d,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Rc(e.width,e.height,e.widthSegments,e.heightSegments)}}class SS extends Mo{constructor(e){super(),this.isMeshStandardMaterial=!0,this.type="MeshStandardMaterial",this.defines={STANDARD:""},this.color=new Et(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new Et(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=If,this.normalScale=new Ot(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new hs,this.envMapIntensity=1,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.flatShading=!1,this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.envMapIntensity=e.envMapIntensity,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.flatShading=e.flatShading,this.fog=e.fog,this}}class fg extends Mo{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=cm,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}}class pg extends Mo{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}}class Zh extends kn{constructor(e,t=1){super(),this.isLight=!0,this.type="Light",this.color=new Et(e),this.intensity=t}dispose(){}copy(e,t){return super.copy(e,t),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){const t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),this.target!==void 0&&(t.object.target=this.target.uuid),t}}class mg extends Zh{constructor(e,t,i){super(e,i),this.isHemisphereLight=!0,this.type="HemisphereLight",this.position.copy(kn.DEFAULT_UP),this.updateMatrix(),this.groundColor=new Et(t)}copy(e,t){return super.copy(e,t),this.groundColor.copy(e.groundColor),this}}const pl=new Ht,sd=new ue,rd=new ue;class gg{constructor(e){this.camera=e,this.intensity=1,this.bias=0,this.normalBias=0,this.radius=1,this.blurSamples=8,this.mapSize=new Ot(512,512),this.mapType=ls,this.map=null,this.mapPass=null,this.matrix=new Ht,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new $h,this._frameExtents=new Ot(1,1),this._viewportCount=1,this._viewports=[new Mn(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){const t=this.camera,i=this.matrix;sd.setFromMatrixPosition(e.matrixWorld),t.position.copy(sd),rd.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(rd),t.updateMatrixWorld(),pl.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(pl,t.coordinateSystem,t.reversedDepth),t.reversedDepth?i.set(.5,0,0,.5,0,.5,0,.5,0,0,1,0,0,0,0,1):i.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),i.multiply(pl)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.intensity=e.intensity,this.bias=e.bias,this.radius=e.radius,this.autoUpdate=e.autoUpdate,this.needsUpdate=e.needsUpdate,this.normalBias=e.normalBias,this.blurSamples=e.blurSamples,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){const e={};return this.intensity!==1&&(e.intensity=this.intensity),this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}}class Zf extends Wf{constructor(e=-1,t=1,i=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=i,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,i,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=i,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){const e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),i=(this.right+this.left)/2,s=(this.top+this.bottom)/2;let r=i-e,o=i+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){const c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){const t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}}class xg extends gg{constructor(){super(new Zf(-5,5,5,-5,.5,500)),this.isDirectionalLightShadow=!0}}class _g extends Zh{constructor(e,t){super(e,t),this.isDirectionalLight=!0,this.type="DirectionalLight",this.position.copy(kn.DEFAULT_UP),this.updateMatrix(),this.target=new kn,this.shadow=new xg}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}}class bg extends Zh{constructor(e,t){super(e,t),this.isAmbientLight=!0,this.type="AmbientLight"}}class Mg extends Yi{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}}class od{constructor(e=1,t=0,i=0){this.radius=e,this.phi=t,this.theta=i}set(e,t,i){return this.radius=e,this.phi=t,this.theta=i,this}copy(e){return this.radius=e.radius,this.phi=e.phi,this.theta=e.theta,this}makeSafe(){return this.phi=Vt(this.phi,1e-6,Math.PI-1e-6),this}setFromVector3(e){return this.setFromCartesianCoords(e.x,e.y,e.z)}setFromCartesianCoords(e,t,i){return this.radius=Math.sqrt(e*e+t*t+i*i),this.radius===0?(this.theta=0,this.phi=0):(this.theta=Math.atan2(e,i),this.phi=Math.acos(Vt(t/this.radius,-1,1))),this}clone(){return new this.constructor().copy(this)}}const Ys=new ue,Ga=new Ht,ml=new Ht;class ES extends jf{constructor(e){const t=Qf(e),i=new Vi,s=[],r=[];for(let c=0;c<t.length;c++){const u=t[c];u.parent&&u.parent.isBone&&(s.push(0,0,0),s.push(0,0,0),r.push(0,0,0),r.push(0,0,0))}i.setAttribute("position",new Ai(s,3)),i.setAttribute("color",new Ai(r,3));const o=new Kh({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(i,o),this.isSkeletonHelper=!0,this.type="SkeletonHelper",this.root=e,this.bones=t,this.matrix=e.matrixWorld,this.matrixAutoUpdate=!1;const a=new Et(255),l=new Et(65280);this.setColors(a,l)}updateMatrixWorld(e){const t=this.bones,i=this.geometry,s=i.getAttribute("position");ml.copy(this.root.matrixWorld).invert();for(let r=0,o=0;r<t.length;r++){const a=t[r];a.parent&&a.parent.isBone&&(Ga.multiplyMatrices(ml,a.matrixWorld),Ys.setFromMatrixPosition(Ga),s.setXYZ(o,Ys.x,Ys.y,Ys.z),Ga.multiplyMatrices(ml,a.parent.matrixWorld),Ys.setFromMatrixPosition(Ga),s.setXYZ(o+1,Ys.x,Ys.y,Ys.z),o+=2)}i.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(e)}setColors(e,t){const s=this.geometry.getAttribute("color");for(let r=0;r<s.count;r+=2)s.setXYZ(r,e.r,e.g,e.b),s.setXYZ(r+1,t.r,t.g,t.b);return s.needsUpdate=!0,this}dispose(){this.geometry.dispose(),this.material.dispose()}}function Qf(n){const e=[];n.isBone===!0&&e.push(n);for(let t=0;t<n.children.length;t++)e.push(...Qf(n.children[t]));return e}class wS extends jf{constructor(e=10,t=10,i=4473924,s=8947848){i=new Et(i),s=new Et(s);const r=t/2,o=e/t,a=e/2,l=[],c=[];for(let p=0,m=0,g=-a;p<=t;p++,g+=o){l.push(-a,0,g,a,0,g),l.push(g,0,-a,g,0,a);const x=p===r?i:s;x.toArray(c,m),m+=3,x.toArray(c,m),m+=3,x.toArray(c,m),m+=3,x.toArray(c,m),m+=3}const u=new Vi;u.setAttribute("position",new Ai(l,3)),u.setAttribute("color",new Ai(c,3));const f=new Kh({vertexColors:!0,toneMapped:!1});super(u,f),this.type="GridHelper"}dispose(){this.geometry.dispose(),this.material.dispose()}}class vg extends Mr{constructor(e,t=null){super(),this.object=e,this.domElement=t,this.enabled=!0,this.state=-1,this.keys={},this.mouseButtons={LEFT:null,MIDDLE:null,RIGHT:null},this.touches={ONE:null,TWO:null}}connect(e){if(e===void 0){Mt("Controls: connect() now requires an element.");return}this.domElement!==null&&this.disconnect(),this.domElement=e}disconnect(){}dispose(){}update(){}}function ad(n,e,t,i){const s=yg(i);switch(t){case Lf:return n*e;case Df:return n*e/s.components*s.byteLength;case Gh:return n*e/s.components*s.byteLength;case Wh:return n*e*2/s.components*s.byteLength;case Xh:return n*e*2/s.components*s.byteLength;case Pf:return n*e*3/s.components*s.byteLength;case zi:return n*e*4/s.components*s.byteLength;case qh:return n*e*4/s.components*s.byteLength;case rc:case oc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case ac:case cc:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case Ql:case eh:return Math.max(n,16)*Math.max(e,8)/4;case Zl:case Jl:return Math.max(n,8)*Math.max(e,8)/2;case th:case nh:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*8;case ih:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case sh:return Math.floor((n+3)/4)*Math.floor((e+3)/4)*16;case rh:return Math.floor((n+4)/5)*Math.floor((e+3)/4)*16;case oh:return Math.floor((n+4)/5)*Math.floor((e+4)/5)*16;case ah:return Math.floor((n+5)/6)*Math.floor((e+4)/5)*16;case ch:return Math.floor((n+5)/6)*Math.floor((e+5)/6)*16;case lh:return Math.floor((n+7)/8)*Math.floor((e+4)/5)*16;case hh:return Math.floor((n+7)/8)*Math.floor((e+5)/6)*16;case uh:return Math.floor((n+7)/8)*Math.floor((e+7)/8)*16;case dh:return Math.floor((n+9)/10)*Math.floor((e+4)/5)*16;case fh:return Math.floor((n+9)/10)*Math.floor((e+5)/6)*16;case ph:return Math.floor((n+9)/10)*Math.floor((e+7)/8)*16;case mh:return Math.floor((n+9)/10)*Math.floor((e+9)/10)*16;case gh:return Math.floor((n+11)/12)*Math.floor((e+9)/10)*16;case xh:return Math.floor((n+11)/12)*Math.floor((e+11)/12)*16;case _h:case bh:case Mh:return Math.ceil(n/4)*Math.ceil(e/4)*16;case vh:case yh:return Math.ceil(n/4)*Math.ceil(e/4)*8;case Sh:case Eh:return Math.ceil(n/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function yg(n){switch(n){case ls:case Tf:return{byteLength:1,components:1};case na:case Af:case _o:return{byteLength:2,components:1};case Vh:case Hh:return{byteLength:2,components:4};case _r:case Bh:case ji:return{byteLength:4,components:1};case Rf:case Cf:return{byteLength:4,components:3}}throw new Error(`Unknown texture type ${n}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"181"}}));typeof window<"u"&&(window.__THREE__?Mt("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="181");function Jf(){let n=null,e=!1,t=null,i=null;function s(r,o){t(r,o),i=n.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&(i=n.requestAnimationFrame(s),e=!0)},stop:function(){n.cancelAnimationFrame(i),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){n=r}}}function Sg(n){const e=new WeakMap;function t(a,l){const c=a.array,u=a.usage,f=c.byteLength,p=n.createBuffer();n.bindBuffer(l,p),n.bufferData(l,c,u),a.onUploadCallback();let m;if(c instanceof Float32Array)m=n.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)m=n.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?m=n.HALF_FLOAT:m=n.UNSIGNED_SHORT;else if(c instanceof Int16Array)m=n.SHORT;else if(c instanceof Uint32Array)m=n.UNSIGNED_INT;else if(c instanceof Int32Array)m=n.INT;else if(c instanceof Int8Array)m=n.BYTE;else if(c instanceof Uint8Array)m=n.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)m=n.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:p,type:m,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}function i(a,l,c){const u=l.array,f=l.updateRanges;if(n.bindBuffer(c,a),f.length===0)n.bufferSubData(c,0,u);else{f.sort((m,g)=>m.start-g.start);let p=0;for(let m=1;m<f.length;m++){const g=f[p],x=f[m];x.start<=g.start+g.count+1?g.count=Math.max(g.count,x.start+x.count-g.start):(++p,f[p]=x)}f.length=p+1;for(let m=0,g=f.length;m<g;m++){const x=f[m];n.bufferSubData(c,x.start*u.BYTES_PER_ELEMENT,u,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);const l=e.get(a);l&&(n.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){const u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}const c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Eg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,wg=`#ifdef USE_ALPHAHASH
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
#endif`,Tg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Ag=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Rg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Cg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Lg=`#ifdef USE_AOMAP
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
#endif`,Pg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Dg=`#ifdef USE_BATCHING
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
#endif`,Ig=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Ug=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Ng=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Og=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Fg=`#ifdef USE_IRIDESCENCE
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
#endif`,kg=`#ifdef USE_BUMPMAP
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
#endif`,zg=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,Bg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Vg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Hg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Gg=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Wg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Xg=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec3 vColor;
#endif`,qg=`#if defined( USE_COLOR_ALPHA )
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
#endif`,Yg=`#define PI 3.141592653589793
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
} // validated`,jg=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,$g=`vec3 transformedNormal = objectNormal;
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
#endif`,Kg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Zg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Qg=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Jg=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ex="gl_FragColor = linearToOutputTexel( gl_FragColor );",tx=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,nx=`#ifdef USE_ENVMAP
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
#endif`,ix=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,sx=`#ifdef USE_ENVMAP
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
#endif`,rx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,ox=`#ifdef USE_ENVMAP
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
#endif`,ax=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,cx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,lx=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,hx=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ux=`#ifdef USE_GRADIENTMAP
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
}`,dx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,fx=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,px=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,mx=`uniform bool receiveShadow;
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
#endif`,gx=`#ifdef USE_ENVMAP
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
#endif`,xx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,_x=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,bx=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Mx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,vx=`PhysicalMaterial material;
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
#endif`,yx=`uniform sampler2D dfgLUT;
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
}`,Sx=`
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
#endif`,Ex=`#if defined( RE_IndirectDiffuse )
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
#endif`,wx=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Tx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ax=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Rx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Cx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Lx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Px=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Dx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Ix=`#if defined( USE_POINTS_UV )
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
#endif`,Ux=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Nx=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Ox=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Fx=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,kx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,zx=`#ifdef USE_MORPHTARGETS
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
#endif`,Bx=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Vx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Hx=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Gx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Wx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Xx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,qx=`#ifdef USE_NORMALMAP
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
#endif`,Yx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,jx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,$x=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Kx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Zx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Qx=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,Jx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,e1=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,t1=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,n1=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,i1=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,s1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,r1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,o1=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,a1=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,c1=`float getShadowMask() {
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
}`,l1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,h1=`#ifdef USE_SKINNING
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
#endif`,u1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,d1=`#ifdef USE_SKINNING
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
#endif`,f1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,p1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,m1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,g1=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,x1=`#ifdef USE_TRANSMISSION
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
#endif`,_1=`#ifdef USE_TRANSMISSION
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
#endif`,b1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,M1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,v1=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,y1=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const S1=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,E1=`uniform sampler2D t2D;
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
}`,w1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,T1=`#ifdef ENVMAP_TYPE_CUBE
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
}`,A1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,R1=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,C1=`#include <common>
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
}`,L1=`#if DEPTH_PACKING == 3200
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
}`,P1=`#define DISTANCE
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
}`,D1=`#define DISTANCE
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
}`,I1=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,U1=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,N1=`uniform float scale;
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
}`,O1=`uniform vec3 diffuse;
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
}`,F1=`#include <common>
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
}`,k1=`uniform vec3 diffuse;
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
}`,z1=`#define LAMBERT
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
}`,B1=`#define LAMBERT
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
}`,V1=`#define MATCAP
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
}`,H1=`#define MATCAP
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
}`,G1=`#define NORMAL
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
}`,W1=`#define NORMAL
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
}`,X1=`#define PHONG
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
}`,q1=`#define PHONG
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
}`,Y1=`#define STANDARD
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
}`,j1=`#define STANDARD
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
}`,$1=`#define TOON
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
}`,K1=`#define TOON
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
}`,Z1=`uniform float size;
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
}`,Q1=`uniform vec3 diffuse;
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
}`,J1=`#include <common>
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
}`,e_=`uniform vec3 color;
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
}`,t_=`uniform float rotation;
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
}`,n_=`uniform vec3 diffuse;
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
}`,kt={alphahash_fragment:Eg,alphahash_pars_fragment:wg,alphamap_fragment:Tg,alphamap_pars_fragment:Ag,alphatest_fragment:Rg,alphatest_pars_fragment:Cg,aomap_fragment:Lg,aomap_pars_fragment:Pg,batching_pars_vertex:Dg,batching_vertex:Ig,begin_vertex:Ug,beginnormal_vertex:Ng,bsdfs:Og,iridescence_fragment:Fg,bumpmap_pars_fragment:kg,clipping_planes_fragment:zg,clipping_planes_pars_fragment:Bg,clipping_planes_pars_vertex:Vg,clipping_planes_vertex:Hg,color_fragment:Gg,color_pars_fragment:Wg,color_pars_vertex:Xg,color_vertex:qg,common:Yg,cube_uv_reflection_fragment:jg,defaultnormal_vertex:$g,displacementmap_pars_vertex:Kg,displacementmap_vertex:Zg,emissivemap_fragment:Qg,emissivemap_pars_fragment:Jg,colorspace_fragment:ex,colorspace_pars_fragment:tx,envmap_fragment:nx,envmap_common_pars_fragment:ix,envmap_pars_fragment:sx,envmap_pars_vertex:rx,envmap_physical_pars_fragment:gx,envmap_vertex:ox,fog_vertex:ax,fog_pars_vertex:cx,fog_fragment:lx,fog_pars_fragment:hx,gradientmap_pars_fragment:ux,lightmap_pars_fragment:dx,lights_lambert_fragment:fx,lights_lambert_pars_fragment:px,lights_pars_begin:mx,lights_toon_fragment:xx,lights_toon_pars_fragment:_x,lights_phong_fragment:bx,lights_phong_pars_fragment:Mx,lights_physical_fragment:vx,lights_physical_pars_fragment:yx,lights_fragment_begin:Sx,lights_fragment_maps:Ex,lights_fragment_end:wx,logdepthbuf_fragment:Tx,logdepthbuf_pars_fragment:Ax,logdepthbuf_pars_vertex:Rx,logdepthbuf_vertex:Cx,map_fragment:Lx,map_pars_fragment:Px,map_particle_fragment:Dx,map_particle_pars_fragment:Ix,metalnessmap_fragment:Ux,metalnessmap_pars_fragment:Nx,morphinstance_vertex:Ox,morphcolor_vertex:Fx,morphnormal_vertex:kx,morphtarget_pars_vertex:zx,morphtarget_vertex:Bx,normal_fragment_begin:Vx,normal_fragment_maps:Hx,normal_pars_fragment:Gx,normal_pars_vertex:Wx,normal_vertex:Xx,normalmap_pars_fragment:qx,clearcoat_normal_fragment_begin:Yx,clearcoat_normal_fragment_maps:jx,clearcoat_pars_fragment:$x,iridescence_pars_fragment:Kx,opaque_fragment:Zx,packing:Qx,premultiplied_alpha_fragment:Jx,project_vertex:e1,dithering_fragment:t1,dithering_pars_fragment:n1,roughnessmap_fragment:i1,roughnessmap_pars_fragment:s1,shadowmap_pars_fragment:r1,shadowmap_pars_vertex:o1,shadowmap_vertex:a1,shadowmask_pars_fragment:c1,skinbase_vertex:l1,skinning_pars_vertex:h1,skinning_vertex:u1,skinnormal_vertex:d1,specularmap_fragment:f1,specularmap_pars_fragment:p1,tonemapping_fragment:m1,tonemapping_pars_fragment:g1,transmission_fragment:x1,transmission_pars_fragment:_1,uv_pars_fragment:b1,uv_pars_vertex:M1,uv_vertex:v1,worldpos_vertex:y1,background_vert:S1,background_frag:E1,backgroundCube_vert:w1,backgroundCube_frag:T1,cube_vert:A1,cube_frag:R1,depth_vert:C1,depth_frag:L1,distanceRGBA_vert:P1,distanceRGBA_frag:D1,equirect_vert:I1,equirect_frag:U1,linedashed_vert:N1,linedashed_frag:O1,meshbasic_vert:F1,meshbasic_frag:k1,meshlambert_vert:z1,meshlambert_frag:B1,meshmatcap_vert:V1,meshmatcap_frag:H1,meshnormal_vert:G1,meshnormal_frag:W1,meshphong_vert:X1,meshphong_frag:q1,meshphysical_vert:Y1,meshphysical_frag:j1,meshtoon_vert:$1,meshtoon_frag:K1,points_vert:Z1,points_frag:Q1,shadow_vert:J1,shadow_frag:e_,sprite_vert:t_,sprite_frag:n_},$e={common:{diffuse:{value:new Et(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Nt},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Nt}},envmap:{envMap:{value:null},envMapRotation:{value:new Nt},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Nt}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Nt}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Nt},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Nt},normalScale:{value:new Ot(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Nt},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Nt}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Nt}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Nt}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Et(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotShadowMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Et(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0},uvTransform:{value:new Nt}},sprite:{diffuse:{value:new Et(16777215)},opacity:{value:1},center:{value:new Ot(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Nt},alphaMap:{value:null},alphaMapTransform:{value:new Nt},alphaTest:{value:0}}},rs={basic:{uniforms:oi([$e.common,$e.specularmap,$e.envmap,$e.aomap,$e.lightmap,$e.fog]),vertexShader:kt.meshbasic_vert,fragmentShader:kt.meshbasic_frag},lambert:{uniforms:oi([$e.common,$e.specularmap,$e.envmap,$e.aomap,$e.lightmap,$e.emissivemap,$e.bumpmap,$e.normalmap,$e.displacementmap,$e.fog,$e.lights,{emissive:{value:new Et(0)}}]),vertexShader:kt.meshlambert_vert,fragmentShader:kt.meshlambert_frag},phong:{uniforms:oi([$e.common,$e.specularmap,$e.envmap,$e.aomap,$e.lightmap,$e.emissivemap,$e.bumpmap,$e.normalmap,$e.displacementmap,$e.fog,$e.lights,{emissive:{value:new Et(0)},specular:{value:new Et(1118481)},shininess:{value:30}}]),vertexShader:kt.meshphong_vert,fragmentShader:kt.meshphong_frag},standard:{uniforms:oi([$e.common,$e.envmap,$e.aomap,$e.lightmap,$e.emissivemap,$e.bumpmap,$e.normalmap,$e.displacementmap,$e.roughnessmap,$e.metalnessmap,$e.fog,$e.lights,{emissive:{value:new Et(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:kt.meshphysical_vert,fragmentShader:kt.meshphysical_frag},toon:{uniforms:oi([$e.common,$e.aomap,$e.lightmap,$e.emissivemap,$e.bumpmap,$e.normalmap,$e.displacementmap,$e.gradientmap,$e.fog,$e.lights,{emissive:{value:new Et(0)}}]),vertexShader:kt.meshtoon_vert,fragmentShader:kt.meshtoon_frag},matcap:{uniforms:oi([$e.common,$e.bumpmap,$e.normalmap,$e.displacementmap,$e.fog,{matcap:{value:null}}]),vertexShader:kt.meshmatcap_vert,fragmentShader:kt.meshmatcap_frag},points:{uniforms:oi([$e.points,$e.fog]),vertexShader:kt.points_vert,fragmentShader:kt.points_frag},dashed:{uniforms:oi([$e.common,$e.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:kt.linedashed_vert,fragmentShader:kt.linedashed_frag},depth:{uniforms:oi([$e.common,$e.displacementmap]),vertexShader:kt.depth_vert,fragmentShader:kt.depth_frag},normal:{uniforms:oi([$e.common,$e.bumpmap,$e.normalmap,$e.displacementmap,{opacity:{value:1}}]),vertexShader:kt.meshnormal_vert,fragmentShader:kt.meshnormal_frag},sprite:{uniforms:oi([$e.sprite,$e.fog]),vertexShader:kt.sprite_vert,fragmentShader:kt.sprite_frag},background:{uniforms:{uvTransform:{value:new Nt},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:kt.background_vert,fragmentShader:kt.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Nt}},vertexShader:kt.backgroundCube_vert,fragmentShader:kt.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:kt.cube_vert,fragmentShader:kt.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:kt.equirect_vert,fragmentShader:kt.equirect_frag},distanceRGBA:{uniforms:oi([$e.common,$e.displacementmap,{referencePosition:{value:new ue},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:kt.distanceRGBA_vert,fragmentShader:kt.distanceRGBA_frag},shadow:{uniforms:oi([$e.lights,$e.fog,{color:{value:new Et(0)},opacity:{value:1}}]),vertexShader:kt.shadow_vert,fragmentShader:kt.shadow_frag}};rs.physical={uniforms:oi([rs.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Nt},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Nt},clearcoatNormalScale:{value:new Ot(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Nt},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Nt},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Nt},sheen:{value:0},sheenColor:{value:new Et(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Nt},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Nt},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Nt},transmissionSamplerSize:{value:new Ot},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Nt},attenuationDistance:{value:0},attenuationColor:{value:new Et(0)},specularColor:{value:new Et(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Nt},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Nt},anisotropyVector:{value:new Ot},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Nt}}]),vertexShader:kt.meshphysical_vert,fragmentShader:kt.meshphysical_frag};const Wa={r:0,b:0,g:0},lr=new hs,i_=new Ht;function s_(n,e,t,i,s,r,o){const a=new Et(0);let l=r===!0?0:1,c,u,f=null,p=0,m=null;function g(_){let b=_.isScene===!0?_.background:null;return b&&b.isTexture&&(b=(_.backgroundBlurriness>0?t:e).get(b)),b}function x(_){let b=!1;const S=g(_);S===null?h(a,l):S&&S.isColor&&(h(S,1),b=!0);const v=n.xr.getEnvironmentBlendMode();v==="additive"?i.buffers.color.setClear(0,0,0,1,o):v==="alpha-blend"&&i.buffers.color.setClear(0,0,0,0,o),(n.autoClear||b)&&(i.buffers.depth.setTest(!0),i.buffers.depth.setMask(!0),i.buffers.color.setMask(!0),n.clear(n.autoClearColor,n.autoClearDepth,n.autoClearStencil))}function d(_,b){const S=g(b);S&&(S.isCubeTexture||S.mapping===Tc)?(u===void 0&&(u=new Us(new ua(1e4,1e4,1e4),new Ns({name:"BackgroundCubeMaterial",uniforms:fo(rs.backgroundCube.uniforms),vertexShader:rs.backgroundCube.vertexShader,fragmentShader:rs.backgroundCube.fragmentShader,side:gi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),u.geometry.deleteAttribute("normal"),u.geometry.deleteAttribute("uv"),u.onBeforeRender=function(v,E,R){this.matrixWorld.copyPosition(R.matrixWorld)},Object.defineProperty(u.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),s.update(u)),lr.copy(b.backgroundRotation),lr.x*=-1,lr.y*=-1,lr.z*=-1,S.isCubeTexture&&S.isRenderTargetTexture===!1&&(lr.y*=-1,lr.z*=-1),u.material.uniforms.envMap.value=S,u.material.uniforms.flipEnvMap.value=S.isCubeTexture&&S.isRenderTargetTexture===!1?-1:1,u.material.uniforms.backgroundBlurriness.value=b.backgroundBlurriness,u.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,u.material.uniforms.backgroundRotation.value.setFromMatrix4(i_.makeRotationFromEuler(lr)),u.material.toneMapped=tn.getTransfer(S.colorSpace)!==hn,(f!==S||p!==S.version||m!==n.toneMapping)&&(u.material.needsUpdate=!0,f=S,p=S.version,m=n.toneMapping),u.layers.enableAll(),_.unshift(u,u.geometry,u.material,0,0,null)):S&&S.isTexture&&(c===void 0&&(c=new Us(new Rc(2,2),new Ns({name:"BackgroundMaterial",uniforms:fo(rs.background.uniforms),vertexShader:rs.background.vertexShader,fragmentShader:rs.background.fragmentShader,side:nr,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),s.update(c)),c.material.uniforms.t2D.value=S,c.material.uniforms.backgroundIntensity.value=b.backgroundIntensity,c.material.toneMapped=tn.getTransfer(S.colorSpace)!==hn,S.matrixAutoUpdate===!0&&S.updateMatrix(),c.material.uniforms.uvTransform.value.copy(S.matrix),(f!==S||p!==S.version||m!==n.toneMapping)&&(c.material.needsUpdate=!0,f=S,p=S.version,m=n.toneMapping),c.layers.enableAll(),_.unshift(c,c.geometry,c.material,0,0,null))}function h(_,b){_.getRGB(Wa,Gf(n)),i.buffers.color.setClear(Wa.r,Wa.g,Wa.b,b,o)}function M(){u!==void 0&&(u.geometry.dispose(),u.material.dispose(),u=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(_,b=1){a.set(_),l=b,h(a,l)},getClearAlpha:function(){return l},setClearAlpha:function(_){l=_,h(a,l)},render:x,addToRenderList:d,dispose:M}}function r_(n,e){const t=n.getParameter(n.MAX_VERTEX_ATTRIBS),i={},s=p(null);let r=s,o=!1;function a(T,C,I,F,V){let W=!1;const D=f(F,I,C);r!==D&&(r=D,c(r.object)),W=m(T,F,I,V),W&&g(T,F,I,V),V!==null&&e.update(V,n.ELEMENT_ARRAY_BUFFER),(W||o)&&(o=!1,b(T,C,I,F),V!==null&&n.bindBuffer(n.ELEMENT_ARRAY_BUFFER,e.get(V).buffer))}function l(){return n.createVertexArray()}function c(T){return n.bindVertexArray(T)}function u(T){return n.deleteVertexArray(T)}function f(T,C,I){const F=I.wireframe===!0;let V=i[T.id];V===void 0&&(V={},i[T.id]=V);let W=V[C.id];W===void 0&&(W={},V[C.id]=W);let D=W[F];return D===void 0&&(D=p(l()),W[F]=D),D}function p(T){const C=[],I=[],F=[];for(let V=0;V<t;V++)C[V]=0,I[V]=0,F[V]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:C,enabledAttributes:I,attributeDivisors:F,object:T,attributes:{},index:null}}function m(T,C,I,F){const V=r.attributes,W=C.attributes;let D=0;const B=I.getAttributes();for(const G in B)if(B[G].location>=0){const N=V[G];let te=W[G];if(te===void 0&&(G==="instanceMatrix"&&T.instanceMatrix&&(te=T.instanceMatrix),G==="instanceColor"&&T.instanceColor&&(te=T.instanceColor)),N===void 0||N.attribute!==te||te&&N.data!==te.data)return!0;D++}return r.attributesNum!==D||r.index!==F}function g(T,C,I,F){const V={},W=C.attributes;let D=0;const B=I.getAttributes();for(const G in B)if(B[G].location>=0){let N=W[G];N===void 0&&(G==="instanceMatrix"&&T.instanceMatrix&&(N=T.instanceMatrix),G==="instanceColor"&&T.instanceColor&&(N=T.instanceColor));const te={};te.attribute=N,N&&N.data&&(te.data=N.data),V[G]=te,D++}r.attributes=V,r.attributesNum=D,r.index=F}function x(){const T=r.newAttributes;for(let C=0,I=T.length;C<I;C++)T[C]=0}function d(T){h(T,0)}function h(T,C){const I=r.newAttributes,F=r.enabledAttributes,V=r.attributeDivisors;I[T]=1,F[T]===0&&(n.enableVertexAttribArray(T),F[T]=1),V[T]!==C&&(n.vertexAttribDivisor(T,C),V[T]=C)}function M(){const T=r.newAttributes,C=r.enabledAttributes;for(let I=0,F=C.length;I<F;I++)C[I]!==T[I]&&(n.disableVertexAttribArray(I),C[I]=0)}function _(T,C,I,F,V,W,D){D===!0?n.vertexAttribIPointer(T,C,I,V,W):n.vertexAttribPointer(T,C,I,F,V,W)}function b(T,C,I,F){x();const V=F.attributes,W=I.getAttributes(),D=C.defaultAttributeValues;for(const B in W){const G=W[B];if(G.location>=0){let Y=V[B];if(Y===void 0&&(B==="instanceMatrix"&&T.instanceMatrix&&(Y=T.instanceMatrix),B==="instanceColor"&&T.instanceColor&&(Y=T.instanceColor)),Y!==void 0){const N=Y.normalized,te=Y.itemSize,q=e.get(Y);if(q===void 0)continue;const fe=q.buffer,re=q.type,ne=q.bytesPerElement,K=re===n.INT||re===n.UNSIGNED_INT||Y.gpuType===Bh;if(Y.isInterleavedBufferAttribute){const he=Y.data,ae=he.stride,ge=Y.offset;if(he.isInstancedInterleavedBuffer){for(let H=0;H<G.locationSize;H++)h(G.location+H,he.meshPerAttribute);T.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=he.meshPerAttribute*he.count)}else for(let H=0;H<G.locationSize;H++)d(G.location+H);n.bindBuffer(n.ARRAY_BUFFER,fe);for(let H=0;H<G.locationSize;H++)_(G.location+H,te/G.locationSize,re,N,ae*ne,(ge+te/G.locationSize*H)*ne,K)}else{if(Y.isInstancedBufferAttribute){for(let he=0;he<G.locationSize;he++)h(G.location+he,Y.meshPerAttribute);T.isInstancedMesh!==!0&&F._maxInstanceCount===void 0&&(F._maxInstanceCount=Y.meshPerAttribute*Y.count)}else for(let he=0;he<G.locationSize;he++)d(G.location+he);n.bindBuffer(n.ARRAY_BUFFER,fe);for(let he=0;he<G.locationSize;he++)_(G.location+he,te/G.locationSize,re,N,te*ne,te/G.locationSize*he*ne,K)}}else if(D!==void 0){const N=D[B];if(N!==void 0)switch(N.length){case 2:n.vertexAttrib2fv(G.location,N);break;case 3:n.vertexAttrib3fv(G.location,N);break;case 4:n.vertexAttrib4fv(G.location,N);break;default:n.vertexAttrib1fv(G.location,N)}}}}M()}function S(){R();for(const T in i){const C=i[T];for(const I in C){const F=C[I];for(const V in F)u(F[V].object),delete F[V];delete C[I]}delete i[T]}}function v(T){if(i[T.id]===void 0)return;const C=i[T.id];for(const I in C){const F=C[I];for(const V in F)u(F[V].object),delete F[V];delete C[I]}delete i[T.id]}function E(T){for(const C in i){const I=i[C];if(I[T.id]===void 0)continue;const F=I[T.id];for(const V in F)u(F[V].object),delete F[V];delete I[T.id]}}function R(){w(),o=!0,r!==s&&(r=s,c(r.object))}function w(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:R,resetDefaultState:w,dispose:S,releaseStatesOfGeometry:v,releaseStatesOfProgram:E,initAttributes:x,enableAttribute:d,disableUnusedAttributes:M}}function o_(n,e,t){let i;function s(c){i=c}function r(c,u){n.drawArrays(i,c,u),t.update(u,i,1)}function o(c,u,f){f!==0&&(n.drawArraysInstanced(i,c,u,f),t.update(u,i,f))}function a(c,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,c,0,u,0,f);let m=0;for(let g=0;g<f;g++)m+=u[g];t.update(m,i,1)}function l(c,u,f,p){if(f===0)return;const m=e.get("WEBGL_multi_draw");if(m===null)for(let g=0;g<c.length;g++)o(c[g],u[g],p[g]);else{m.multiDrawArraysInstancedWEBGL(i,c,0,u,0,p,0,f);let g=0;for(let x=0;x<f;x++)g+=u[x]*p[x];t.update(g,i,1)}}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a,this.renderMultiDrawInstances=l}function a_(n,e,t,i){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){const E=e.get("EXT_texture_filter_anisotropic");s=n.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(E){return!(E!==zi&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){const R=E===_o&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==ls&&i.convert(E)!==n.getParameter(n.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==ji&&!R)}function l(E){if(E==="highp"){if(n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.HIGH_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&n.getShaderPrecisionFormat(n.VERTEX_SHADER,n.MEDIUM_FLOAT).precision>0&&n.getShaderPrecisionFormat(n.FRAGMENT_SHADER,n.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp";const u=l(c);u!==c&&(Mt("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);const f=t.logarithmicDepthBuffer===!0,p=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control"),m=n.getParameter(n.MAX_TEXTURE_IMAGE_UNITS),g=n.getParameter(n.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=n.getParameter(n.MAX_TEXTURE_SIZE),d=n.getParameter(n.MAX_CUBE_MAP_TEXTURE_SIZE),h=n.getParameter(n.MAX_VERTEX_ATTRIBS),M=n.getParameter(n.MAX_VERTEX_UNIFORM_VECTORS),_=n.getParameter(n.MAX_VARYING_VECTORS),b=n.getParameter(n.MAX_FRAGMENT_UNIFORM_VECTORS),S=g>0,v=n.getParameter(n.MAX_SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:p,maxTextures:m,maxVertexTextures:g,maxTextureSize:x,maxCubemapSize:d,maxAttributes:h,maxVertexUniforms:M,maxVaryings:_,maxFragmentUniforms:b,vertexTextures:S,maxSamples:v}}function c_(n){const e=this;let t=null,i=0,s=!1,r=!1;const o=new Ks,a=new Nt,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,p){const m=f.length!==0||p||i!==0||s;return s=p,i=f.length,m},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,p){t=u(f,p,0)},this.setState=function(f,p,m){const g=f.clippingPlanes,x=f.clipIntersection,d=f.clipShadows,h=n.get(f);if(!s||g===null||g.length===0||r&&!d)r?u(null):c();else{const M=r?0:i,_=M*4;let b=h.clippingState||null;l.value=b,b=u(g,p,_,m);for(let S=0;S!==_;++S)b[S]=t[S];h.clippingState=b,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=M}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=i>0),e.numPlanes=i,e.numIntersection=0}function u(f,p,m,g){const x=f!==null?f.length:0;let d=null;if(x!==0){if(d=l.value,g!==!0||d===null){const h=m+x*4,M=p.matrixWorldInverse;a.getNormalMatrix(M),(d===null||d.length<h)&&(d=new Float32Array(h));for(let _=0,b=m;_!==x;++_,b+=4)o.copy(f[_]).applyMatrix4(M,a),o.normal.toArray(d,b),d[b+3]=o.constant}l.value=d,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,d}}function l_(n){let e=new WeakMap;function t(o,a){return a===Yl?o.mapping=co:a===jl&&(o.mapping=lo),o}function i(o){if(o&&o.isTexture){const a=o.mapping;if(a===Yl||a===jl)if(e.has(o)){const l=e.get(o).texture;return t(l,o.mapping)}else{const l=o.image;if(l&&l.height>0){const c=new sg(l.height);return c.fromEquirectangularTexture(n,o),e.set(o,c),o.addEventListener("dispose",s),t(c.texture,o.mapping)}else return null}}return o}function s(o){const a=o.target;a.removeEventListener("dispose",s);const l=e.get(a);l!==void 0&&(e.delete(a),l.dispose())}function r(){e=new WeakMap}return{get:i,dispose:r}}const er=4,cd=[.125,.215,.35,.446,.526,.582],pr=20,h_=256,Do=new Zf,ld=new Et;let gl=null,xl=0,_l=0,bl=!1;const u_=new ue;class hd{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,i=.1,s=100,r={}){const{size:o=256,position:a=u_}=r;gl=this._renderer.getRenderTarget(),xl=this._renderer.getActiveCubeFace(),_l=this._renderer.getActiveMipmapLevel(),bl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);const l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,i,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=fd(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=dd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(gl,xl,_l),this._renderer.xr.enabled=bl,e.scissorTest=!1,Br(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===co||e.mapping===lo?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),gl=this._renderer.getRenderTarget(),xl=this._renderer.getActiveCubeFace(),_l=this._renderer.getActiveMipmapLevel(),bl=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(e,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:ki,minFilter:ki,generateMipmaps:!1,type:_o,format:zi,colorSpace:uo,depthBuffer:!1},s=ud(e,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ud(e,t,i);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=d_(r)),this._blurMaterial=p_(r,e,t)}return s}_compileMaterial(e){const t=new Us(new Vi,e);this._renderer.compile(t,Do)}_sceneToCubeUV(e,t,i,s,r){const l=new Yi(90,1,t,i),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,p=f.autoClear,m=f.toneMapping;f.getClearColor(ld),f.toneMapping=tr,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Us(new ua,new Bf({name:"PMREM.Background",side:gi,depthWrite:!1,depthTest:!1})));const x=this._backgroundBox,d=x.material;let h=!1;const M=e.background;M?M.isColor&&(d.color.copy(M),e.background=null,h=!0):(d.color.copy(ld),h=!0);for(let _=0;_<6;_++){const b=_%3;b===0?(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[_],r.y,r.z)):b===1?(l.up.set(0,0,c[_]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[_],r.z)):(l.up.set(0,c[_],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[_]));const S=this._cubeSize;Br(s,b*S,_>2?S:0,S,S),f.setRenderTarget(s),h&&f.render(x,l),f.render(e,l)}f.toneMapping=m,f.autoClear=p,e.background=M}_textureToCubeUV(e,t){const i=this._renderer,s=e.mapping===co||e.mapping===lo;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=fd()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=dd());const r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;const a=r.uniforms;a.envMap.value=e;const l=this._cubeSize;Br(t,0,0,3*l,2*l),i.setRenderTarget(t),i.render(o,Do)}_applyPMREM(e){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=i}_applyGGXFilter(e,t,i){const s=this._renderer,r=this._pingPongRenderTarget;if(this._ggxMaterial===null){const M=3*Math.max(this._cubeSize,16),_=4*this._cubeSize;this._ggxMaterial=f_(this._lodMax,M,_)}const o=this._ggxMaterial,a=this._lodMeshes[i];a.material=o;const l=o.uniforms,c=i/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),f=Math.sqrt(c*c-u*u),p=.05+c*.95,m=f*p,{_lodMax:g}=this,x=this._sizeLods[i],d=3*x*(i>g-er?i-g+er:0),h=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=m,l.mipInt.value=g-t,Br(r,d,h,3*x,2*x),s.setRenderTarget(r),s.render(a,Do),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=g-i,Br(e,d,h,3*x,2*x),s.setRenderTarget(e),s.render(a,Do)}_blur(e,t,i,s,r){const o=this._pingPongRenderTarget;this._halfBlur(e,o,t,i,s,"latitudinal",r),this._halfBlur(o,e,i,i,s,"longitudinal",r)}_halfBlur(e,t,i,s,r,o,a){const l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Rn("blur direction must be either latitudinal or longitudinal!");const u=3,f=this._lodMeshes[s];f.material=c;const p=c.uniforms,m=this._sizeLods[i]-1,g=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*pr-1),x=r/g,d=isFinite(r)?1+Math.floor(u*x):pr;d>pr&&Mt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${d} samples when the maximum is set to ${pr}`);const h=[];let M=0;for(let E=0;E<pr;++E){const R=E/x,w=Math.exp(-R*R/2);h.push(w),E===0?M+=w:E<d&&(M+=2*w)}for(let E=0;E<h.length;E++)h[E]=h[E]/M;p.envMap.value=e.texture,p.samples.value=d,p.weights.value=h,p.latitudinal.value=o==="latitudinal",a&&(p.poleAxis.value=a);const{_lodMax:_}=this;p.dTheta.value=g,p.mipInt.value=_-i;const b=this._sizeLods[s],S=3*b*(s>_-er?s-_+er:0),v=4*(this._cubeSize-b);Br(t,S,v,3*b,2*b),l.setRenderTarget(t),l.render(f,Do)}}function d_(n){const e=[],t=[],i=[];let s=n;const r=n-er+1+cd.length;for(let o=0;o<r;o++){const a=Math.pow(2,s);e.push(a);let l=1/a;o>n-er?l=cd[o-n+er-1]:o===0&&(l=0),t.push(l);const c=1/(a-2),u=-c,f=1+c,p=[u,u,f,u,f,f,u,u,f,f,u,f],m=6,g=6,x=3,d=2,h=1,M=new Float32Array(x*g*m),_=new Float32Array(d*g*m),b=new Float32Array(h*g*m);for(let v=0;v<m;v++){const E=v%3*2/3-1,R=v>2?0:-1,w=[E,R,0,E+2/3,R,0,E+2/3,R+1,0,E,R,0,E+2/3,R+1,0,E,R+1,0];M.set(w,x*g*v),_.set(p,d*g*v);const T=[v,v,v,v,v,v];b.set(T,h*g*v)}const S=new Vi;S.setAttribute("position",new Bi(M,x)),S.setAttribute("uv",new Bi(_,d)),S.setAttribute("faceIndex",new Bi(b,h)),i.push(new Us(S,null)),s>er&&s--}return{lodMeshes:i,sizeLods:e,sigmas:t}}function ud(n,e,t){const i=new ir(n,e,t);return i.texture.mapping=Tc,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Br(n,e,t,i,s){n.viewport.set(e,t,i,s),n.scissor.set(e,t,i,s)}function f_(n,e,t){return new Ns({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:h_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Cc(),fragmentShader:`

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
		`,blending:Cs,depthTest:!1,depthWrite:!1})}function p_(n,e,t){const i=new Float32Array(pr),s=new ue(0,1,0);return new Ns({name:"SphericalGaussianBlur",defines:{n:pr,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${n}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Cc(),fragmentShader:`

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
		`,blending:Cs,depthTest:!1,depthWrite:!1})}function dd(){return new Ns({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Cc(),fragmentShader:`

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
		`,blending:Cs,depthTest:!1,depthWrite:!1})}function fd(){return new Ns({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Cc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Cs,depthTest:!1,depthWrite:!1})}function Cc(){return`

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
	`}function m_(n){let e=new WeakMap,t=null;function i(a){if(a&&a.isTexture){const l=a.mapping,c=l===Yl||l===jl,u=l===co||l===lo;if(c||u){let f=e.get(a);const p=f!==void 0?f.texture.pmremVersion:0;if(a.isRenderTargetTexture&&a.pmremVersion!==p)return t===null&&(t=new hd(n)),f=c?t.fromEquirectangular(a,f):t.fromCubemap(a,f),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),f.texture;if(f!==void 0)return f.texture;{const m=a.image;return c&&m&&m.height>0||u&&m&&s(m)?(t===null&&(t=new hd(n)),f=c?t.fromEquirectangular(a):t.fromCubemap(a),f.texture.pmremVersion=a.pmremVersion,e.set(a,f),a.addEventListener("dispose",r),f.texture):null}}}return a}function s(a){let l=0;const c=6;for(let u=0;u<c;u++)a[u]!==void 0&&l++;return l===c}function r(a){const l=a.target;l.removeEventListener("dispose",r);const c=e.get(l);c!==void 0&&(e.delete(l),c.dispose())}function o(){e=new WeakMap,t!==null&&(t.dispose(),t=null)}return{get:i,dispose:o}}function g_(n){const e={};function t(i){if(e[i]!==void 0)return e[i];const s=n.getExtension(i);return e[i]=s,s}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const s=t(i);return s===null&&ia("WebGLRenderer: "+i+" extension not supported."),s}}}function x_(n,e,t,i){const s={},r=new WeakMap;function o(f){const p=f.target;p.index!==null&&e.remove(p.index);for(const g in p.attributes)e.remove(p.attributes[g]);p.removeEventListener("dispose",o),delete s[p.id];const m=r.get(p);m&&(e.remove(m),r.delete(p)),i.releaseStatesOfGeometry(p),p.isInstancedBufferGeometry===!0&&delete p._maxInstanceCount,t.memory.geometries--}function a(f,p){return s[p.id]===!0||(p.addEventListener("dispose",o),s[p.id]=!0,t.memory.geometries++),p}function l(f){const p=f.attributes;for(const m in p)e.update(p[m],n.ARRAY_BUFFER)}function c(f){const p=[],m=f.index,g=f.attributes.position;let x=0;if(m!==null){const M=m.array;x=m.version;for(let _=0,b=M.length;_<b;_+=3){const S=M[_+0],v=M[_+1],E=M[_+2];p.push(S,v,v,E,E,S)}}else if(g!==void 0){const M=g.array;x=g.version;for(let _=0,b=M.length/3-1;_<b;_+=3){const S=_+0,v=_+1,E=_+2;p.push(S,v,v,E,E,S)}}else return;const d=new(Nf(p)?Hf:Vf)(p,1);d.version=x;const h=r.get(f);h&&e.remove(h),r.set(f,d)}function u(f){const p=r.get(f);if(p){const m=f.index;m!==null&&p.version<m.version&&c(f)}else c(f);return r.get(f)}return{get:a,update:l,getWireframeAttribute:u}}function __(n,e,t){let i;function s(p){i=p}let r,o;function a(p){r=p.type,o=p.bytesPerElement}function l(p,m){n.drawElements(i,m,r,p*o),t.update(m,i,1)}function c(p,m,g){g!==0&&(n.drawElementsInstanced(i,m,r,p*o,g),t.update(m,i,g))}function u(p,m,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,m,0,r,p,0,g);let d=0;for(let h=0;h<g;h++)d+=m[h];t.update(d,i,1)}function f(p,m,g,x){if(g===0)return;const d=e.get("WEBGL_multi_draw");if(d===null)for(let h=0;h<p.length;h++)c(p[h]/o,m[h],x[h]);else{d.multiDrawElementsInstancedWEBGL(i,m,0,r,p,0,x,0,g);let h=0;for(let M=0;M<g;M++)h+=m[M]*x[M];t.update(h,i,1)}}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u,this.renderMultiDrawInstances=f}function b_(n){const e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,o,a){switch(t.calls++,o){case n.TRIANGLES:t.triangles+=a*(r/3);break;case n.LINES:t.lines+=a*(r/2);break;case n.LINE_STRIP:t.lines+=a*(r-1);break;case n.LINE_LOOP:t.lines+=a*r;break;case n.POINTS:t.points+=a*r;break;default:Rn("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:i}}function M_(n,e,t){const i=new WeakMap,s=new Mn;function r(o,a,l){const c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=u!==void 0?u.length:0;let p=i.get(a);if(p===void 0||p.count!==f){let w=function(){E.dispose(),i.delete(a),a.removeEventListener("dispose",w)};p!==void 0&&p.texture.dispose();const m=a.morphAttributes.position!==void 0,g=a.morphAttributes.normal!==void 0,x=a.morphAttributes.color!==void 0,d=a.morphAttributes.position||[],h=a.morphAttributes.normal||[],M=a.morphAttributes.color||[];let _=0;m===!0&&(_=1),g===!0&&(_=2),x===!0&&(_=3);let b=a.attributes.position.count*_,S=1;b>e.maxTextureSize&&(S=Math.ceil(b/e.maxTextureSize),b=e.maxTextureSize);const v=new Float32Array(b*S*4*f),E=new Ff(v,b,S,f);E.type=ji,E.needsUpdate=!0;const R=_*4;for(let T=0;T<f;T++){const C=d[T],I=h[T],F=M[T],V=b*S*4*T;for(let W=0;W<C.count;W++){const D=W*R;m===!0&&(s.fromBufferAttribute(C,W),v[V+D+0]=s.x,v[V+D+1]=s.y,v[V+D+2]=s.z,v[V+D+3]=0),g===!0&&(s.fromBufferAttribute(I,W),v[V+D+4]=s.x,v[V+D+5]=s.y,v[V+D+6]=s.z,v[V+D+7]=0),x===!0&&(s.fromBufferAttribute(F,W),v[V+D+8]=s.x,v[V+D+9]=s.y,v[V+D+10]=s.z,v[V+D+11]=F.itemSize===4?s.w:1)}}p={count:f,texture:E,size:new Ot(b,S)},i.set(a,p),a.addEventListener("dispose",w)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(n,"morphTexture",o.morphTexture,t);else{let m=0;for(let x=0;x<c.length;x++)m+=c[x];const g=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(n,"morphTargetBaseInfluence",g),l.getUniforms().setValue(n,"morphTargetInfluences",c)}l.getUniforms().setValue(n,"morphTargetsTexture",p.texture,t),l.getUniforms().setValue(n,"morphTargetsTextureSize",p.size)}return{update:r}}class v_{constructor(e,t,i){if(this.renderer=e,this.DEFAULT_NUMVIEWS=2,this.maxNumViews=0,this.gl=i,this.extensions=t,this.available=this.extensions.has("OCULUS_multiview"),this.available){const r=this.extensions.get("OCULUS_multiview");this.maxNumViews=this.gl.getParameter(r.MAX_VIEWS_OVR),this.mat4=[],this.mat3=[],this.cameraArray=[];for(var s=0;s<this.maxNumViews;s++)this.mat4[s]=new Ht,this.mat3[s]=new Nt}}getCameraArray(e){return e.isArrayCamera?e.cameras:(this.cameraArray[0]=e,this.cameraArray)}updateCameraProjectionMatricesUniform(e,t){for(var i=this.getCameraArray(e),s=0;s<i.length;s++)this.mat4[s].copy(i[s].projectionMatrix);t.setValue(this.gl,"projectionMatrices",this.mat4)}updateCameraViewMatricesUniform(e,t){for(var i=this.getCameraArray(e),s=0;s<i.length;s++)this.mat4[s].copy(i[s].matrixWorldInverse);t.setValue(this.gl,"viewMatrices",this.mat4)}updateObjectMatricesUniforms(e,t,i){for(var s=this.getCameraArray(t),r=0;r<s.length;r++)this.mat4[r].multiplyMatrices(s[r].matrixWorldInverse,e.matrixWorld),this.mat3[r].getNormalMatrix(this.mat4[r]);i.setValue(this.gl,"modelViewMatrices",this.mat4),i.setValue(this.gl,"normalMatrices",this.mat3)}}function y_(n,e,t,i){let s=new WeakMap;function r(l){const c=i.render.frame,u=l.geometry,f=e.get(l,u);if(s.get(f)!==c&&(e.update(f),s.set(f,c)),l.isInstancedMesh&&(l.hasEventListener("dispose",a)===!1&&l.addEventListener("dispose",a),s.get(l)!==c&&(t.update(l.instanceMatrix,n.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,n.ARRAY_BUFFER),s.set(l,c))),l.isSkinnedMesh){const p=l.skeleton;s.get(p)!==c&&(p.update(),s.set(p,c))}return f}function o(){s=new WeakMap}function a(l){const c=l.target;c.removeEventListener("dispose",a),t.remove(c.instanceMatrix),c.instanceColor!==null&&t.remove(c.instanceColor)}return{update:r,dispose:o}}const e0=new ai,pd=new $f(1,1),t0=new Ff,n0=new Vm,i0=new Xf,md=[],gd=[],xd=new Float32Array(16),_d=new Float32Array(9),bd=new Float32Array(4);function vo(n,e,t){const i=n[0];if(i<=0||i>0)return n;const s=e*t;let r=md[s];if(r===void 0&&(r=new Float32Array(s),md[s]=r),e!==0){i.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,n[o].toArray(r,a)}return r}function zn(n,e){if(n.length!==e.length)return!1;for(let t=0,i=n.length;t<i;t++)if(n[t]!==e[t])return!1;return!0}function Bn(n,e){for(let t=0,i=e.length;t<i;t++)n[t]=e[t]}function Lc(n,e){let t=gd[e];t===void 0&&(t=new Int32Array(e),gd[e]=t);for(let i=0;i!==e;++i)t[i]=n.allocateTextureUnit();return t}function S_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1f(this.addr,e),t[0]=e)}function E_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(zn(t,e))return;n.uniform2fv(this.addr,e),Bn(t,e)}}function w_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(n.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(zn(t,e))return;n.uniform3fv(this.addr,e),Bn(t,e)}}function T_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(zn(t,e))return;n.uniform4fv(this.addr,e),Bn(t,e)}}function A_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(zn(t,e))return;n.uniformMatrix2fv(this.addr,!1,e),Bn(t,e)}else{if(zn(t,i))return;bd.set(i),n.uniformMatrix2fv(this.addr,!1,bd),Bn(t,i)}}function R_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(zn(t,e))return;n.uniformMatrix3fv(this.addr,!1,e),Bn(t,e)}else{if(zn(t,i))return;_d.set(i),n.uniformMatrix3fv(this.addr,!1,_d),Bn(t,i)}}function C_(n,e){const t=this.cache,i=e.elements;if(i===void 0){if(zn(t,e))return;n.uniformMatrix4fv(this.addr,!1,e),Bn(t,e)}else{if(zn(t,i))return;xd.set(i),n.uniformMatrix4fv(this.addr,!1,xd),Bn(t,i)}}function L_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1i(this.addr,e),t[0]=e)}function P_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(zn(t,e))return;n.uniform2iv(this.addr,e),Bn(t,e)}}function D_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(zn(t,e))return;n.uniform3iv(this.addr,e),Bn(t,e)}}function I_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(zn(t,e))return;n.uniform4iv(this.addr,e),Bn(t,e)}}function U_(n,e){const t=this.cache;t[0]!==e&&(n.uniform1ui(this.addr,e),t[0]=e)}function N_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(n.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(zn(t,e))return;n.uniform2uiv(this.addr,e),Bn(t,e)}}function O_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(n.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(zn(t,e))return;n.uniform3uiv(this.addr,e),Bn(t,e)}}function F_(n,e){const t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(n.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(zn(t,e))return;n.uniform4uiv(this.addr,e),Bn(t,e)}}function k_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s);let r;this.type===n.SAMPLER_2D_SHADOW?(pd.compareFunction=Uf,r=pd):r=e0,t.setTexture2D(e||r,s)}function z_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture3D(e||n0,s)}function B_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTextureCube(e||i0,s)}function V_(n,e,t){const i=this.cache,s=t.allocateTextureUnit();i[0]!==s&&(n.uniform1i(this.addr,s),i[0]=s),t.setTexture2DArray(e||t0,s)}function H_(n){switch(n){case 5126:return S_;case 35664:return E_;case 35665:return w_;case 35666:return T_;case 35674:return A_;case 35675:return R_;case 35676:return C_;case 5124:case 35670:return L_;case 35667:case 35671:return P_;case 35668:case 35672:return D_;case 35669:case 35673:return I_;case 5125:return U_;case 36294:return N_;case 36295:return O_;case 36296:return F_;case 35678:case 36198:case 36298:case 36306:case 35682:return k_;case 35679:case 36299:case 36307:return z_;case 35680:case 36300:case 36308:case 36293:return B_;case 36289:case 36303:case 36311:case 36292:return V_}}function G_(n,e){n.uniform1fv(this.addr,e)}function W_(n,e){const t=vo(e,this.size,2);n.uniform2fv(this.addr,t)}function X_(n,e){const t=vo(e,this.size,3);n.uniform3fv(this.addr,t)}function q_(n,e){const t=vo(e,this.size,4);n.uniform4fv(this.addr,t)}function Y_(n,e){const t=vo(e,this.size,4);n.uniformMatrix2fv(this.addr,!1,t)}function j_(n,e){const t=vo(e,this.size,9);n.uniformMatrix3fv(this.addr,!1,t)}function $_(n,e){const t=vo(e,this.size,16);n.uniformMatrix4fv(this.addr,!1,t)}function K_(n,e){n.uniform1iv(this.addr,e)}function Z_(n,e){n.uniform2iv(this.addr,e)}function Q_(n,e){n.uniform3iv(this.addr,e)}function J_(n,e){n.uniform4iv(this.addr,e)}function eb(n,e){n.uniform1uiv(this.addr,e)}function tb(n,e){n.uniform2uiv(this.addr,e)}function nb(n,e){n.uniform3uiv(this.addr,e)}function ib(n,e){n.uniform4uiv(this.addr,e)}function sb(n,e,t){const i=this.cache,s=e.length,r=Lc(t,s);zn(i,r)||(n.uniform1iv(this.addr,r),Bn(i,r));for(let o=0;o!==s;++o)t.setTexture2D(e[o]||e0,r[o])}function rb(n,e,t){const i=this.cache,s=e.length,r=Lc(t,s);zn(i,r)||(n.uniform1iv(this.addr,r),Bn(i,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||n0,r[o])}function ob(n,e,t){const i=this.cache,s=e.length,r=Lc(t,s);zn(i,r)||(n.uniform1iv(this.addr,r),Bn(i,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||i0,r[o])}function ab(n,e,t){const i=this.cache,s=e.length,r=Lc(t,s);zn(i,r)||(n.uniform1iv(this.addr,r),Bn(i,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||t0,r[o])}function cb(n){switch(n){case 5126:return G_;case 35664:return W_;case 35665:return X_;case 35666:return q_;case 35674:return Y_;case 35675:return j_;case 35676:return $_;case 5124:case 35670:return K_;case 35667:case 35671:return Z_;case 35668:case 35672:return Q_;case 35669:case 35673:return J_;case 5125:return eb;case 36294:return tb;case 36295:return nb;case 36296:return ib;case 35678:case 36198:case 36298:case 36306:case 35682:return sb;case 35679:case 36299:case 36307:return rb;case 35680:case 36300:case 36308:case 36293:return ob;case 36289:case 36303:case 36311:case 36292:return ab}}class lb{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.setValue=H_(t.type)}}class hb{constructor(e,t,i){this.id=e,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=cb(t.type)}}class ub{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,i){const s=this.seq;for(let r=0,o=s.length;r!==o;++r){const a=s[r];a.setValue(e,t[a.id],i)}}}const Ml=/(\w+)(\])?(\[|\.)?/g;function Md(n,e){n.seq.push(e),n.map[e.id]=e}function db(n,e,t){const i=n.name,s=i.length;for(Ml.lastIndex=0;;){const r=Ml.exec(i),o=Ml.lastIndex;let a=r[1];const l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Md(t,c===void 0?new lb(a,n,e):new hb(a,n,e));break}else{let f=t.map[a];f===void 0&&(f=new ub(a),Md(t,f)),t=f}}}class lc{constructor(e,t){this.seq=[],this.map={};const i=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let s=0;s<i;++s){const r=e.getActiveUniform(t,s),o=e.getUniformLocation(t,r.name);db(r,o,this)}}setValue(e,t,i,s){const r=this.map[t];r!==void 0&&r.setValue(e,i,s)}setOptional(e,t,i){const s=t[i];s!==void 0&&this.setValue(e,i,s)}static upload(e,t,i,s){for(let r=0,o=t.length;r!==o;++r){const a=t[r],l=i[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){const i=[];for(let s=0,r=e.length;s!==r;++s){const o=e[s];o.id in t&&i.push(o)}return i}}function vd(n,e,t){const i=n.createShader(e);return n.shaderSource(i,t),n.compileShader(i),i}const fb=37297;let pb=0;function mb(n,e){const t=n.split(`
`),i=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){const a=o+1;i.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return i.join(`
`)}const yd=new Nt;function gb(n){tn._getMatrix(yd,tn.workingColorSpace,n);const e=`mat3( ${yd.elements.map(t=>t.toFixed(4))} )`;switch(tn.getTransfer(n)){case pc:return[e,"LinearTransferOETF"];case hn:return[e,"sRGBTransferOETF"];default:return Mt("WebGLProgram: Unsupported color space: ",n),[e,"LinearTransferOETF"]}}function Sd(n,e,t){const i=n.getShaderParameter(e,n.COMPILE_STATUS),r=(n.getShaderInfoLog(e)||"").trim();if(i&&r==="")return"";const o=/ERROR: 0:(\d+)/.exec(r);if(o){const a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+mb(n.getShaderSource(e),a)}else return r}function xb(n,e){const t=gb(e);return[`vec4 ${n}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}function _b(n,e){let t;switch(e){case Jp:t="Linear";break;case em:t="Reinhard";break;case tm:t="Cineon";break;case nm:t="ACESFilmic";break;case sm:t="AgX";break;case rm:t="Neutral";break;case im:t="Custom";break;default:Mt("WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+n+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const Xa=new ue;function bb(){tn.getLuminanceCoefficients(Xa);const n=Xa.x.toFixed(4),e=Xa.y.toFixed(4),t=Xa.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${n}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Mb(n){return[n.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",n.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Go).join(`
`)}function vb(n){const e=[];for(const t in n){const i=n[t];i!==!1&&e.push("#define "+t+" "+i)}return e.join(`
`)}function yb(n,e){const t={},i=n.getProgramParameter(e,n.ACTIVE_ATTRIBUTES);for(let s=0;s<i;s++){const r=n.getActiveAttrib(e,s),o=r.name;let a=1;r.type===n.FLOAT_MAT2&&(a=2),r.type===n.FLOAT_MAT3&&(a=3),r.type===n.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:n.getAttribLocation(e,o),locationSize:a}}return t}function Go(n){return n!==""}function Ed(n,e){const t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return n.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function wd(n,e){return n.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}const Sb=/^[ \t]*#include +<([\w\d./]+)>/gm;function wh(n){return n.replace(Sb,wb)}const Eb=new Map;function wb(n,e){let t=kt[e];if(t===void 0){const i=Eb.get(e);if(i!==void 0)t=kt[i],Mt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,i);else throw new Error("Can not resolve #include <"+e+">")}return wh(t)}const Tb=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Td(n){return n.replace(Tb,Ab)}function Ab(n,e,t,i){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function Ad(n){let e=`precision ${n.precision} float;
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
	`;return n.precision==="highp"?e+=`
#define HIGH_PRECISION`:n.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:n.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Rb(n){let e="SHADOWMAP_TYPE_BASIC";return n.shadowMapType===Sf?e="SHADOWMAP_TYPE_PCF":n.shadowMapType===Dp?e="SHADOWMAP_TYPE_PCF_SOFT":n.shadowMapType===Ss&&(e="SHADOWMAP_TYPE_VSM"),e}function Cb(n){let e="ENVMAP_TYPE_CUBE";if(n.envMap)switch(n.envMapMode){case co:case lo:e="ENVMAP_TYPE_CUBE";break;case Tc:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Lb(n){let e="ENVMAP_MODE_REFLECTION";return n.envMap&&n.envMapMode===lo&&(e="ENVMAP_MODE_REFRACTION"),e}function Pb(n){let e="ENVMAP_BLENDING_NONE";if(n.envMap)switch(n.combine){case Ef:e="ENVMAP_BLENDING_MULTIPLY";break;case Zp:e="ENVMAP_BLENDING_MIX";break;case Qp:e="ENVMAP_BLENDING_ADD";break}return e}function Db(n){const e=n.envMapCubeUVHeight;if(e===null)return null;const t=Math.log2(e)-2,i=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function Ib(n,e,t,i){const s=n.getContext(),r=t.defines;let o=t.vertexShader,a=t.fragmentShader;const l=Rb(t),c=Cb(t),u=Lb(t),f=Pb(t),p=Db(t),m=Mb(t),g=vb(r),x=s.createProgram();let d,h,M=t.glslVersion?"#version "+t.glslVersion+`
`:"";const _=t.numMultiviewViews;t.isRawShaderMaterial?(d=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Go).join(`
`),d.length>0&&(d+=`
`),h=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g].filter(Go).join(`
`),h.length>0&&(h+=`
`)):(d=[Ad(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Go).join(`
`),h=[Ad(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,g,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",p?"#define CUBEUV_TEXEL_WIDTH "+p.texelWidth:"",p?"#define CUBEUV_TEXEL_HEIGHT "+p.texelHeight:"",p?"#define CUBEUV_MAX_MIP "+p.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor||t.batchingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==tr?"#define TONE_MAPPING":"",t.toneMapping!==tr?kt.tonemapping_pars_fragment:"",t.toneMapping!==tr?_b("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",kt.colorspace_pars_fragment,xb("linearToOutputTexel",t.outputColorSpace),bb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Go).join(`
`)),o=wh(o),o=Ed(o,t),o=wd(o,t),a=wh(a),a=Ed(a,t),a=wd(a,t),o=Td(o),a=Td(a),t.isRawShaderMaterial!==!0&&(M=`#version 300 es
`,d=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+d,h=["#define varying in",t.glslVersion===Ru?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Ru?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+h,_>0&&(d=["#extension GL_OVR_multiview : require","layout(num_views = "+_+") in;","#define VIEW_ID gl_ViewID_OVR"].join(`
`)+`
`+d,d=d.replace(["uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;"].join(`
`),["uniform mat4 modelViewMatrices["+_+"];","uniform mat4 projectionMatrices["+_+"];","uniform mat4 viewMatrices["+_+"];","uniform mat3 normalMatrices["+_+"];","#define modelViewMatrix modelViewMatrices[VIEW_ID]","#define projectionMatrix projectionMatrices[VIEW_ID]","#define viewMatrix viewMatrices[VIEW_ID]","#define normalMatrix normalMatrices[VIEW_ID]"].join(`
`)),h=["#extension GL_OVR_multiview : require","#define VIEW_ID gl_ViewID_OVR"].join(`
`)+`
`+h,h=h.replace("uniform mat4 viewMatrix;",["uniform mat4 viewMatrices["+_+"];","#define viewMatrix viewMatrices[VIEW_ID]"].join(`
`))));const b=M+d+o,S=M+h+a,v=vd(s,s.VERTEX_SHADER,b),E=vd(s,s.FRAGMENT_SHADER,S);s.attachShader(x,v),s.attachShader(x,E),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.morphTargets===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function R(I){if(n.debug.checkShaderErrors){const F=s.getProgramInfoLog(x)||"",V=s.getShaderInfoLog(v)||"",W=s.getShaderInfoLog(E)||"",D=F.trim(),B=V.trim(),G=W.trim();let Y=!0,N=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if(Y=!1,typeof n.debug.onShaderError=="function")n.debug.onShaderError(s,x,v,E);else{const te=Sd(s,v,"vertex"),q=Sd(s,E,"fragment");Rn("THREE.WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+D+`
`+te+`
`+q)}else D!==""?Mt("WebGLProgram: Program Info Log:",D):(B===""||G==="")&&(N=!1);N&&(I.diagnostics={runnable:Y,programLog:D,vertexShader:{log:B,prefix:d},fragmentShader:{log:G,prefix:h}})}s.deleteShader(v),s.deleteShader(E),w=new lc(s,x),T=yb(s,x)}let w;this.getUniforms=function(){return w===void 0&&R(this),w};let T;this.getAttributes=function(){return T===void 0&&R(this),T};let C=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(x,fb)),C},this.destroy=function(){i.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=pb++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=v,this.fragmentShader=E,this.numMultiviewViews=_,this}let Ub=0;class Nb{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e){const t=e.vertexShader,i=e.fragmentShader,s=this._getShaderStage(t),r=this._getShaderStage(i),o=this._getShaderCacheForMaterial(e);return o.has(s)===!1&&(o.add(s),s.usedTimes++),o.has(r)===!1&&(o.add(r),r.usedTimes++),this}remove(e){const t=this.materialCache.get(e);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(e),this}getVertexShaderID(e){return this._getShaderStage(e.vertexShader).id}getFragmentShaderID(e){return this._getShaderStage(e.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){const t=this.materialCache;let i=t.get(e);return i===void 0&&(i=new Set,t.set(e,i)),i}_getShaderStage(e){const t=this.shaderCache;let i=t.get(e);return i===void 0&&(i=new Ob(e),t.set(e,i)),i}}class Ob{constructor(e){this.id=Ub++,this.code=e,this.usedTimes=0}}function Fb(n,e,t,i,s,r,o){const a=new kf,l=new Nb,c=new Set,u=[],f=s.logarithmicDepthBuffer,p=s.vertexTextures;let m=s.precision;const g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function x(w){return c.add(w),w===0?"uv":`uv${w}`}function d(w,T,C,I,F){const V=I.fog,W=F.geometry,D=w.isMeshStandardMaterial?I.environment:null,B=(w.isMeshStandardMaterial?t:e).get(w.envMap||D),G=B&&B.mapping===Tc?B.image.height:null,Y=g[w.type];w.precision!==null&&(m=s.getMaxPrecision(w.precision),m!==w.precision&&Mt("WebGLProgram.getParameters:",w.precision,"not supported, using",m,"instead."));const N=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,te=N!==void 0?N.length:0;let q=0;W.morphAttributes.position!==void 0&&(q=1),W.morphAttributes.normal!==void 0&&(q=2),W.morphAttributes.color!==void 0&&(q=3);let fe,re,ne,K;if(Y){const Ye=rs[Y];fe=Ye.vertexShader,re=Ye.fragmentShader}else fe=w.vertexShader,re=w.fragmentShader,l.update(w),ne=l.getVertexShaderID(w),K=l.getFragmentShaderID(w);const he=n.getRenderTarget(),ae=n.state.buffers.depth.getReversed(),ge=he&&he.isWebGLMultiviewRenderTarget?he.numViews:0,H=F.isInstancedMesh===!0,de=F.isBatchedMesh===!0,J=!!w.map,me=!!w.matcap,U=!!B,ee=!!w.aoMap,P=!!w.lightMap,ie=!!w.bumpMap,_e=!!w.normalMap,xe=!!w.displacementMap,Z=!!w.emissiveMap,Re=!!w.metalnessMap,oe=!!w.roughnessMap,Ee=w.anisotropy>0,ze=w.clearcoat>0,Ve=w.dispersion>0,it=w.iridescence>0,se=w.sheen>0,A=w.transmission>0,y=Ee&&!!w.anisotropyMap,O=ze&&!!w.clearcoatMap,j=ze&&!!w.clearcoatNormalMap,le=ze&&!!w.clearcoatRoughnessMap,X=it&&!!w.iridescenceMap,Se=it&&!!w.iridescenceThicknessMap,Te=se&&!!w.sheenColorMap,Fe=se&&!!w.sheenRoughnessMap,at=!!w.specularMap,Pe=!!w.specularColorMap,k=!!w.specularIntensityMap,Ce=A&&!!w.transmissionMap,ve=A&&!!w.thicknessMap,Ae=!!w.gradientMap,He=!!w.alphaMap,Le=w.alphaTest>0,pt=!!w.alphaHash,mt=!!w.extensions;let Rt=tr;w.toneMapped&&(he===null||he.isXRRenderTarget===!0)&&(Rt=n.toneMapping);const ke={shaderID:Y,shaderType:w.type,shaderName:w.name,vertexShader:fe,fragmentShader:re,defines:w.defines,customVertexShaderID:ne,customFragmentShaderID:K,isRawShaderMaterial:w.isRawShaderMaterial===!0,glslVersion:w.glslVersion,precision:m,batching:de,batchingColor:de&&F._colorsTexture!==null,instancing:H,instancingColor:H&&F.instanceColor!==null,instancingMorph:H&&F.morphTexture!==null,supportsVertexTextures:p,numMultiviewViews:ge,outputColorSpace:he===null?n.outputColorSpace:he.isXRRenderTarget===!0?he.texture.colorSpace:uo,alphaToCoverage:!!w.alphaToCoverage,map:J,matcap:me,envMap:U,envMapMode:U&&B.mapping,envMapCubeUVHeight:G,aoMap:ee,lightMap:P,bumpMap:ie,normalMap:_e,displacementMap:p&&xe,emissiveMap:Z,normalMapObjectSpace:_e&&w.normalMapType===hm,normalMapTangentSpace:_e&&w.normalMapType===If,metalnessMap:Re,roughnessMap:oe,anisotropy:Ee,anisotropyMap:y,clearcoat:ze,clearcoatMap:O,clearcoatNormalMap:j,clearcoatRoughnessMap:le,dispersion:Ve,iridescence:it,iridescenceMap:X,iridescenceThicknessMap:Se,sheen:se,sheenColorMap:Te,sheenRoughnessMap:Fe,specularMap:at,specularColorMap:Pe,specularIntensityMap:k,transmission:A,transmissionMap:Ce,thicknessMap:ve,gradientMap:Ae,opaque:w.transparent===!1&&w.blending===Jr&&w.alphaToCoverage===!1,alphaMap:He,alphaTest:Le,alphaHash:pt,combine:w.combine,mapUv:J&&x(w.map.channel),aoMapUv:ee&&x(w.aoMap.channel),lightMapUv:P&&x(w.lightMap.channel),bumpMapUv:ie&&x(w.bumpMap.channel),normalMapUv:_e&&x(w.normalMap.channel),displacementMapUv:xe&&x(w.displacementMap.channel),emissiveMapUv:Z&&x(w.emissiveMap.channel),metalnessMapUv:Re&&x(w.metalnessMap.channel),roughnessMapUv:oe&&x(w.roughnessMap.channel),anisotropyMapUv:y&&x(w.anisotropyMap.channel),clearcoatMapUv:O&&x(w.clearcoatMap.channel),clearcoatNormalMapUv:j&&x(w.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:le&&x(w.clearcoatRoughnessMap.channel),iridescenceMapUv:X&&x(w.iridescenceMap.channel),iridescenceThicknessMapUv:Se&&x(w.iridescenceThicknessMap.channel),sheenColorMapUv:Te&&x(w.sheenColorMap.channel),sheenRoughnessMapUv:Fe&&x(w.sheenRoughnessMap.channel),specularMapUv:at&&x(w.specularMap.channel),specularColorMapUv:Pe&&x(w.specularColorMap.channel),specularIntensityMapUv:k&&x(w.specularIntensityMap.channel),transmissionMapUv:Ce&&x(w.transmissionMap.channel),thicknessMapUv:ve&&x(w.thicknessMap.channel),alphaMapUv:He&&x(w.alphaMap.channel),vertexTangents:!!W.attributes.tangent&&(_e||Ee),vertexColors:w.vertexColors,vertexAlphas:w.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,pointsUvs:F.isPoints===!0&&!!W.attributes.uv&&(J||He),fog:!!V,useFog:w.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:w.flatShading===!0&&w.wireframe===!1,sizeAttenuation:w.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:ae,skinning:F.isSkinnedMesh===!0,morphTargets:W.morphAttributes.position!==void 0,morphNormals:W.morphAttributes.normal!==void 0,morphColors:W.morphAttributes.color!==void 0,morphTargetsCount:te,morphTextureStride:q,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numClippingPlanes:o.numPlanes,numClipIntersection:o.numIntersection,dithering:w.dithering,shadowMapEnabled:n.shadowMap.enabled&&C.length>0,shadowMapType:n.shadowMap.type,toneMapping:Rt,decodeVideoTexture:J&&w.map.isVideoTexture===!0&&tn.getTransfer(w.map.colorSpace)===hn,decodeVideoTextureEmissive:Z&&w.emissiveMap.isVideoTexture===!0&&tn.getTransfer(w.emissiveMap.colorSpace)===hn,premultipliedAlpha:w.premultipliedAlpha,doubleSided:w.side===Ts,flipSided:w.side===gi,useDepthPacking:w.depthPacking>=0,depthPacking:w.depthPacking||0,index0AttributeName:w.index0AttributeName,extensionClipCullDistance:mt&&w.extensions.clipCullDistance===!0&&i.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(mt&&w.extensions.multiDraw===!0||de)&&i.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:i.has("KHR_parallel_shader_compile"),customProgramCacheKey:w.customProgramCacheKey()};return ke.vertexUv1s=c.has(1),ke.vertexUv2s=c.has(2),ke.vertexUv3s=c.has(3),c.clear(),ke}function h(w){const T=[];if(w.shaderID?T.push(w.shaderID):(T.push(w.customVertexShaderID),T.push(w.customFragmentShaderID)),w.defines!==void 0)for(const C in w.defines)T.push(C),T.push(w.defines[C]);return w.isRawShaderMaterial===!1&&(M(T,w),_(T,w),T.push(n.outputColorSpace)),T.push(w.customProgramCacheKey),T.join()}function M(w,T){w.push(T.precision),w.push(T.outputColorSpace),w.push(T.envMapMode),w.push(T.envMapCubeUVHeight),w.push(T.mapUv),w.push(T.alphaMapUv),w.push(T.lightMapUv),w.push(T.aoMapUv),w.push(T.bumpMapUv),w.push(T.normalMapUv),w.push(T.displacementMapUv),w.push(T.emissiveMapUv),w.push(T.metalnessMapUv),w.push(T.roughnessMapUv),w.push(T.anisotropyMapUv),w.push(T.clearcoatMapUv),w.push(T.clearcoatNormalMapUv),w.push(T.clearcoatRoughnessMapUv),w.push(T.iridescenceMapUv),w.push(T.iridescenceThicknessMapUv),w.push(T.sheenColorMapUv),w.push(T.sheenRoughnessMapUv),w.push(T.specularMapUv),w.push(T.specularColorMapUv),w.push(T.specularIntensityMapUv),w.push(T.transmissionMapUv),w.push(T.thicknessMapUv),w.push(T.combine),w.push(T.fogExp2),w.push(T.sizeAttenuation),w.push(T.morphTargetsCount),w.push(T.morphAttributeCount),w.push(T.numDirLights),w.push(T.numPointLights),w.push(T.numSpotLights),w.push(T.numSpotLightMaps),w.push(T.numHemiLights),w.push(T.numRectAreaLights),w.push(T.numDirLightShadows),w.push(T.numPointLightShadows),w.push(T.numSpotLightShadows),w.push(T.numSpotLightShadowsWithMaps),w.push(T.numLightProbes),w.push(T.shadowMapType),w.push(T.toneMapping),w.push(T.numClippingPlanes),w.push(T.numClipIntersection),w.push(T.depthPacking)}function _(w,T){a.disableAll(),T.supportsVertexTextures&&a.enable(0),T.instancing&&a.enable(1),T.instancingColor&&a.enable(2),T.instancingMorph&&a.enable(3),T.matcap&&a.enable(4),T.envMap&&a.enable(5),T.normalMapObjectSpace&&a.enable(6),T.normalMapTangentSpace&&a.enable(7),T.clearcoat&&a.enable(8),T.iridescence&&a.enable(9),T.alphaTest&&a.enable(10),T.vertexColors&&a.enable(11),T.vertexAlphas&&a.enable(12),T.vertexUv1s&&a.enable(13),T.vertexUv2s&&a.enable(14),T.vertexUv3s&&a.enable(15),T.vertexTangents&&a.enable(16),T.anisotropy&&a.enable(17),T.alphaHash&&a.enable(18),T.batching&&a.enable(19),T.dispersion&&a.enable(20),T.batchingColor&&a.enable(21),T.gradientMap&&a.enable(22),w.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),T.numMultiviewViews&&a.enable(22),w.push(a.mask)}function b(w){const T=g[w.type];let C;if(T){const I=rs[T];C=eg.clone(I.uniforms)}else C=w.uniforms;return C}function S(w,T){let C;for(let I=0,F=u.length;I<F;I++){const V=u[I];if(V.cacheKey===T){C=V,++C.usedTimes;break}}return C===void 0&&(C=new Ib(n,T,w,r),u.push(C)),C}function v(w){if(--w.usedTimes===0){const T=u.indexOf(w);u[T]=u[u.length-1],u.pop(),w.destroy()}}function E(w){l.remove(w)}function R(){l.dispose()}return{getParameters:d,getProgramCacheKey:h,getUniforms:b,acquireProgram:S,releaseProgram:v,releaseShaderCache:E,programs:u,dispose:R}}function kb(){let n=new WeakMap;function e(o){return n.has(o)}function t(o){let a=n.get(o);return a===void 0&&(a={},n.set(o,a)),a}function i(o){n.delete(o)}function s(o,a,l){n.get(o)[a]=l}function r(){n=new WeakMap}return{has:e,get:t,remove:i,update:s,dispose:r}}function zb(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.material.id!==e.material.id?n.material.id-e.material.id:n.z!==e.z?n.z-e.z:n.id-e.id}function Rd(n,e){return n.groupOrder!==e.groupOrder?n.groupOrder-e.groupOrder:n.renderOrder!==e.renderOrder?n.renderOrder-e.renderOrder:n.z!==e.z?e.z-n.z:n.id-e.id}function Cd(){const n=[];let e=0;const t=[],i=[],s=[];function r(){e=0,t.length=0,i.length=0,s.length=0}function o(f,p,m,g,x,d){let h=n[e];return h===void 0?(h={id:f.id,object:f,geometry:p,material:m,groupOrder:g,renderOrder:f.renderOrder,z:x,group:d},n[e]=h):(h.id=f.id,h.object=f,h.geometry=p,h.material=m,h.groupOrder=g,h.renderOrder=f.renderOrder,h.z=x,h.group=d),e++,h}function a(f,p,m,g,x,d){const h=o(f,p,m,g,x,d);m.transmission>0?i.push(h):m.transparent===!0?s.push(h):t.push(h)}function l(f,p,m,g,x,d){const h=o(f,p,m,g,x,d);m.transmission>0?i.unshift(h):m.transparent===!0?s.unshift(h):t.unshift(h)}function c(f,p){t.length>1&&t.sort(f||zb),i.length>1&&i.sort(p||Rd),s.length>1&&s.sort(p||Rd)}function u(){for(let f=e,p=n.length;f<p;f++){const m=n[f];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:i,transparent:s,init:r,push:a,unshift:l,finish:u,sort:c}}function Bb(){let n=new WeakMap;function e(i,s){const r=n.get(i);let o;return r===void 0?(o=new Cd,n.set(i,[o])):s>=r.length?(o=new Cd,r.push(o)):o=r[s],o}function t(){n=new WeakMap}return{get:e,dispose:t}}function Vb(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new ue,color:new Et};break;case"SpotLight":t={position:new ue,direction:new ue,color:new Et,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new ue,color:new Et,distance:0,decay:0};break;case"HemisphereLight":t={direction:new ue,skyColor:new Et,groundColor:new Et};break;case"RectAreaLight":t={color:new Et,position:new ue,halfWidth:new ue,halfHeight:new ue};break}return n[e.id]=t,t}}}function Hb(){const n={};return{get:function(e){if(n[e.id]!==void 0)return n[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ot,shadowCameraNear:1,shadowCameraFar:1e3};break}return n[e.id]=t,t}}}let Gb=0;function Wb(n,e){return(e.castShadow?2:0)-(n.castShadow?2:0)+(e.map?1:0)-(n.map?1:0)}function Xb(n){const e=new Vb,t=Hb(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)i.probe.push(new ue);const s=new ue,r=new Ht,o=new Ht;function a(c){let u=0,f=0,p=0;for(let w=0;w<9;w++)i.probe[w].set(0,0,0);let m=0,g=0,x=0,d=0,h=0,M=0,_=0,b=0,S=0,v=0,E=0;c.sort(Wb);for(let w=0,T=c.length;w<T;w++){const C=c[w],I=C.color,F=C.intensity,V=C.distance,W=C.shadow&&C.shadow.map?C.shadow.map.texture:null;if(C.isAmbientLight)u+=I.r*F,f+=I.g*F,p+=I.b*F;else if(C.isLightProbe){for(let D=0;D<9;D++)i.probe[D].addScaledVector(C.sh.coefficients[D],F);E++}else if(C.isDirectionalLight){const D=e.get(C);if(D.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){const B=C.shadow,G=t.get(C);G.shadowIntensity=B.intensity,G.shadowBias=B.bias,G.shadowNormalBias=B.normalBias,G.shadowRadius=B.radius,G.shadowMapSize=B.mapSize,i.directionalShadow[m]=G,i.directionalShadowMap[m]=W,i.directionalShadowMatrix[m]=C.shadow.matrix,M++}i.directional[m]=D,m++}else if(C.isSpotLight){const D=e.get(C);D.position.setFromMatrixPosition(C.matrixWorld),D.color.copy(I).multiplyScalar(F),D.distance=V,D.coneCos=Math.cos(C.angle),D.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),D.decay=C.decay,i.spot[x]=D;const B=C.shadow;if(C.map&&(i.spotLightMap[S]=C.map,S++,B.updateMatrices(C),C.castShadow&&v++),i.spotLightMatrix[x]=B.matrix,C.castShadow){const G=t.get(C);G.shadowIntensity=B.intensity,G.shadowBias=B.bias,G.shadowNormalBias=B.normalBias,G.shadowRadius=B.radius,G.shadowMapSize=B.mapSize,i.spotShadow[x]=G,i.spotShadowMap[x]=W,b++}x++}else if(C.isRectAreaLight){const D=e.get(C);D.color.copy(I).multiplyScalar(F),D.halfWidth.set(C.width*.5,0,0),D.halfHeight.set(0,C.height*.5,0),i.rectArea[d]=D,d++}else if(C.isPointLight){const D=e.get(C);if(D.color.copy(C.color).multiplyScalar(C.intensity),D.distance=C.distance,D.decay=C.decay,C.castShadow){const B=C.shadow,G=t.get(C);G.shadowIntensity=B.intensity,G.shadowBias=B.bias,G.shadowNormalBias=B.normalBias,G.shadowRadius=B.radius,G.shadowMapSize=B.mapSize,G.shadowCameraNear=B.camera.near,G.shadowCameraFar=B.camera.far,i.pointShadow[g]=G,i.pointShadowMap[g]=W,i.pointShadowMatrix[g]=C.shadow.matrix,_++}i.point[g]=D,g++}else if(C.isHemisphereLight){const D=e.get(C);D.skyColor.copy(C.color).multiplyScalar(F),D.groundColor.copy(C.groundColor).multiplyScalar(F),i.hemi[h]=D,h++}}d>0&&(n.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=$e.LTC_FLOAT_1,i.rectAreaLTC2=$e.LTC_FLOAT_2):(i.rectAreaLTC1=$e.LTC_HALF_1,i.rectAreaLTC2=$e.LTC_HALF_2)),i.ambient[0]=u,i.ambient[1]=f,i.ambient[2]=p;const R=i.hash;(R.directionalLength!==m||R.pointLength!==g||R.spotLength!==x||R.rectAreaLength!==d||R.hemiLength!==h||R.numDirectionalShadows!==M||R.numPointShadows!==_||R.numSpotShadows!==b||R.numSpotMaps!==S||R.numLightProbes!==E)&&(i.directional.length=m,i.spot.length=x,i.rectArea.length=d,i.point.length=g,i.hemi.length=h,i.directionalShadow.length=M,i.directionalShadowMap.length=M,i.pointShadow.length=_,i.pointShadowMap.length=_,i.spotShadow.length=b,i.spotShadowMap.length=b,i.directionalShadowMatrix.length=M,i.pointShadowMatrix.length=_,i.spotLightMatrix.length=b+S-v,i.spotLightMap.length=S,i.numSpotLightShadowsWithMaps=v,i.numLightProbes=E,R.directionalLength=m,R.pointLength=g,R.spotLength=x,R.rectAreaLength=d,R.hemiLength=h,R.numDirectionalShadows=M,R.numPointShadows=_,R.numSpotShadows=b,R.numSpotMaps=S,R.numLightProbes=E,i.version=Gb++)}function l(c,u){let f=0,p=0,m=0,g=0,x=0;const d=u.matrixWorldInverse;for(let h=0,M=c.length;h<M;h++){const _=c[h];if(_.isDirectionalLight){const b=i.directional[f];b.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(d),f++}else if(_.isSpotLight){const b=i.spot[m];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(d),b.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),b.direction.sub(s),b.direction.transformDirection(d),m++}else if(_.isRectAreaLight){const b=i.rectArea[g];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(d),o.identity(),r.copy(_.matrixWorld),r.premultiply(d),o.extractRotation(r),b.halfWidth.set(_.width*.5,0,0),b.halfHeight.set(0,_.height*.5,0),b.halfWidth.applyMatrix4(o),b.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){const b=i.point[p];b.position.setFromMatrixPosition(_.matrixWorld),b.position.applyMatrix4(d),p++}else if(_.isHemisphereLight){const b=i.hemi[x];b.direction.setFromMatrixPosition(_.matrixWorld),b.direction.transformDirection(d),x++}}}return{setup:a,setupView:l,state:i}}function Ld(n){const e=new Xb(n),t=[],i=[];function s(u){c.camera=u,t.length=0,i.length=0}function r(u){t.push(u)}function o(u){i.push(u)}function a(){e.setup(t)}function l(u){e.setupView(t,u)}const c={lightsArray:t,shadowsArray:i,camera:null,lights:e,transmissionRenderTarget:{}};return{init:s,state:c,setupLights:a,setupLightsView:l,pushLight:r,pushShadow:o}}function qb(n){let e=new WeakMap;function t(s,r=0){const o=e.get(s);let a;return o===void 0?(a=new Ld(n),e.set(s,[a])):r>=o.length?(a=new Ld(n),o.push(a)):a=o[r],a}function i(){e=new WeakMap}return{get:t,dispose:i}}const Yb=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,jb=`uniform sampler2D shadow_pass;
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
}`;function $b(n,e,t){let i=new $h;const s=new Ot,r=new Ot,o=new Mn,a=new fg({depthPacking:lm}),l=new pg,c={},u=t.maxTextureSize,f={[nr]:gi,[gi]:nr,[Ts]:Ts},p=new Ns({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ot},radius:{value:4}},vertexShader:Yb,fragmentShader:jb}),m=p.clone();m.defines.HORIZONTAL_PASS=1;const g=new Vi;g.setAttribute("position",new Bi(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const x=new Us(g,p),d=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Sf;let h=this.type;this.render=function(v,E,R){if(d.enabled===!1||d.autoUpdate===!1&&d.needsUpdate===!1||v.length===0)return;const w=n.getRenderTarget(),T=n.getActiveCubeFace(),C=n.getActiveMipmapLevel(),I=n.state;I.setBlending(Cs),I.buffers.depth.getReversed()===!0?I.buffers.color.setClear(0,0,0,0):I.buffers.color.setClear(1,1,1,1),I.buffers.depth.setTest(!0),I.setScissorTest(!1);const F=h!==Ss&&this.type===Ss,V=h===Ss&&this.type!==Ss;for(let W=0,D=v.length;W<D;W++){const B=v[W],G=B.shadow;if(G===void 0){Mt("WebGLShadowMap:",B,"has no shadow.");continue}if(G.autoUpdate===!1&&G.needsUpdate===!1)continue;s.copy(G.mapSize);const Y=G.getFrameExtents();if(s.multiply(Y),r.copy(G.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/Y.x),s.x=r.x*Y.x,G.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/Y.y),s.y=r.y*Y.y,G.mapSize.y=r.y)),G.map===null||F===!0||V===!0){const te=this.type!==Ss?{minFilter:Ti,magFilter:Ti}:{};G.map!==null&&G.map.dispose(),G.map=new ir(s.x,s.y,te),G.map.texture.name=B.name+".shadowMap",G.camera.updateProjectionMatrix()}n.setRenderTarget(G.map),n.clear();const N=G.getViewportCount();for(let te=0;te<N;te++){const q=G.getViewport(te);o.set(r.x*q.x,r.y*q.y,r.x*q.z,r.y*q.w),I.viewport(o),G.updateMatrices(B,te),i=G.getFrustum(),b(E,R,G.camera,B,this.type)}G.isPointLightShadow!==!0&&this.type===Ss&&M(G,R),G.needsUpdate=!1}h=this.type,d.needsUpdate=!1,n.setRenderTarget(w,T,C)};function M(v,E){const R=e.update(x);p.defines.VSM_SAMPLES!==v.blurSamples&&(p.defines.VSM_SAMPLES=v.blurSamples,m.defines.VSM_SAMPLES=v.blurSamples,p.needsUpdate=!0,m.needsUpdate=!0),v.mapPass===null&&(v.mapPass=new ir(s.x,s.y)),p.uniforms.shadow_pass.value=v.map.texture,p.uniforms.resolution.value=v.mapSize,p.uniforms.radius.value=v.radius,n.setRenderTarget(v.mapPass),n.clear(),n.renderBufferDirect(E,null,R,p,x,null),m.uniforms.shadow_pass.value=v.mapPass.texture,m.uniforms.resolution.value=v.mapSize,m.uniforms.radius.value=v.radius,n.setRenderTarget(v.map),n.clear(),n.renderBufferDirect(E,null,R,m,x,null)}function _(v,E,R,w){let T=null;const C=R.isPointLight===!0?v.customDistanceMaterial:v.customDepthMaterial;if(C!==void 0)T=C;else if(T=R.isPointLight===!0?l:a,n.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){const I=T.uuid,F=E.uuid;let V=c[I];V===void 0&&(V={},c[I]=V);let W=V[F];W===void 0&&(W=T.clone(),V[F]=W,E.addEventListener("dispose",S)),T=W}if(T.visible=E.visible,T.wireframe=E.wireframe,w===Ss?T.side=E.shadowSide!==null?E.shadowSide:E.side:T.side=E.shadowSide!==null?E.shadowSide:f[E.side],T.alphaMap=E.alphaMap,T.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,T.map=E.map,T.clipShadows=E.clipShadows,T.clippingPlanes=E.clippingPlanes,T.clipIntersection=E.clipIntersection,T.displacementMap=E.displacementMap,T.displacementScale=E.displacementScale,T.displacementBias=E.displacementBias,T.wireframeLinewidth=E.wireframeLinewidth,T.linewidth=E.linewidth,R.isPointLight===!0&&T.isMeshDistanceMaterial===!0){const I=n.properties.get(T);I.light=R}return T}function b(v,E,R,w,T){if(v.visible===!1)return;if(v.layers.test(E.layers)&&(v.isMesh||v.isLine||v.isPoints)&&(v.castShadow||v.receiveShadow&&T===Ss)&&(!v.frustumCulled||i.intersectsObject(v))){v.modelViewMatrix.multiplyMatrices(R.matrixWorldInverse,v.matrixWorld);const F=e.update(v),V=v.material;if(Array.isArray(V)){const W=F.groups;for(let D=0,B=W.length;D<B;D++){const G=W[D],Y=V[G.materialIndex];if(Y&&Y.visible){const N=_(v,Y,w,T);v.onBeforeShadow(n,v,E,R,F,N,G),n.renderBufferDirect(R,null,F,N,v,G),v.onAfterShadow(n,v,E,R,F,N,G)}}}else if(V.visible){const W=_(v,V,w,T);v.onBeforeShadow(n,v,E,R,F,W,null),n.renderBufferDirect(R,null,F,W,v,null),v.onAfterShadow(n,v,E,R,F,W,null)}}const I=v.children;for(let F=0,V=I.length;F<V;F++)b(I[F],E,R,w,T)}function S(v){v.target.removeEventListener("dispose",S);for(const R in c){const w=c[R],T=v.target.uuid;T in w&&(w[T].dispose(),delete w[T])}}}const Kb={[Bl]:Vl,[Hl]:Xl,[Gl]:ql,[ao]:Wl,[Vl]:Bl,[Xl]:Hl,[ql]:Gl,[Wl]:ao};function Zb(n,e){function t(){let k=!1;const Ce=new Mn;let ve=null;const Ae=new Mn(0,0,0,0);return{setMask:function(He){ve!==He&&!k&&(n.colorMask(He,He,He,He),ve=He)},setLocked:function(He){k=He},setClear:function(He,Le,pt,mt,Rt){Rt===!0&&(He*=mt,Le*=mt,pt*=mt),Ce.set(He,Le,pt,mt),Ae.equals(Ce)===!1&&(n.clearColor(He,Le,pt,mt),Ae.copy(Ce))},reset:function(){k=!1,ve=null,Ae.set(-1,0,0,0)}}}function i(){let k=!1,Ce=!1,ve=null,Ae=null,He=null;return{setReversed:function(Le){if(Ce!==Le){const pt=e.get("EXT_clip_control");Le?pt.clipControlEXT(pt.LOWER_LEFT_EXT,pt.ZERO_TO_ONE_EXT):pt.clipControlEXT(pt.LOWER_LEFT_EXT,pt.NEGATIVE_ONE_TO_ONE_EXT),Ce=Le;const mt=He;He=null,this.setClear(mt)}},getReversed:function(){return Ce},setTest:function(Le){Le?he(n.DEPTH_TEST):ae(n.DEPTH_TEST)},setMask:function(Le){ve!==Le&&!k&&(n.depthMask(Le),ve=Le)},setFunc:function(Le){if(Ce&&(Le=Kb[Le]),Ae!==Le){switch(Le){case Bl:n.depthFunc(n.NEVER);break;case Vl:n.depthFunc(n.ALWAYS);break;case Hl:n.depthFunc(n.LESS);break;case ao:n.depthFunc(n.LEQUAL);break;case Gl:n.depthFunc(n.EQUAL);break;case Wl:n.depthFunc(n.GEQUAL);break;case Xl:n.depthFunc(n.GREATER);break;case ql:n.depthFunc(n.NOTEQUAL);break;default:n.depthFunc(n.LEQUAL)}Ae=Le}},setLocked:function(Le){k=Le},setClear:function(Le){He!==Le&&(Ce&&(Le=1-Le),n.clearDepth(Le),He=Le)},reset:function(){k=!1,ve=null,Ae=null,He=null,Ce=!1}}}function s(){let k=!1,Ce=null,ve=null,Ae=null,He=null,Le=null,pt=null,mt=null,Rt=null;return{setTest:function(ke){k||(ke?he(n.STENCIL_TEST):ae(n.STENCIL_TEST))},setMask:function(ke){Ce!==ke&&!k&&(n.stencilMask(ke),Ce=ke)},setFunc:function(ke,Ye,xt){(ve!==ke||Ae!==Ye||He!==xt)&&(n.stencilFunc(ke,Ye,xt),ve=ke,Ae=Ye,He=xt)},setOp:function(ke,Ye,xt){(Le!==ke||pt!==Ye||mt!==xt)&&(n.stencilOp(ke,Ye,xt),Le=ke,pt=Ye,mt=xt)},setLocked:function(ke){k=ke},setClear:function(ke){Rt!==ke&&(n.clearStencil(ke),Rt=ke)},reset:function(){k=!1,Ce=null,ve=null,Ae=null,He=null,Le=null,pt=null,mt=null,Rt=null}}}const r=new t,o=new i,a=new s,l=new WeakMap,c=new WeakMap;let u={},f={},p=new WeakMap,m=[],g=null,x=!1,d=null,h=null,M=null,_=null,b=null,S=null,v=null,E=new Et(0,0,0),R=0,w=!1,T=null,C=null,I=null,F=null,V=null;const W=n.getParameter(n.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let D=!1,B=0;const G=n.getParameter(n.VERSION);G.indexOf("WebGL")!==-1?(B=parseFloat(/^WebGL (\d)/.exec(G)[1]),D=B>=1):G.indexOf("OpenGL ES")!==-1&&(B=parseFloat(/^OpenGL ES (\d)/.exec(G)[1]),D=B>=2);let Y=null,N={};const te=n.getParameter(n.SCISSOR_BOX),q=n.getParameter(n.VIEWPORT),fe=new Mn().fromArray(te),re=new Mn().fromArray(q);function ne(k,Ce,ve,Ae){const He=new Uint8Array(4),Le=n.createTexture();n.bindTexture(k,Le),n.texParameteri(k,n.TEXTURE_MIN_FILTER,n.NEAREST),n.texParameteri(k,n.TEXTURE_MAG_FILTER,n.NEAREST);for(let pt=0;pt<ve;pt++)k===n.TEXTURE_3D||k===n.TEXTURE_2D_ARRAY?n.texImage3D(Ce,0,n.RGBA,1,1,Ae,0,n.RGBA,n.UNSIGNED_BYTE,He):n.texImage2D(Ce+pt,0,n.RGBA,1,1,0,n.RGBA,n.UNSIGNED_BYTE,He);return Le}const K={};K[n.TEXTURE_2D]=ne(n.TEXTURE_2D,n.TEXTURE_2D,1),K[n.TEXTURE_CUBE_MAP]=ne(n.TEXTURE_CUBE_MAP,n.TEXTURE_CUBE_MAP_POSITIVE_X,6),K[n.TEXTURE_2D_ARRAY]=ne(n.TEXTURE_2D_ARRAY,n.TEXTURE_2D_ARRAY,1,1),K[n.TEXTURE_3D]=ne(n.TEXTURE_3D,n.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),he(n.DEPTH_TEST),o.setFunc(ao),P(!1),ie(vu),he(n.CULL_FACE),U(Cs);function he(k){u[k]!==!0&&(n.enable(k),u[k]=!0)}function ae(k){u[k]!==!1&&(n.disable(k),u[k]=!1)}function ge(k,Ce){return f[k]!==Ce?(n.bindFramebuffer(k,Ce),f[k]=Ce,k===n.DRAW_FRAMEBUFFER&&(f[n.FRAMEBUFFER]=Ce),k===n.FRAMEBUFFER&&(f[n.DRAW_FRAMEBUFFER]=Ce),!0):!1}function H(k,Ce){let ve=m,Ae=!1;if(k){ve=p.get(Ce),ve===void 0&&(ve=[],p.set(Ce,ve));const He=k.textures;if(ve.length!==He.length||ve[0]!==n.COLOR_ATTACHMENT0){for(let Le=0,pt=He.length;Le<pt;Le++)ve[Le]=n.COLOR_ATTACHMENT0+Le;ve.length=He.length,Ae=!0}}else ve[0]!==n.BACK&&(ve[0]=n.BACK,Ae=!0);Ae&&n.drawBuffers(ve)}function de(k){return g!==k?(n.useProgram(k),g=k,!0):!1}const J={[fr]:n.FUNC_ADD,[Up]:n.FUNC_SUBTRACT,[Np]:n.FUNC_REVERSE_SUBTRACT};J[Op]=n.MIN,J[Fp]=n.MAX;const me={[kp]:n.ZERO,[zp]:n.ONE,[Bp]:n.SRC_COLOR,[kl]:n.SRC_ALPHA,[qp]:n.SRC_ALPHA_SATURATE,[Wp]:n.DST_COLOR,[Hp]:n.DST_ALPHA,[Vp]:n.ONE_MINUS_SRC_COLOR,[zl]:n.ONE_MINUS_SRC_ALPHA,[Xp]:n.ONE_MINUS_DST_COLOR,[Gp]:n.ONE_MINUS_DST_ALPHA,[Yp]:n.CONSTANT_COLOR,[jp]:n.ONE_MINUS_CONSTANT_COLOR,[$p]:n.CONSTANT_ALPHA,[Kp]:n.ONE_MINUS_CONSTANT_ALPHA};function U(k,Ce,ve,Ae,He,Le,pt,mt,Rt,ke){if(k===Cs){x===!0&&(ae(n.BLEND),x=!1);return}if(x===!1&&(he(n.BLEND),x=!0),k!==Ip){if(k!==d||ke!==w){if((h!==fr||b!==fr)&&(n.blendEquation(n.FUNC_ADD),h=fr,b=fr),ke)switch(k){case Jr:n.blendFuncSeparate(n.ONE,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case yu:n.blendFunc(n.ONE,n.ONE);break;case Su:n.blendFuncSeparate(n.ZERO,n.ONE_MINUS_SRC_COLOR,n.ZERO,n.ONE);break;case Eu:n.blendFuncSeparate(n.DST_COLOR,n.ONE_MINUS_SRC_ALPHA,n.ZERO,n.ONE);break;default:Rn("WebGLState: Invalid blending: ",k);break}else switch(k){case Jr:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE_MINUS_SRC_ALPHA,n.ONE,n.ONE_MINUS_SRC_ALPHA);break;case yu:n.blendFuncSeparate(n.SRC_ALPHA,n.ONE,n.ONE,n.ONE);break;case Su:Rn("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Eu:Rn("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Rn("WebGLState: Invalid blending: ",k);break}M=null,_=null,S=null,v=null,E.set(0,0,0),R=0,d=k,w=ke}return}He=He||Ce,Le=Le||ve,pt=pt||Ae,(Ce!==h||He!==b)&&(n.blendEquationSeparate(J[Ce],J[He]),h=Ce,b=He),(ve!==M||Ae!==_||Le!==S||pt!==v)&&(n.blendFuncSeparate(me[ve],me[Ae],me[Le],me[pt]),M=ve,_=Ae,S=Le,v=pt),(mt.equals(E)===!1||Rt!==R)&&(n.blendColor(mt.r,mt.g,mt.b,Rt),E.copy(mt),R=Rt),d=k,w=!1}function ee(k,Ce){k.side===Ts?ae(n.CULL_FACE):he(n.CULL_FACE);let ve=k.side===gi;Ce&&(ve=!ve),P(ve),k.blending===Jr&&k.transparent===!1?U(Cs):U(k.blending,k.blendEquation,k.blendSrc,k.blendDst,k.blendEquationAlpha,k.blendSrcAlpha,k.blendDstAlpha,k.blendColor,k.blendAlpha,k.premultipliedAlpha),o.setFunc(k.depthFunc),o.setTest(k.depthTest),o.setMask(k.depthWrite),r.setMask(k.colorWrite);const Ae=k.stencilWrite;a.setTest(Ae),Ae&&(a.setMask(k.stencilWriteMask),a.setFunc(k.stencilFunc,k.stencilRef,k.stencilFuncMask),a.setOp(k.stencilFail,k.stencilZFail,k.stencilZPass)),xe(k.polygonOffset,k.polygonOffsetFactor,k.polygonOffsetUnits),k.alphaToCoverage===!0?he(n.SAMPLE_ALPHA_TO_COVERAGE):ae(n.SAMPLE_ALPHA_TO_COVERAGE)}function P(k){T!==k&&(k?n.frontFace(n.CW):n.frontFace(n.CCW),T=k)}function ie(k){k!==Lp?(he(n.CULL_FACE),k!==C&&(k===vu?n.cullFace(n.BACK):k===Pp?n.cullFace(n.FRONT):n.cullFace(n.FRONT_AND_BACK))):ae(n.CULL_FACE),C=k}function _e(k){k!==I&&(D&&n.lineWidth(k),I=k)}function xe(k,Ce,ve){k?(he(n.POLYGON_OFFSET_FILL),(F!==Ce||V!==ve)&&(n.polygonOffset(Ce,ve),F=Ce,V=ve)):ae(n.POLYGON_OFFSET_FILL)}function Z(k){k?he(n.SCISSOR_TEST):ae(n.SCISSOR_TEST)}function Re(k){k===void 0&&(k=n.TEXTURE0+W-1),Y!==k&&(n.activeTexture(k),Y=k)}function oe(k,Ce,ve){ve===void 0&&(Y===null?ve=n.TEXTURE0+W-1:ve=Y);let Ae=N[ve];Ae===void 0&&(Ae={type:void 0,texture:void 0},N[ve]=Ae),(Ae.type!==k||Ae.texture!==Ce)&&(Y!==ve&&(n.activeTexture(ve),Y=ve),n.bindTexture(k,Ce||K[k]),Ae.type=k,Ae.texture=Ce)}function Ee(){const k=N[Y];k!==void 0&&k.type!==void 0&&(n.bindTexture(k.type,null),k.type=void 0,k.texture=void 0)}function ze(){try{n.compressedTexImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function Ve(){try{n.compressedTexImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function it(){try{n.texSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function se(){try{n.texSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function A(){try{n.compressedTexSubImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function y(){try{n.compressedTexSubImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function O(){try{n.texStorage2D(...arguments)}catch(k){k("WebGLState:",k)}}function j(){try{n.texStorage3D(...arguments)}catch(k){k("WebGLState:",k)}}function le(){try{n.texImage2D(...arguments)}catch(k){k("WebGLState:",k)}}function X(){try{n.texImage3D(...arguments)}catch(k){k("WebGLState:",k)}}function Se(k){fe.equals(k)===!1&&(n.scissor(k.x,k.y,k.z,k.w),fe.copy(k))}function Te(k){re.equals(k)===!1&&(n.viewport(k.x,k.y,k.z,k.w),re.copy(k))}function Fe(k,Ce){let ve=c.get(Ce);ve===void 0&&(ve=new WeakMap,c.set(Ce,ve));let Ae=ve.get(k);Ae===void 0&&(Ae=n.getUniformBlockIndex(Ce,k.name),ve.set(k,Ae))}function at(k,Ce){const Ae=c.get(Ce).get(k);l.get(Ce)!==Ae&&(n.uniformBlockBinding(Ce,Ae,k.__bindingPointIndex),l.set(Ce,Ae))}function Pe(){n.disable(n.BLEND),n.disable(n.CULL_FACE),n.disable(n.DEPTH_TEST),n.disable(n.POLYGON_OFFSET_FILL),n.disable(n.SCISSOR_TEST),n.disable(n.STENCIL_TEST),n.disable(n.SAMPLE_ALPHA_TO_COVERAGE),n.blendEquation(n.FUNC_ADD),n.blendFunc(n.ONE,n.ZERO),n.blendFuncSeparate(n.ONE,n.ZERO,n.ONE,n.ZERO),n.blendColor(0,0,0,0),n.colorMask(!0,!0,!0,!0),n.clearColor(0,0,0,0),n.depthMask(!0),n.depthFunc(n.LESS),o.setReversed(!1),n.clearDepth(1),n.stencilMask(4294967295),n.stencilFunc(n.ALWAYS,0,4294967295),n.stencilOp(n.KEEP,n.KEEP,n.KEEP),n.clearStencil(0),n.cullFace(n.BACK),n.frontFace(n.CCW),n.polygonOffset(0,0),n.activeTexture(n.TEXTURE0),n.bindFramebuffer(n.FRAMEBUFFER,null),n.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),n.bindFramebuffer(n.READ_FRAMEBUFFER,null),n.useProgram(null),n.lineWidth(1),n.scissor(0,0,n.canvas.width,n.canvas.height),n.viewport(0,0,n.canvas.width,n.canvas.height),u={},Y=null,N={},f={},p=new WeakMap,m=[],g=null,x=!1,d=null,h=null,M=null,_=null,b=null,S=null,v=null,E=new Et(0,0,0),R=0,w=!1,T=null,C=null,I=null,F=null,V=null,fe.set(0,0,n.canvas.width,n.canvas.height),re.set(0,0,n.canvas.width,n.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:he,disable:ae,bindFramebuffer:ge,drawBuffers:H,useProgram:de,setBlending:U,setMaterial:ee,setFlipSided:P,setCullFace:ie,setLineWidth:_e,setPolygonOffset:xe,setScissorTest:Z,activeTexture:Re,bindTexture:oe,unbindTexture:Ee,compressedTexImage2D:ze,compressedTexImage3D:Ve,texImage2D:le,texImage3D:X,updateUBOMapping:Fe,uniformBlockBinding:at,texStorage2D:O,texStorage3D:j,texSubImage2D:it,texSubImage3D:se,compressedTexSubImage2D:A,compressedTexSubImage3D:y,scissor:Se,viewport:Te,reset:Pe}}function Qb(n,e,t,i,s,r,o){const a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=e.has("OCULUS_multiview")?e.get("OCULUS_multiview"):null,u=new Ot,f=new WeakMap;let p;const m=new WeakMap;let g=[],x=!1,d=!1;try{d=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function h(A,y){return d?new OffscreenCanvas(A,y):gc("canvas")}function M(A,y,O){let j=1;const le=se(A);if((le.width>O||le.height>O)&&(j=O/Math.max(le.width,le.height)),j<1)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap||typeof VideoFrame<"u"&&A instanceof VideoFrame){const X=Math.floor(j*le.width),Se=Math.floor(j*le.height);p===void 0&&(p=h(X,Se));const Te=y?h(X,Se):p;return Te.width=X,Te.height=Se,Te.getContext("2d").drawImage(A,0,0,X,Se),Mt("WebGLRenderer: Texture has been resized from ("+le.width+"x"+le.height+") to ("+X+"x"+Se+")."),Te}else return"data"in A&&Mt("WebGLRenderer: Image in DataTexture is too big ("+le.width+"x"+le.height+")."),A;return A}function _(A){return A.generateMipmaps}function b(A){n.generateMipmap(A)}function S(A){return A.isWebGLCubeRenderTarget?n.TEXTURE_CUBE_MAP:A.isWebGL3DRenderTarget?n.TEXTURE_3D:A.isWebGLArrayRenderTarget||A.isCompressedArrayTexture?n.TEXTURE_2D_ARRAY:n.TEXTURE_2D}function v(A,y,O,j,le=!1){if(A!==null){if(n[A]!==void 0)return n[A];Mt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let X=y;if(y===n.RED&&(O===n.FLOAT&&(X=n.R32F),O===n.HALF_FLOAT&&(X=n.R16F),O===n.UNSIGNED_BYTE&&(X=n.R8)),y===n.RED_INTEGER&&(O===n.UNSIGNED_BYTE&&(X=n.R8UI),O===n.UNSIGNED_SHORT&&(X=n.R16UI),O===n.UNSIGNED_INT&&(X=n.R32UI),O===n.BYTE&&(X=n.R8I),O===n.SHORT&&(X=n.R16I),O===n.INT&&(X=n.R32I)),y===n.RG&&(O===n.FLOAT&&(X=n.RG32F),O===n.HALF_FLOAT&&(X=n.RG16F),O===n.UNSIGNED_BYTE&&(X=n.RG8)),y===n.RG_INTEGER&&(O===n.UNSIGNED_BYTE&&(X=n.RG8UI),O===n.UNSIGNED_SHORT&&(X=n.RG16UI),O===n.UNSIGNED_INT&&(X=n.RG32UI),O===n.BYTE&&(X=n.RG8I),O===n.SHORT&&(X=n.RG16I),O===n.INT&&(X=n.RG32I)),y===n.RGB_INTEGER&&(O===n.UNSIGNED_BYTE&&(X=n.RGB8UI),O===n.UNSIGNED_SHORT&&(X=n.RGB16UI),O===n.UNSIGNED_INT&&(X=n.RGB32UI),O===n.BYTE&&(X=n.RGB8I),O===n.SHORT&&(X=n.RGB16I),O===n.INT&&(X=n.RGB32I)),y===n.RGBA_INTEGER&&(O===n.UNSIGNED_BYTE&&(X=n.RGBA8UI),O===n.UNSIGNED_SHORT&&(X=n.RGBA16UI),O===n.UNSIGNED_INT&&(X=n.RGBA32UI),O===n.BYTE&&(X=n.RGBA8I),O===n.SHORT&&(X=n.RGBA16I),O===n.INT&&(X=n.RGBA32I)),y===n.RGB&&(O===n.UNSIGNED_INT_5_9_9_9_REV&&(X=n.RGB9_E5),O===n.UNSIGNED_INT_10F_11F_11F_REV&&(X=n.R11F_G11F_B10F)),y===n.RGBA){const Se=le?pc:tn.getTransfer(j);O===n.FLOAT&&(X=n.RGBA32F),O===n.HALF_FLOAT&&(X=n.RGBA16F),O===n.UNSIGNED_BYTE&&(X=Se===hn?n.SRGB8_ALPHA8:n.RGBA8),O===n.UNSIGNED_SHORT_4_4_4_4&&(X=n.RGBA4),O===n.UNSIGNED_SHORT_5_5_5_1&&(X=n.RGB5_A1)}return(X===n.R16F||X===n.R32F||X===n.RG16F||X===n.RG32F||X===n.RGBA16F||X===n.RGBA32F)&&e.get("EXT_color_buffer_float"),X}function E(A,y){let O;return A?y===null||y===_r||y===eo?O=n.DEPTH24_STENCIL8:y===ji?O=n.DEPTH32F_STENCIL8:y===na&&(O=n.DEPTH24_STENCIL8,Mt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===_r||y===eo?O=n.DEPTH_COMPONENT24:y===ji?O=n.DEPTH_COMPONENT32F:y===na&&(O=n.DEPTH_COMPONENT16),O}function R(A,y){return _(A)===!0||A.isFramebufferTexture&&A.minFilter!==Ti&&A.minFilter!==ki?Math.log2(Math.max(y.width,y.height))+1:A.mipmaps!==void 0&&A.mipmaps.length>0?A.mipmaps.length:A.isCompressedTexture&&Array.isArray(A.image)?y.mipmaps.length:1}function w(A){const y=A.target;y.removeEventListener("dispose",w),C(y),y.isVideoTexture&&f.delete(y)}function T(A){const y=A.target;y.removeEventListener("dispose",T),F(y)}function C(A){const y=i.get(A);if(y.__webglInit===void 0)return;const O=A.source,j=m.get(O);if(j){const le=j[y.__cacheKey];le.usedTimes--,le.usedTimes===0&&I(A),Object.keys(j).length===0&&m.delete(O)}i.remove(A)}function I(A){const y=i.get(A);n.deleteTexture(y.__webglTexture);const O=A.source,j=m.get(O);delete j[y.__cacheKey],o.memory.textures--}function F(A){const y=i.get(A);if(A.depthTexture&&(A.depthTexture.dispose(),i.remove(A.depthTexture)),A.isWebGLCubeRenderTarget)for(let j=0;j<6;j++){if(Array.isArray(y.__webglFramebuffer[j]))for(let le=0;le<y.__webglFramebuffer[j].length;le++)n.deleteFramebuffer(y.__webglFramebuffer[j][le]);else n.deleteFramebuffer(y.__webglFramebuffer[j]);y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer[j])}else{if(Array.isArray(y.__webglFramebuffer))for(let j=0;j<y.__webglFramebuffer.length;j++)n.deleteFramebuffer(y.__webglFramebuffer[j]);else n.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&n.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&n.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let j=0;j<y.__webglColorRenderbuffer.length;j++)y.__webglColorRenderbuffer[j]&&n.deleteRenderbuffer(y.__webglColorRenderbuffer[j]);y.__webglDepthRenderbuffer&&n.deleteRenderbuffer(y.__webglDepthRenderbuffer)}const O=A.textures;for(let j=0,le=O.length;j<le;j++){const X=i.get(O[j]);X.__webglTexture&&(n.deleteTexture(X.__webglTexture),o.memory.textures--),i.remove(O[j])}i.remove(A)}let V=0;function W(){V=0}function D(){const A=V;return A>=s.maxTextures&&Mt("WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+s.maxTextures),V+=1,A}function B(A){const y=[];return y.push(A.wrapS),y.push(A.wrapT),y.push(A.wrapR||0),y.push(A.magFilter),y.push(A.minFilter),y.push(A.anisotropy),y.push(A.internalFormat),y.push(A.format),y.push(A.type),y.push(A.generateMipmaps),y.push(A.premultiplyAlpha),y.push(A.flipY),y.push(A.unpackAlignment),y.push(A.colorSpace),y.join()}function G(A,y){const O=i.get(A);if(A.isVideoTexture&&Ve(A),A.isRenderTargetTexture===!1&&A.isExternalTexture!==!0&&A.version>0&&O.__version!==A.version){const j=A.image;if(j===null)Mt("WebGLRenderer: Texture marked for update but no image data found.");else if(j.complete===!1)Mt("WebGLRenderer: Texture marked for update but image is incomplete");else if(de(O,A,y))return}else A.isExternalTexture&&(O.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D,O.__webglTexture,n.TEXTURE0+y)}function Y(A,y){const O=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&O.__version!==A.version){de(O,A,y);return}else A.isExternalTexture&&(O.__webglTexture=A.sourceTexture?A.sourceTexture:null);t.bindTexture(n.TEXTURE_2D_ARRAY,O.__webglTexture,n.TEXTURE0+y)}function N(A,y){const O=i.get(A);if(A.isRenderTargetTexture===!1&&A.version>0&&O.__version!==A.version){de(O,A,y);return}t.bindTexture(n.TEXTURE_3D,O.__webglTexture,n.TEXTURE0+y)}function te(A,y){const O=i.get(A);if(A.version>0&&O.__version!==A.version){J(O,A,y);return}t.bindTexture(n.TEXTURE_CUBE_MAP,O.__webglTexture,n.TEXTURE0+y)}const q={[$l]:n.REPEAT,[As]:n.CLAMP_TO_EDGE,[Kl]:n.MIRRORED_REPEAT},fe={[Ti]:n.NEAREST,[am]:n.NEAREST_MIPMAP_NEAREST,[va]:n.NEAREST_MIPMAP_LINEAR,[ki]:n.LINEAR,[Hc]:n.LINEAR_MIPMAP_NEAREST,[mr]:n.LINEAR_MIPMAP_LINEAR},re={[um]:n.NEVER,[xm]:n.ALWAYS,[dm]:n.LESS,[Uf]:n.LEQUAL,[fm]:n.EQUAL,[gm]:n.GEQUAL,[pm]:n.GREATER,[mm]:n.NOTEQUAL};function ne(A,y){if(y.type===ji&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===ki||y.magFilter===Hc||y.magFilter===va||y.magFilter===mr||y.minFilter===ki||y.minFilter===Hc||y.minFilter===va||y.minFilter===mr)&&Mt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),n.texParameteri(A,n.TEXTURE_WRAP_S,q[y.wrapS]),n.texParameteri(A,n.TEXTURE_WRAP_T,q[y.wrapT]),(A===n.TEXTURE_3D||A===n.TEXTURE_2D_ARRAY)&&n.texParameteri(A,n.TEXTURE_WRAP_R,q[y.wrapR]),n.texParameteri(A,n.TEXTURE_MAG_FILTER,fe[y.magFilter]),n.texParameteri(A,n.TEXTURE_MIN_FILTER,fe[y.minFilter]),y.compareFunction&&(n.texParameteri(A,n.TEXTURE_COMPARE_MODE,n.COMPARE_REF_TO_TEXTURE),n.texParameteri(A,n.TEXTURE_COMPARE_FUNC,re[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===Ti||y.minFilter!==va&&y.minFilter!==mr||y.type===ji&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||i.get(y).__currentAnisotropy){const O=e.get("EXT_texture_filter_anisotropic");n.texParameterf(A,O.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),i.get(y).__currentAnisotropy=y.anisotropy}}}function K(A,y){let O=!1;A.__webglInit===void 0&&(A.__webglInit=!0,y.addEventListener("dispose",w));const j=y.source;let le=m.get(j);le===void 0&&(le={},m.set(j,le));const X=B(y);if(X!==A.__cacheKey){le[X]===void 0&&(le[X]={texture:n.createTexture(),usedTimes:0},o.memory.textures++,O=!0),le[X].usedTimes++;const Se=le[A.__cacheKey];Se!==void 0&&(le[A.__cacheKey].usedTimes--,Se.usedTimes===0&&I(y)),A.__cacheKey=X,A.__webglTexture=le[X].texture}return O}function he(A,y,O){return Math.floor(Math.floor(A/O)/y)}function ae(A,y,O,j){const X=A.updateRanges;if(X.length===0)t.texSubImage2D(n.TEXTURE_2D,0,0,0,y.width,y.height,O,j,y.data);else{X.sort((Pe,k)=>Pe.start-k.start);let Se=0;for(let Pe=1;Pe<X.length;Pe++){const k=X[Se],Ce=X[Pe],ve=k.start+k.count,Ae=he(Ce.start,y.width,4),He=he(k.start,y.width,4);Ce.start<=ve+1&&Ae===He&&he(Ce.start+Ce.count-1,y.width,4)===Ae?k.count=Math.max(k.count,Ce.start+Ce.count-k.start):(++Se,X[Se]=Ce)}X.length=Se+1;const Te=n.getParameter(n.UNPACK_ROW_LENGTH),Fe=n.getParameter(n.UNPACK_SKIP_PIXELS),at=n.getParameter(n.UNPACK_SKIP_ROWS);n.pixelStorei(n.UNPACK_ROW_LENGTH,y.width);for(let Pe=0,k=X.length;Pe<k;Pe++){const Ce=X[Pe],ve=Math.floor(Ce.start/4),Ae=Math.ceil(Ce.count/4),He=ve%y.width,Le=Math.floor(ve/y.width),pt=Ae,mt=1;n.pixelStorei(n.UNPACK_SKIP_PIXELS,He),n.pixelStorei(n.UNPACK_SKIP_ROWS,Le),t.texSubImage2D(n.TEXTURE_2D,0,He,Le,pt,mt,O,j,y.data)}A.clearUpdateRanges(),n.pixelStorei(n.UNPACK_ROW_LENGTH,Te),n.pixelStorei(n.UNPACK_SKIP_PIXELS,Fe),n.pixelStorei(n.UNPACK_SKIP_ROWS,at)}}function ge(A){x=A}function H(){const A=x;x=!1;for(const y of g)de(y.textureProperties,y.texture,y.slot),y.texture.isPendingDeferredUpload=!1;g=[],x=A}function de(A,y,O){if(x)return y.isPendingDeferredUpload||(y.isPendingDeferredUpload=!0,g.push({textureProperties:A,texture:y,slot:O})),!1;let j=n.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(j=n.TEXTURE_2D_ARRAY),y.isData3DTexture&&(j=n.TEXTURE_3D);const le=K(A,y),X=y.source;t.bindTexture(j,A.__webglTexture,n.TEXTURE0+O);const Se=i.get(X);if(X.version!==Se.__version||le===!0){t.activeTexture(n.TEXTURE0+O);const Te=tn.getPrimaries(tn.workingColorSpace),Fe=y.colorSpace===Zs?null:tn.getPrimaries(y.colorSpace),at=y.colorSpace===Zs||Te===Fe?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,at);let Pe=M(y.image,!1,s.maxTextureSize);Pe=it(y,Pe);const k=r.convert(y.format,y.colorSpace),Ce=r.convert(y.type);let ve=v(y.internalFormat,k,Ce,y.colorSpace,y.isVideoTexture);ne(j,y);let Ae;const He=y.mipmaps,Le=y.isVideoTexture!==!0,pt=Se.__version===void 0||le===!0,mt=X.dataReady,Rt=R(y,Pe);if(y.isDepthTexture)ve=E(y.format===to,y.type),pt&&(Le?t.texStorage2D(n.TEXTURE_2D,1,ve,Pe.width,Pe.height):t.texImage2D(n.TEXTURE_2D,0,ve,Pe.width,Pe.height,0,k,Ce,null));else if(y.isDataTexture)if(He.length>0){Le&&pt&&t.texStorage2D(n.TEXTURE_2D,Rt,ve,He[0].width,He[0].height);for(let ke=0,Ye=He.length;ke<Ye;ke++)Ae=He[ke],Le?mt&&t.texSubImage2D(n.TEXTURE_2D,ke,0,0,Ae.width,Ae.height,k,Ce,Ae.data):t.texImage2D(n.TEXTURE_2D,ke,ve,Ae.width,Ae.height,0,k,Ce,Ae.data);y.generateMipmaps=!1}else Le?(pt&&t.texStorage2D(n.TEXTURE_2D,Rt,ve,Pe.width,Pe.height),mt&&ae(y,Pe,k,Ce)):t.texImage2D(n.TEXTURE_2D,0,ve,Pe.width,Pe.height,0,k,Ce,Pe.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Le&&pt&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Rt,ve,He[0].width,He[0].height,Pe.depth);for(let ke=0,Ye=He.length;ke<Ye;ke++)if(Ae=He[ke],y.format!==zi)if(k!==null)if(Le){if(mt)if(y.layerUpdates.size>0){const xt=ad(Ae.width,Ae.height,y.format,y.type);for(const Me of y.layerUpdates){const Ie=Ae.data.subarray(Me*xt/Ae.data.BYTES_PER_ELEMENT,(Me+1)*xt/Ae.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ke,0,0,Me,Ae.width,Ae.height,1,k,Ie)}y.clearLayerUpdates()}else t.compressedTexSubImage3D(n.TEXTURE_2D_ARRAY,ke,0,0,0,Ae.width,Ae.height,Pe.depth,k,Ae.data)}else t.compressedTexImage3D(n.TEXTURE_2D_ARRAY,ke,ve,Ae.width,Ae.height,Pe.depth,0,Ae.data,0,0);else Mt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Le?mt&&t.texSubImage3D(n.TEXTURE_2D_ARRAY,ke,0,0,0,Ae.width,Ae.height,Pe.depth,k,Ce,Ae.data):t.texImage3D(n.TEXTURE_2D_ARRAY,ke,ve,Ae.width,Ae.height,Pe.depth,0,k,Ce,Ae.data)}else{Le&&pt&&t.texStorage2D(n.TEXTURE_2D,Rt,ve,He[0].width,He[0].height);for(let ke=0,Ye=He.length;ke<Ye;ke++)Ae=He[ke],y.format!==zi?k!==null?Le?mt&&t.compressedTexSubImage2D(n.TEXTURE_2D,ke,0,0,Ae.width,Ae.height,k,Ae.data):t.compressedTexImage2D(n.TEXTURE_2D,ke,ve,Ae.width,Ae.height,0,Ae.data):Mt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Le?mt&&t.texSubImage2D(n.TEXTURE_2D,ke,0,0,Ae.width,Ae.height,k,Ce,Ae.data):t.texImage2D(n.TEXTURE_2D,ke,ve,Ae.width,Ae.height,0,k,Ce,Ae.data)}else if(y.isDataArrayTexture)if(Le){if(pt&&t.texStorage3D(n.TEXTURE_2D_ARRAY,Rt,ve,Pe.width,Pe.height,Pe.depth),mt)if(y.layerUpdates.size>0){const ke=ad(Pe.width,Pe.height,y.format,y.type);for(const Ye of y.layerUpdates){const xt=Pe.data.subarray(Ye*ke/Pe.data.BYTES_PER_ELEMENT,(Ye+1)*ke/Pe.data.BYTES_PER_ELEMENT);t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,Ye,Pe.width,Pe.height,1,k,Ce,xt)}y.clearLayerUpdates()}else t.texSubImage3D(n.TEXTURE_2D_ARRAY,0,0,0,0,Pe.width,Pe.height,Pe.depth,k,Ce,Pe.data)}else t.texImage3D(n.TEXTURE_2D_ARRAY,0,ve,Pe.width,Pe.height,Pe.depth,0,k,Ce,Pe.data);else if(y.isData3DTexture)Le?(pt&&t.texStorage3D(n.TEXTURE_3D,Rt,ve,Pe.width,Pe.height,Pe.depth),mt&&t.texSubImage3D(n.TEXTURE_3D,0,0,0,0,Pe.width,Pe.height,Pe.depth,k,Ce,Pe.data)):t.texImage3D(n.TEXTURE_3D,0,ve,Pe.width,Pe.height,Pe.depth,0,k,Ce,Pe.data);else if(y.isFramebufferTexture){if(pt)if(Le)t.texStorage2D(n.TEXTURE_2D,Rt,ve,Pe.width,Pe.height);else{let ke=Pe.width,Ye=Pe.height;for(let xt=0;xt<Rt;xt++)t.texImage2D(n.TEXTURE_2D,xt,ve,ke,Ye,0,k,Ce,null),ke>>=1,Ye>>=1}}else if(He.length>0){if(Le&&pt){const ke=se(He[0]);t.texStorage2D(n.TEXTURE_2D,Rt,ve,ke.width,ke.height)}for(let ke=0,Ye=He.length;ke<Ye;ke++)Ae=He[ke],Le?mt&&t.texSubImage2D(n.TEXTURE_2D,ke,0,0,k,Ce,Ae):t.texImage2D(n.TEXTURE_2D,ke,ve,k,Ce,Ae);y.generateMipmaps=!1}else if(Le){if(pt){const ke=se(Pe);t.texStorage2D(n.TEXTURE_2D,Rt,ve,ke.width,ke.height)}mt&&t.texSubImage2D(n.TEXTURE_2D,0,0,0,k,Ce,Pe)}else t.texImage2D(n.TEXTURE_2D,0,ve,k,Ce,Pe);_(y)&&b(j),Se.__version=X.version,y.onUpdate&&y.onUpdate(y)}return A.__version=y.version,!0}function J(A,y,O){if(y.image.length!==6)return;const j=K(A,y),le=y.source;t.bindTexture(n.TEXTURE_CUBE_MAP,A.__webglTexture,n.TEXTURE0+O);const X=i.get(le);if(le.version!==X.__version||j===!0){t.activeTexture(n.TEXTURE0+O);const Se=tn.getPrimaries(tn.workingColorSpace),Te=y.colorSpace===Zs?null:tn.getPrimaries(y.colorSpace),Fe=y.colorSpace===Zs||Se===Te?n.NONE:n.BROWSER_DEFAULT_WEBGL;n.pixelStorei(n.UNPACK_FLIP_Y_WEBGL,y.flipY),n.pixelStorei(n.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),n.pixelStorei(n.UNPACK_ALIGNMENT,y.unpackAlignment),n.pixelStorei(n.UNPACK_COLORSPACE_CONVERSION_WEBGL,Fe);const at=y.isCompressedTexture||y.image[0].isCompressedTexture,Pe=y.image[0]&&y.image[0].isDataTexture,k=[];for(let Ye=0;Ye<6;Ye++)!at&&!Pe?k[Ye]=M(y.image[Ye],!0,s.maxCubemapSize):k[Ye]=Pe?y.image[Ye].image:y.image[Ye],k[Ye]=it(y,k[Ye]);const Ce=k[0],ve=r.convert(y.format,y.colorSpace),Ae=r.convert(y.type),He=v(y.internalFormat,ve,Ae,y.colorSpace),Le=y.isVideoTexture!==!0,pt=X.__version===void 0||j===!0,mt=le.dataReady;let Rt=R(y,Ce);ne(n.TEXTURE_CUBE_MAP,y);let ke;if(at){Le&&pt&&t.texStorage2D(n.TEXTURE_CUBE_MAP,Rt,He,Ce.width,Ce.height);for(let Ye=0;Ye<6;Ye++){ke=k[Ye].mipmaps;for(let xt=0;xt<ke.length;xt++){const Me=ke[xt];y.format!==zi?ve!==null?Le?mt&&t.compressedTexSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt,0,0,Me.width,Me.height,ve,Me.data):t.compressedTexImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt,He,Me.width,Me.height,0,Me.data):Mt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):Le?mt&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt,0,0,Me.width,Me.height,ve,Ae,Me.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt,He,Me.width,Me.height,0,ve,Ae,Me.data)}}}else{if(ke=y.mipmaps,Le&&pt){ke.length>0&&Rt++;const Ye=se(k[0]);t.texStorage2D(n.TEXTURE_CUBE_MAP,Rt,He,Ye.width,Ye.height)}for(let Ye=0;Ye<6;Ye++)if(Pe){Le?mt&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,0,0,0,k[Ye].width,k[Ye].height,ve,Ae,k[Ye].data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,0,He,k[Ye].width,k[Ye].height,0,ve,Ae,k[Ye].data);for(let xt=0;xt<ke.length;xt++){const Ie=ke[xt].image[Ye].image;Le?mt&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt+1,0,0,Ie.width,Ie.height,ve,Ae,Ie.data):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt+1,He,Ie.width,Ie.height,0,ve,Ae,Ie.data)}}else{Le?mt&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,0,0,0,ve,Ae,k[Ye]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,0,He,ve,Ae,k[Ye]);for(let xt=0;xt<ke.length;xt++){const Me=ke[xt];Le?mt&&t.texSubImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt+1,0,0,ve,Ae,Me.image[Ye]):t.texImage2D(n.TEXTURE_CUBE_MAP_POSITIVE_X+Ye,xt+1,He,ve,Ae,Me.image[Ye])}}}_(y)&&b(n.TEXTURE_CUBE_MAP),X.__version=le.version,y.onUpdate&&y.onUpdate(y)}A.__version=y.version}function me(A,y,O,j,le,X){const Se=r.convert(O.format,O.colorSpace),Te=r.convert(O.type),Fe=v(O.internalFormat,Se,Te,O.colorSpace),at=i.get(y),Pe=i.get(O);if(Pe.__renderTarget=y,!at.__hasExternalTextures){const Ce=Math.max(1,y.width>>X),ve=Math.max(1,y.height>>X);y.isWebGLMultiviewRenderTarget===!0?t.texStorage3D(n.TEXTURE_2D_ARRAY,0,Fe,y.width,y.height,y.numViews):le===n.TEXTURE_3D||le===n.TEXTURE_2D_ARRAY?t.texImage3D(le,X,Fe,Ce,ve,y.depth,0,Se,Te,null):t.texImage2D(le,X,Fe,Ce,ve,0,Se,Te,null)}t.bindFramebuffer(n.FRAMEBUFFER,A);const k=ze(y);y.isWebGLMultiviewRenderTarget===!0?k?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,Pe.__webglTexture,0,Ee(y),0,y.numViews):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0,Pe.__webglTexture,0,0,y.numViews):(le===n.TEXTURE_2D||le>=n.TEXTURE_CUBE_MAP_POSITIVE_X&&le<=n.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&(k?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,j,le,Pe.__webglTexture,0,Ee(y)):n.framebufferTexture2D(n.FRAMEBUFFER,j,le,Pe.__webglTexture,X)),t.bindFramebuffer(n.FRAMEBUFFER,null)}function U(A,y,O){if(n.bindRenderbuffer(n.RENDERBUFFER,A),y.isWebGLMultiviewRenderTarget===!0){const j=ze(y),le=y.numViews,X=y.depthTexture;let Se=n.DEPTH_COMPONENT24,Te=n.DEPTH_ATTACHMENT;X&&X.isDepthTexture&&(X.type===ji?Se=n.DEPTH_COMPONENT32F:X.type===eo&&(Se=n.DEPTH24_STENCIL8,Te=n.DEPTH_STENCIL_ATTACHMENT));let Fe=i.get(y.depthTexture).__webglTexture;Fe===void 0&&(Fe=n.createTexture(),n.bindTexture(n.TEXTURE_2D_ARRAY,Fe),n.texStorage3D(n.TEXTURE_2D_ARRAY,1,Se,y.width,y.height,le)),j?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,Te,Fe,0,Ee(y),0,le):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,Te,Fe,0,0,le)}else if(y.depthBuffer){const j=y.depthTexture,le=j&&j.isDepthTexture?j.type:null,X=E(y.stencilBuffer,le),Se=y.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Te=Ee(y);ze(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,Te,X,y.width,y.height):O?n.renderbufferStorageMultisample(n.RENDERBUFFER,Te,X,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,X,y.width,y.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,Se,n.RENDERBUFFER,A)}else{const j=y.textures;for(let le=0;le<j.length;le++){const X=j[le],Se=r.convert(X.format,X.colorSpace),Te=r.convert(X.type),Fe=v(X.internalFormat,Se,Te,X.colorSpace),at=Ee(y);O&&ze(y)===!1?n.renderbufferStorageMultisample(n.RENDERBUFFER,at,Fe,y.width,y.height):ze(y)?a.renderbufferStorageMultisampleEXT(n.RENDERBUFFER,at,Fe,y.width,y.height):n.renderbufferStorage(n.RENDERBUFFER,Fe,y.width,y.height)}}n.bindRenderbuffer(n.RENDERBUFFER,null)}function ee(A,y){if(y&&y.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(n.FRAMEBUFFER,A),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const j=i.get(y.depthTexture);j.__renderTarget=y,(!j.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),y.depthTexture.image.depth!=1?Y(y.depthTexture,0):G(y.depthTexture,0);const le=j.__webglTexture,X=Ee(y);if(y.isWebGLMultiviewRenderTarget===!0){const Se=ze(y),Te=y.numViews;if(y.depthTexture.format===ho)Se?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,le,0,X,0,Te):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,le,0,0,Te);else if(y.depthTexture.format===to)Se?c.framebufferTextureMultisampleMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,le,0,X,0,Te):c.framebufferTextureMultiviewOVR(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,le,0,0,Te);else throw new Error("Unknown depthTexture format")}else if(y.depthTexture.format===ho)ze(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,le,0,X):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_ATTACHMENT,n.TEXTURE_2D,le,0);else if(y.depthTexture.format===to)ze(y)?a.framebufferTexture2DMultisampleEXT(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,le,0,X):n.framebufferTexture2D(n.FRAMEBUFFER,n.DEPTH_STENCIL_ATTACHMENT,n.TEXTURE_2D,le,0);else throw new Error("Unknown depthTexture format")}function P(A){const y=i.get(A),O=A.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==A.depthTexture){const j=A.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),j){const le=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,j.removeEventListener("dispose",le)};j.addEventListener("dispose",le),y.__depthDisposeCallback=le}y.__boundDepthTexture=j}if(A.depthTexture&&!y.__autoAllocateDepthBuffer){if(O)throw new Error("target.depthTexture not supported in Cube render targets");const j=A.texture.mipmaps;j&&j.length>0?ee(y.__webglFramebuffer[0],A):ee(y.__webglFramebuffer,A)}else if(O){y.__webglDepthbuffer=[];for(let j=0;j<6;j++)if(t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[j]),y.__webglDepthbuffer[j]===void 0)y.__webglDepthbuffer[j]=n.createRenderbuffer(),U(y.__webglDepthbuffer[j],A,!1);else{const le=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,X=y.__webglDepthbuffer[j];n.bindRenderbuffer(n.RENDERBUFFER,X),n.framebufferRenderbuffer(n.FRAMEBUFFER,le,n.RENDERBUFFER,X)}}else{const j=A.texture.mipmaps;if(j&&j.length>0?t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer[0]):t.bindFramebuffer(n.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=n.createRenderbuffer(),U(y.__webglDepthbuffer,A,!1);else{const le=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,X=y.__webglDepthbuffer;n.bindRenderbuffer(n.RENDERBUFFER,X),n.framebufferRenderbuffer(n.FRAMEBUFFER,le,n.RENDERBUFFER,X)}}t.bindFramebuffer(n.FRAMEBUFFER,null)}function ie(A,y,O){const j=i.get(A);y!==void 0&&me(j.__webglFramebuffer,A,A.texture,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,0),O!==void 0&&P(A)}function _e(A){const y=A.texture,O=i.get(A),j=i.get(y);A.addEventListener("dispose",T);const le=A.textures,X=A.isWebGLCubeRenderTarget===!0,Se=le.length>1;if(Se||(j.__webglTexture===void 0&&(j.__webglTexture=n.createTexture()),j.__version=y.version,o.memory.textures++),X){O.__webglFramebuffer=[];for(let Te=0;Te<6;Te++)if(y.mipmaps&&y.mipmaps.length>0){O.__webglFramebuffer[Te]=[];for(let Fe=0;Fe<y.mipmaps.length;Fe++)O.__webglFramebuffer[Te][Fe]=n.createFramebuffer()}else O.__webglFramebuffer[Te]=n.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){O.__webglFramebuffer=[];for(let Te=0;Te<y.mipmaps.length;Te++)O.__webglFramebuffer[Te]=n.createFramebuffer()}else O.__webglFramebuffer=n.createFramebuffer();if(Se)for(let Te=0,Fe=le.length;Te<Fe;Te++){const at=i.get(le[Te]);at.__webglTexture===void 0&&(at.__webglTexture=n.createTexture(),o.memory.textures++)}if(A.samples>0&&ze(A)===!1){O.__webglMultisampledFramebuffer=n.createFramebuffer(),O.__webglColorRenderbuffer=[],t.bindFramebuffer(n.FRAMEBUFFER,O.__webglMultisampledFramebuffer);for(let Te=0;Te<le.length;Te++){const Fe=le[Te];O.__webglColorRenderbuffer[Te]=n.createRenderbuffer(),n.bindRenderbuffer(n.RENDERBUFFER,O.__webglColorRenderbuffer[Te]);const at=r.convert(Fe.format,Fe.colorSpace),Pe=r.convert(Fe.type),k=v(Fe.internalFormat,at,Pe,Fe.colorSpace,A.isXRRenderTarget===!0),Ce=Ee(A);n.renderbufferStorageMultisample(n.RENDERBUFFER,Ce,k,A.width,A.height),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+Te,n.RENDERBUFFER,O.__webglColorRenderbuffer[Te])}n.bindRenderbuffer(n.RENDERBUFFER,null),A.depthBuffer&&(O.__webglDepthRenderbuffer=n.createRenderbuffer(),U(O.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(n.FRAMEBUFFER,null)}}if(X){t.bindTexture(n.TEXTURE_CUBE_MAP,j.__webglTexture),ne(n.TEXTURE_CUBE_MAP,y);for(let Te=0;Te<6;Te++)if(y.mipmaps&&y.mipmaps.length>0)for(let Fe=0;Fe<y.mipmaps.length;Fe++)me(O.__webglFramebuffer[Te][Fe],A,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Te,Fe);else me(O.__webglFramebuffer[Te],A,y,n.COLOR_ATTACHMENT0,n.TEXTURE_CUBE_MAP_POSITIVE_X+Te,0);_(y)&&b(n.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(Se){for(let Te=0,Fe=le.length;Te<Fe;Te++){const at=le[Te],Pe=i.get(at);let k=n.TEXTURE_2D;(A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(k=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),t.bindTexture(k,Pe.__webglTexture),ne(k,at),me(O.__webglFramebuffer,A,at,n.COLOR_ATTACHMENT0+Te,k,0),_(at)&&b(k)}t.unbindTexture()}else{let Te=n.TEXTURE_2D;if((A.isWebGL3DRenderTarget||A.isWebGLArrayRenderTarget)&&(Te=A.isWebGL3DRenderTarget?n.TEXTURE_3D:n.TEXTURE_2D_ARRAY),A.isWebGLMultiviewRenderTarget===!0&&(Te=n.TEXTURE_2D_ARRAY),t.bindTexture(Te,j.__webglTexture),ne(Te,y),y.mipmaps&&y.mipmaps.length>0)for(let Fe=0;Fe<y.mipmaps.length;Fe++)me(O.__webglFramebuffer[Fe],A,y,n.COLOR_ATTACHMENT0,Te,Fe);else me(O.__webglFramebuffer,A,y,n.COLOR_ATTACHMENT0,Te,0);_(y)&&b(Te),t.unbindTexture()}(A.depthBuffer||A.isWebGLMultiviewRenderTarget===!0)&&this.setupDepthRenderbuffer(A)}function xe(A){const y=A.textures;for(let O=0,j=y.length;O<j;O++){const le=y[O];if(_(le)){const X=S(A),Se=i.get(le).__webglTexture;t.bindTexture(X,Se),b(X),t.unbindTexture()}}}const Z=[],Re=[];function oe(A){if(A.samples>0){if(ze(A)===!1){const y=A.textures,O=A.width,j=A.height;let le=n.COLOR_BUFFER_BIT;const X=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT,Se=i.get(A),Te=y.length>1;if(Te)for(let at=0;at<y.length;at++)t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+at,n.RENDERBUFFER,null),t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+at,n.TEXTURE_2D,null,0);t.bindFramebuffer(n.READ_FRAMEBUFFER,Se.__webglMultisampledFramebuffer);const Fe=A.texture.mipmaps;Fe&&Fe.length>0?t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglFramebuffer[0]):t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglFramebuffer);for(let at=0;at<y.length;at++){if(A.resolveDepthBuffer&&(A.depthBuffer&&(le|=n.DEPTH_BUFFER_BIT),A.stencilBuffer&&A.resolveStencilBuffer&&(le|=n.STENCIL_BUFFER_BIT)),Te){n.framebufferRenderbuffer(n.READ_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.RENDERBUFFER,Se.__webglColorRenderbuffer[at]);const Pe=i.get(y[at]).__webglTexture;n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0,n.TEXTURE_2D,Pe,0)}n.blitFramebuffer(0,0,O,j,0,0,O,j,le,n.NEAREST),l===!0&&(Z.length=0,Re.length=0,Z.push(n.COLOR_ATTACHMENT0+at),A.depthBuffer&&A.resolveDepthBuffer===!1&&(Z.push(X),Re.push(X),n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,Re)),n.invalidateFramebuffer(n.READ_FRAMEBUFFER,Z))}if(t.bindFramebuffer(n.READ_FRAMEBUFFER,null),t.bindFramebuffer(n.DRAW_FRAMEBUFFER,null),Te)for(let at=0;at<y.length;at++){t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglMultisampledFramebuffer),n.framebufferRenderbuffer(n.FRAMEBUFFER,n.COLOR_ATTACHMENT0+at,n.RENDERBUFFER,Se.__webglColorRenderbuffer[at]);const Pe=i.get(y[at]).__webglTexture;t.bindFramebuffer(n.FRAMEBUFFER,Se.__webglFramebuffer),n.framebufferTexture2D(n.DRAW_FRAMEBUFFER,n.COLOR_ATTACHMENT0+at,n.TEXTURE_2D,Pe,0)}t.bindFramebuffer(n.DRAW_FRAMEBUFFER,Se.__webglMultisampledFramebuffer)}else if(A.depthBuffer&&A.resolveDepthBuffer===!1&&l){const y=A.stencilBuffer?n.DEPTH_STENCIL_ATTACHMENT:n.DEPTH_ATTACHMENT;n.invalidateFramebuffer(n.DRAW_FRAMEBUFFER,[y])}}}function Ee(A){return Math.min(s.maxSamples,A.samples)}function ze(A){const y=i.get(A);return A.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function Ve(A){const y=o.render.frame;f.get(A)!==y&&(f.set(A,y),A.update())}function it(A,y){const O=A.colorSpace,j=A.format,le=A.type;return A.isCompressedTexture===!0||A.isVideoTexture===!0||O!==uo&&O!==Zs&&(tn.getTransfer(O)===hn?(j!==zi||le!==ls)&&Mt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Rn("WebGLTextures: Unsupported texture color space:",O)),y}function se(A){return typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement?(u.width=A.naturalWidth||A.width,u.height=A.naturalHeight||A.height):typeof VideoFrame<"u"&&A instanceof VideoFrame?(u.width=A.displayWidth,u.height=A.displayHeight):(u.width=A.width,u.height=A.height),u}this.allocateTextureUnit=D,this.resetTextureUnits=W,this.setTexture2D=G,this.setTexture2DArray=Y,this.setTexture3D=N,this.setTextureCube=te,this.rebindTextures=ie,this.uploadTexture=de,this.setupRenderTarget=_e,this.updateRenderTargetMipmap=xe,this.updateMultisampleRenderTarget=oe,this.setupDepthTexture=ee,this.setupDepthRenderbuffer=P,this.setupFrameBufferTexture=me,this.useMultisampledRTT=ze,this.runDeferredUploads=H,this.setDeferTextureUploads=ge}function Jb(n,e){function t(i,s=Zs){let r;const o=tn.getTransfer(s);if(i===ls)return n.UNSIGNED_BYTE;if(i===Vh)return n.UNSIGNED_SHORT_4_4_4_4;if(i===Hh)return n.UNSIGNED_SHORT_5_5_5_1;if(i===Rf)return n.UNSIGNED_INT_5_9_9_9_REV;if(i===Cf)return n.UNSIGNED_INT_10F_11F_11F_REV;if(i===Tf)return n.BYTE;if(i===Af)return n.SHORT;if(i===na)return n.UNSIGNED_SHORT;if(i===Bh)return n.INT;if(i===_r)return n.UNSIGNED_INT;if(i===ji)return n.FLOAT;if(i===_o)return n.HALF_FLOAT;if(i===Lf)return n.ALPHA;if(i===Pf)return n.RGB;if(i===zi)return n.RGBA;if(i===ho)return n.DEPTH_COMPONENT;if(i===to)return n.DEPTH_STENCIL;if(i===Df)return n.RED;if(i===Gh)return n.RED_INTEGER;if(i===Wh)return n.RG;if(i===Xh)return n.RG_INTEGER;if(i===qh)return n.RGBA_INTEGER;if(i===rc||i===oc||i===ac||i===cc)if(o===hn)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===rc)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===oc)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===ac)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===cc)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===rc)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===oc)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===ac)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===cc)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Zl||i===Ql||i===Jl||i===eh)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Zl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Ql)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Jl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===eh)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===th||i===nh||i===ih)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(i===th||i===nh)return o===hn?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===ih)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC}else return null;if(i===sh||i===rh||i===oh||i===ah||i===ch||i===lh||i===hh||i===uh||i===dh||i===fh||i===ph||i===mh||i===gh||i===xh)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(i===sh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===rh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===oh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===ah)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===ch)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===lh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===hh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===uh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===dh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===fh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===ph)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===mh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===gh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===xh)return o===hn?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===_h||i===bh||i===Mh)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(i===_h)return o===hn?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===bh)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===Mh)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===vh||i===yh||i===Sh||i===Eh)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(i===vh)return r.COMPRESSED_RED_RGTC1_EXT;if(i===yh)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Sh)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===Eh)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===eo?n.UNSIGNED_INT_24_8:n[i]!==void 0?n[i]:null}return{convert:t}}class s0 extends ir{constructor(e,t,i,s={}){super(e,t,s),this.depthBuffer=!1,this.stencilBuffer=!1,this.numViews=i}copy(e){return super.copy(e),this.numViews=e.numViews,this}}s0.prototype.isWebGLMultiviewRenderTarget=!0;const eM=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,tM=`
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

}`;class nM{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){const i=new Kf(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=i}}getMesh(e){if(this.texture!==null&&this.mesh===null){const t=e.cameras[0].viewport,i=new Ns({vertexShader:eM,fragmentShader:tM,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Us(new Rc(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class iM extends Mr{constructor(e,t,i,s){super();const r=this;let o=null,a=1;var l=null;let c=null,u="local-floor",f=1,p=null,m=null;var g=[];let x=null,d=null,h=null,M=null;const _=typeof XRWebGLBinding<"u",b=new nM,S={},v=t.getContextAttributes();let E=null,R=null;const w=[],T=[],C=new Ot;let I=null;const F=new Yi;F.viewport=new Mn;const V=new Yi;V.viewport=new Mn;const W=[F,V],D=new Mg;let B=null,G=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.layersEnabled=!1,this.isPresenting=!1,this.isMultiview=!1,this.getCameraPose=function(){return m},this.getController=function(H){let de=w[H];return de===void 0&&(de=new ll,w[H]=de),de.getTargetRaySpace()},this.getControllerGrip=function(H){let de=w[H];return de===void 0&&(de=new ll,w[H]=de),de.getGripSpace()},this.getHand=function(H){let de=w[H];return de===void 0&&(de=new ll,w[H]=de),de.getHandSpace()};function Y(H){const de=T.indexOf(H.inputSource);if(de===-1)return;const J=w[de];J!==void 0&&(J.update(H.inputSource,H.frame,p||c),J.dispatchEvent({type:H.type,data:H.inputSource}))}function N(){o.removeEventListener("select",Y),o.removeEventListener("selectstart",Y),o.removeEventListener("selectend",Y),o.removeEventListener("squeeze",Y),o.removeEventListener("squeezestart",Y),o.removeEventListener("squeezeend",Y),o.removeEventListener("end",N),o.removeEventListener("inputsourceschange",te);for(let H=0;H<w.length;H++){const de=T[H];de!==null&&(T[H]=null,w[H].disconnect(de))}B=null,G=null,b.reset();for(const H in S)delete S[H];r.isPresenting=!1,e.setRenderTarget(E),h=null,d=null,x=null,o=null,R=null,ge.stop(),e.setPixelRatio(I),e.setSize(C.width,C.height,!1),r.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(H){a=H,r.isPresenting===!0&&Mt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(H){u=H,r.isPresenting===!0&&Mt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return p||c},this.setReferenceSpace=function(H){p=H},this.getBaseLayer=function(){return d!==null?d:h},this.getBinding=function(){return x===null&&_&&(x=new XRWebGLBinding(o,t)),x},this.getFrame=function(){return M},this.getRenderTarget=function(){return R},this.getSession=function(){return o},this.setSession=async function(H){if(o=H,o!==null){if(E=e.getRenderTarget(),o.addEventListener("select",Y),o.addEventListener("selectstart",Y),o.addEventListener("selectend",Y),o.addEventListener("squeeze",Y),o.addEventListener("squeezestart",Y),o.addEventListener("squeezeend",Y),o.addEventListener("end",N),o.addEventListener("inputsourceschange",te),v.xrCompatible!==!0&&await t.makeXRCompatible(),I=e.getPixelRatio(),e.getSize(C),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let J=null,me=null,U=null;v.depth&&(U=v.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,J=v.stencil?to:ho,me=v.stencil?eo:_r),r.isMultiview=s&&i.has("OCULUS_multiview");const ee={colorFormat:t.RGBA8,depthFormat:U,scaleFactor:a};r.isMultiview&&(ee.textureType="texture-array"),x=this.getBinding(),d=x.createProjectionLayer(ee),o.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1);const P={format:zi,type:ls,depthTexture:new $f(d.textureWidth,d.textureHeight,me,void 0,void 0,void 0,void 0,void 0,void 0,J),stencilBuffer:v.stencil,colorSpace:e.outputColorSpace,samples:v.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1};if(r.isMultiview){const ie=i.get("OCULUS_multiview");this.maxNumViews=t.getParameter(ie.MAX_VIEWS_OVR),R=new s0(d.textureWidth,d.textureHeight,2,P)}else R=new ir(d.textureWidth,d.textureHeight,P)}else{const J={antialias:v.antialias,alpha:!0,depth:v.depth,stencil:v.stencil,framebufferScaleFactor:a};h=new XRWebGLLayer(o,t,J),o.updateRenderState({baseLayer:h}),e.setPixelRatio(1),e.setSize(h.framebufferWidth,h.framebufferHeight,!1),R=new ir(h.framebufferWidth,h.framebufferHeight,{format:zi,type:ls,colorSpace:e.outputColorSpace,stencilBuffer:v.stencil,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}R.isXRRenderTarget=!0,this.setFoveation(f),p=null,c=await o.requestReferenceSpace(u),ge.setContext(o),ge.start(),r.isPresenting=!0,r.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.addLayer=function(H){!window.XRWebGLBinding||!this.layersEnabled||!o||(g.push(H),this.updateLayers())},this.removeLayer=function(H){g.splice(g.indexOf(H),1),!(!window.XRWebGLBinding||!this.layersEnabled||!o)&&this.updateLayers()},this.updateLayers=function(){var H=g.map(function(de){return de});H.unshift(o.renderState.layers[0]),o.updateRenderState({layers:H})},this.getDepthTexture=function(){return b.getDepthTexture()};function te(H){for(let de=0;de<H.removed.length;de++){const J=H.removed[de],me=T.indexOf(J);me>=0&&(T[me]=null,w[me].disconnect(J))}for(let de=0;de<H.added.length;de++){const J=H.added[de];let me=T.indexOf(J);if(me===-1){for(let ee=0;ee<w.length;ee++)if(ee>=T.length){T.push(J),me=ee;break}else if(T[ee]===null){T[ee]=J,me=ee;break}if(me===-1)break}const U=w[me];U&&U.connect(J)}}const q=new ue,fe=new ue;function re(H,de,J){q.setFromMatrixPosition(de.matrixWorld),fe.setFromMatrixPosition(J.matrixWorld);const me=q.distanceTo(fe),U=de.projectionMatrix.elements,ee=J.projectionMatrix.elements,P=U[14]/(U[10]-1),ie=U[14]/(U[10]+1),_e=(U[9]+1)/U[5],xe=(U[9]-1)/U[5],Z=(U[8]-1)/U[0],Re=(ee[8]+1)/ee[0],oe=P*Z,Ee=P*Re,ze=me/(-Z+Re),Ve=ze*-Z;if(de.matrixWorld.decompose(H.position,H.quaternion,H.scale),H.translateX(Ve),H.translateZ(ze),H.matrixWorld.compose(H.position,H.quaternion,H.scale),H.matrixWorldInverse.copy(H.matrixWorld).invert(),U[10]===-1)H.projectionMatrix.copy(de.projectionMatrix),H.projectionMatrixInverse.copy(de.projectionMatrixInverse);else{const it=P+ze,se=ie+ze,A=oe-Ve,y=Ee+(me-Ve),O=_e*ie/se*it,j=xe*ie/se*it;H.projectionMatrix.makePerspective(A,y,O,j,it,se),H.projectionMatrixInverse.copy(H.projectionMatrix).invert()}}function ne(H,de){de===null?H.matrixWorld.copy(H.matrix):H.matrixWorld.multiplyMatrices(de.matrixWorld,H.matrix),H.matrixWorldInverse.copy(H.matrixWorld).invert()}this.setPoseTarget=function(H){H!==void 0&&(l=H)},this.updateCamera=function(H){if(o===null)return;let de=H.near,J=H.far;b.texture!==null&&(b.depthNear>0&&(de=b.depthNear),b.depthFar>0&&(J=b.depthFar)),D.near=V.near=F.near=de,D.far=V.far=F.far=J,(B!==D.near||G!==D.far)&&(o.updateRenderState({depthNear:D.near,depthFar:D.far}),B=D.near,G=D.far),D.layers.mask=H.layers.mask|6,F.layers.mask=D.layers.mask&3,V.layers.mask=D.layers.mask&5;const me=D.cameras;var U=l||H;const ee=U.parent;ne(D,ee);for(let P=0;P<me.length;P++)ne(me[P],ee);me.length===2?re(D,F,V):D.projectionMatrix.copy(F.projectionMatrix),K(H,D,U)};function K(H,de,J){de.matrixWorld.decompose(de.position,de.quaternion,de.scale),J.parent===null?J.matrix.copy(de.matrixWorld):(J.matrix.copy(J.parent.matrixWorld),J.matrix.invert(),J.matrix.multiply(de.matrixWorld)),J.matrix.decompose(J.position,J.quaternion,J.scale),J.updateMatrixWorld(!0),H.projectionMatrix.copy(de.projectionMatrix),H.projectionMatrixInverse.copy(de.projectionMatrixInverse),H.isPerspectiveCamera&&(H.fov=sa*2*Math.atan(1/H.projectionMatrix.elements[5]),H.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(d===null&&h===null))return f},this.setFoveation=function(H){f=H,d!==null&&(d.fixedFoveation=H),h!==null&&h.fixedFoveation!==void 0&&(h.fixedFoveation=H)},this.hasDepthSensing=function(){return b.texture!==null},this.getDepthSensingMesh=function(){return b.getMesh(D)},this.getCameraTexture=function(H){return S[H]};let he=null;function ae(H,de){if(m=de.getViewerPose(p||c),M=de,m!==null){const J=m.views;h!==null&&(e.setRenderTargetFramebuffer(R,h.framebuffer),e.setRenderTarget(R));let me=!1;J.length!==D.cameras.length&&(D.cameras.length=0,me=!0);for(let ie=0;ie<J.length;ie++){const _e=J[ie];let xe=null;if(h!==null)xe=h.getViewport(_e);else{const Re=x.getViewSubImage(d,_e);xe=Re.viewport,ie===0&&(e.setRenderTargetTextures(R,Re.colorTexture,Re.depthStencilTexture),e.setRenderTarget(R))}let Z=W[ie];Z===void 0&&(Z=new Yi,Z.layers.enable(ie),Z.viewport=new Mn,W[ie]=Z),Z.matrix.fromArray(_e.transform.matrix),Z.matrix.decompose(Z.position,Z.quaternion,Z.scale),Z.projectionMatrix.fromArray(_e.projectionMatrix),Z.projectionMatrixInverse.copy(Z.projectionMatrix).invert(),Z.viewport.set(xe.x,xe.y,xe.width,xe.height),ie===0&&(D.matrix.copy(Z.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),me===!0&&D.cameras.push(Z)}const U=o.enabledFeatures;if(U&&U.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&_){x=r.getBinding();const ie=x.getDepthInformation(J[0]);ie&&ie.isValid&&ie.texture&&b.init(ie,o.renderState)}if(U&&U.includes("camera-access")&&_){e.state.unbindTexture(),x=r.getBinding();for(let ie=0;ie<J.length;ie++){const _e=J[ie].camera;if(_e){let xe=S[_e];xe||(xe=new Kf,S[_e]=xe);const Z=x.getCameraImage(_e);xe.sourceTexture=Z}}}}for(let J=0;J<w.length;J++){const me=T[J],U=w[J];me!==null&&U!==void 0&&U.update(me,de,p||c)}he&&he(H,de),de.detectedPlanes&&r.dispatchEvent({type:"planesdetected",data:de}),M=null}const ge=new Jf;ge.setAnimationLoop(ae),this.setAnimationLoop=function(H){he=H},this.dispose=function(){}}}const hr=new hs,sM=new Ht;function rM(n,e){function t(d,h){d.matrixAutoUpdate===!0&&d.updateMatrix(),h.value.copy(d.matrix)}function i(d,h){h.color.getRGB(d.fogColor.value,Gf(n)),h.isFog?(d.fogNear.value=h.near,d.fogFar.value=h.far):h.isFogExp2&&(d.fogDensity.value=h.density)}function s(d,h,M,_,b){h.isMeshBasicMaterial||h.isMeshLambertMaterial?r(d,h):h.isMeshToonMaterial?(r(d,h),f(d,h)):h.isMeshPhongMaterial?(r(d,h),u(d,h)):h.isMeshStandardMaterial?(r(d,h),p(d,h),h.isMeshPhysicalMaterial&&m(d,h,b)):h.isMeshMatcapMaterial?(r(d,h),g(d,h)):h.isMeshDepthMaterial?r(d,h):h.isMeshDistanceMaterial?(r(d,h),x(d,h)):h.isMeshNormalMaterial?r(d,h):h.isLineBasicMaterial?(o(d,h),h.isLineDashedMaterial&&a(d,h)):h.isPointsMaterial?l(d,h,M,_):h.isSpriteMaterial?c(d,h):h.isShadowMaterial?(d.color.value.copy(h.color),d.opacity.value=h.opacity):h.isShaderMaterial&&(h.uniformsNeedUpdate=!1)}function r(d,h){d.opacity.value=h.opacity,h.color&&d.diffuse.value.copy(h.color),h.emissive&&d.emissive.value.copy(h.emissive).multiplyScalar(h.emissiveIntensity),h.map&&(d.map.value=h.map,t(h.map,d.mapTransform)),h.alphaMap&&(d.alphaMap.value=h.alphaMap,t(h.alphaMap,d.alphaMapTransform)),h.bumpMap&&(d.bumpMap.value=h.bumpMap,t(h.bumpMap,d.bumpMapTransform),d.bumpScale.value=h.bumpScale,h.side===gi&&(d.bumpScale.value*=-1)),h.normalMap&&(d.normalMap.value=h.normalMap,t(h.normalMap,d.normalMapTransform),d.normalScale.value.copy(h.normalScale),h.side===gi&&d.normalScale.value.negate()),h.displacementMap&&(d.displacementMap.value=h.displacementMap,t(h.displacementMap,d.displacementMapTransform),d.displacementScale.value=h.displacementScale,d.displacementBias.value=h.displacementBias),h.emissiveMap&&(d.emissiveMap.value=h.emissiveMap,t(h.emissiveMap,d.emissiveMapTransform)),h.specularMap&&(d.specularMap.value=h.specularMap,t(h.specularMap,d.specularMapTransform)),h.alphaTest>0&&(d.alphaTest.value=h.alphaTest);const M=e.get(h),_=M.envMap,b=M.envMapRotation;_&&(d.envMap.value=_,hr.copy(b),hr.x*=-1,hr.y*=-1,hr.z*=-1,_.isCubeTexture&&_.isRenderTargetTexture===!1&&(hr.y*=-1,hr.z*=-1),d.envMapRotation.value.setFromMatrix4(sM.makeRotationFromEuler(hr)),d.flipEnvMap.value=_.isCubeTexture&&_.isRenderTargetTexture===!1?-1:1,d.reflectivity.value=h.reflectivity,d.ior.value=h.ior,d.refractionRatio.value=h.refractionRatio),h.lightMap&&(d.lightMap.value=h.lightMap,d.lightMapIntensity.value=h.lightMapIntensity,t(h.lightMap,d.lightMapTransform)),h.aoMap&&(d.aoMap.value=h.aoMap,d.aoMapIntensity.value=h.aoMapIntensity,t(h.aoMap,d.aoMapTransform))}function o(d,h){d.diffuse.value.copy(h.color),d.opacity.value=h.opacity,h.map&&(d.map.value=h.map,t(h.map,d.mapTransform))}function a(d,h){d.dashSize.value=h.dashSize,d.totalSize.value=h.dashSize+h.gapSize,d.scale.value=h.scale}function l(d,h,M,_){d.diffuse.value.copy(h.color),d.opacity.value=h.opacity,d.size.value=h.size*M,d.scale.value=_*.5,h.map&&(d.map.value=h.map,t(h.map,d.uvTransform)),h.alphaMap&&(d.alphaMap.value=h.alphaMap,t(h.alphaMap,d.alphaMapTransform)),h.alphaTest>0&&(d.alphaTest.value=h.alphaTest)}function c(d,h){d.diffuse.value.copy(h.color),d.opacity.value=h.opacity,d.rotation.value=h.rotation,h.map&&(d.map.value=h.map,t(h.map,d.mapTransform)),h.alphaMap&&(d.alphaMap.value=h.alphaMap,t(h.alphaMap,d.alphaMapTransform)),h.alphaTest>0&&(d.alphaTest.value=h.alphaTest)}function u(d,h){d.specular.value.copy(h.specular),d.shininess.value=Math.max(h.shininess,1e-4)}function f(d,h){h.gradientMap&&(d.gradientMap.value=h.gradientMap)}function p(d,h){d.metalness.value=h.metalness,h.metalnessMap&&(d.metalnessMap.value=h.metalnessMap,t(h.metalnessMap,d.metalnessMapTransform)),d.roughness.value=h.roughness,h.roughnessMap&&(d.roughnessMap.value=h.roughnessMap,t(h.roughnessMap,d.roughnessMapTransform)),h.envMap&&(d.envMapIntensity.value=h.envMapIntensity)}function m(d,h,M){d.ior.value=h.ior,h.sheen>0&&(d.sheenColor.value.copy(h.sheenColor).multiplyScalar(h.sheen),d.sheenRoughness.value=h.sheenRoughness,h.sheenColorMap&&(d.sheenColorMap.value=h.sheenColorMap,t(h.sheenColorMap,d.sheenColorMapTransform)),h.sheenRoughnessMap&&(d.sheenRoughnessMap.value=h.sheenRoughnessMap,t(h.sheenRoughnessMap,d.sheenRoughnessMapTransform))),h.clearcoat>0&&(d.clearcoat.value=h.clearcoat,d.clearcoatRoughness.value=h.clearcoatRoughness,h.clearcoatMap&&(d.clearcoatMap.value=h.clearcoatMap,t(h.clearcoatMap,d.clearcoatMapTransform)),h.clearcoatRoughnessMap&&(d.clearcoatRoughnessMap.value=h.clearcoatRoughnessMap,t(h.clearcoatRoughnessMap,d.clearcoatRoughnessMapTransform)),h.clearcoatNormalMap&&(d.clearcoatNormalMap.value=h.clearcoatNormalMap,t(h.clearcoatNormalMap,d.clearcoatNormalMapTransform),d.clearcoatNormalScale.value.copy(h.clearcoatNormalScale),h.side===gi&&d.clearcoatNormalScale.value.negate())),h.dispersion>0&&(d.dispersion.value=h.dispersion),h.iridescence>0&&(d.iridescence.value=h.iridescence,d.iridescenceIOR.value=h.iridescenceIOR,d.iridescenceThicknessMinimum.value=h.iridescenceThicknessRange[0],d.iridescenceThicknessMaximum.value=h.iridescenceThicknessRange[1],h.iridescenceMap&&(d.iridescenceMap.value=h.iridescenceMap,t(h.iridescenceMap,d.iridescenceMapTransform)),h.iridescenceThicknessMap&&(d.iridescenceThicknessMap.value=h.iridescenceThicknessMap,t(h.iridescenceThicknessMap,d.iridescenceThicknessMapTransform))),h.transmission>0&&(d.transmission.value=h.transmission,d.transmissionSamplerMap.value=M.texture,d.transmissionSamplerSize.value.set(M.width,M.height),h.transmissionMap&&(d.transmissionMap.value=h.transmissionMap,t(h.transmissionMap,d.transmissionMapTransform)),d.thickness.value=h.thickness,h.thicknessMap&&(d.thicknessMap.value=h.thicknessMap,t(h.thicknessMap,d.thicknessMapTransform)),d.attenuationDistance.value=h.attenuationDistance,d.attenuationColor.value.copy(h.attenuationColor)),h.anisotropy>0&&(d.anisotropyVector.value.set(h.anisotropy*Math.cos(h.anisotropyRotation),h.anisotropy*Math.sin(h.anisotropyRotation)),h.anisotropyMap&&(d.anisotropyMap.value=h.anisotropyMap,t(h.anisotropyMap,d.anisotropyMapTransform))),d.specularIntensity.value=h.specularIntensity,d.specularColor.value.copy(h.specularColor),h.specularColorMap&&(d.specularColorMap.value=h.specularColorMap,t(h.specularColorMap,d.specularColorMapTransform)),h.specularIntensityMap&&(d.specularIntensityMap.value=h.specularIntensityMap,t(h.specularIntensityMap,d.specularIntensityMapTransform))}function g(d,h){h.matcap&&(d.matcap.value=h.matcap)}function x(d,h){const M=e.get(h).light;d.referencePosition.value.setFromMatrixPosition(M.matrixWorld),d.nearDistance.value=M.shadow.camera.near,d.farDistance.value=M.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:s}}function oM(n,e,t,i){let s={},r={},o=[];const a=n.getParameter(n.MAX_UNIFORM_BUFFER_BINDINGS);function l(M,_){const b=_.program;i.uniformBlockBinding(M,b)}function c(M,_){let b=s[M.id];b===void 0&&(g(M),b=u(M),s[M.id]=b,M.addEventListener("dispose",d));const S=_.program;i.updateUBOMapping(M,S);const v=e.render.frame;r[M.id]!==v&&(p(M),r[M.id]=v)}function u(M){const _=f();M.__bindingPointIndex=_;const b=n.createBuffer(),S=M.__size,v=M.usage;return n.bindBuffer(n.UNIFORM_BUFFER,b),n.bufferData(n.UNIFORM_BUFFER,S,v),n.bindBuffer(n.UNIFORM_BUFFER,null),n.bindBufferBase(n.UNIFORM_BUFFER,_,b),b}function f(){for(let M=0;M<a;M++)if(o.indexOf(M)===-1)return o.push(M),M;return Rn("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function p(M){const _=s[M.id],b=M.uniforms,S=M.__cache;n.bindBuffer(n.UNIFORM_BUFFER,_);for(let v=0,E=b.length;v<E;v++){const R=Array.isArray(b[v])?b[v]:[b[v]];for(let w=0,T=R.length;w<T;w++){const C=R[w];if(m(C,v,w,S)===!0){const I=C.__offset,F=Array.isArray(C.value)?C.value:[C.value];let V=0;for(let W=0;W<F.length;W++){const D=F[W],B=x(D);typeof D=="number"||typeof D=="boolean"?(C.__data[0]=D,n.bufferSubData(n.UNIFORM_BUFFER,I+V,C.__data)):D.isMatrix3?(C.__data[0]=D.elements[0],C.__data[1]=D.elements[1],C.__data[2]=D.elements[2],C.__data[3]=0,C.__data[4]=D.elements[3],C.__data[5]=D.elements[4],C.__data[6]=D.elements[5],C.__data[7]=0,C.__data[8]=D.elements[6],C.__data[9]=D.elements[7],C.__data[10]=D.elements[8],C.__data[11]=0):(D.toArray(C.__data,V),V+=B.storage/Float32Array.BYTES_PER_ELEMENT)}n.bufferSubData(n.UNIFORM_BUFFER,I,C.__data)}}}n.bindBuffer(n.UNIFORM_BUFFER,null)}function m(M,_,b,S){const v=M.value,E=_+"_"+b;if(S[E]===void 0)return typeof v=="number"||typeof v=="boolean"?S[E]=v:S[E]=v.clone(),!0;{const R=S[E];if(typeof v=="number"||typeof v=="boolean"){if(R!==v)return S[E]=v,!0}else if(R.equals(v)===!1)return R.copy(v),!0}return!1}function g(M){const _=M.uniforms;let b=0;const S=16;for(let E=0,R=_.length;E<R;E++){const w=Array.isArray(_[E])?_[E]:[_[E]];for(let T=0,C=w.length;T<C;T++){const I=w[T],F=Array.isArray(I.value)?I.value:[I.value];for(let V=0,W=F.length;V<W;V++){const D=F[V],B=x(D),G=b%S,Y=G%B.boundary,N=G+Y;b+=Y,N!==0&&S-N<B.storage&&(b+=S-N),I.__data=new Float32Array(B.storage/Float32Array.BYTES_PER_ELEMENT),I.__offset=b,b+=B.storage}}}const v=b%S;return v>0&&(b+=S-v),M.__size=b,M.__cache={},this}function x(M){const _={boundary:0,storage:0};return typeof M=="number"||typeof M=="boolean"?(_.boundary=4,_.storage=4):M.isVector2?(_.boundary=8,_.storage=8):M.isVector3||M.isColor?(_.boundary=16,_.storage=12):M.isVector4?(_.boundary=16,_.storage=16):M.isMatrix3?(_.boundary=48,_.storage=48):M.isMatrix4?(_.boundary=64,_.storage=64):M.isTexture?Mt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):Mt("WebGLRenderer: Unsupported uniform value type.",M),_}function d(M){const _=M.target;_.removeEventListener("dispose",d);const b=o.indexOf(_.__bindingPointIndex);o.splice(b,1),n.deleteBuffer(s[_.id]),delete s[_.id],delete r[_.id]}function h(){for(const M in s)n.deleteBuffer(s[M]);o=[],s={},r={}}return{bind:l,update:c,dispose:h}}const aM=new Uint16Array([11481,15204,11534,15171,11808,15015,12385,14843,12894,14716,13396,14600,13693,14483,13976,14366,14237,14171,14405,13961,14511,13770,14605,13598,14687,13444,14760,13305,14822,13066,14876,12857,14923,12675,14963,12517,14997,12379,15025,12230,15049,12023,15070,11843,15086,11687,15100,11551,15111,11433,15120,11330,15127,11217,15132,11060,15135,10922,15138,10801,15139,10695,15139,10600,13012,14923,13020,14917,13064,14886,13176,14800,13349,14666,13513,14526,13724,14398,13960,14230,14200,14020,14383,13827,14488,13651,14583,13491,14667,13348,14740,13132,14803,12908,14856,12713,14901,12542,14938,12394,14968,12241,14992,12017,15010,11822,15024,11654,15034,11507,15041,11380,15044,11269,15044,11081,15042,10913,15037,10764,15031,10635,15023,10520,15014,10419,15003,10330,13657,14676,13658,14673,13670,14660,13698,14622,13750,14547,13834,14442,13956,14317,14112,14093,14291,13889,14407,13704,14499,13538,14586,13389,14664,13201,14733,12966,14792,12758,14842,12577,14882,12418,14915,12272,14940,12033,14959,11826,14972,11646,14980,11490,14983,11355,14983,11212,14979,11008,14971,10830,14961,10675,14950,10540,14936,10420,14923,10315,14909,10204,14894,10041,14089,14460,14090,14459,14096,14452,14112,14431,14141,14388,14186,14305,14252,14130,14341,13941,14399,13756,14467,13585,14539,13430,14610,13272,14677,13026,14737,12808,14790,12617,14833,12449,14869,12303,14896,12065,14916,11845,14929,11655,14937,11490,14939,11347,14936,11184,14930,10970,14921,10783,14912,10621,14900,10480,14885,10356,14867,10247,14848,10062,14827,9894,14805,9745,14400,14208,14400,14206,14402,14198,14406,14174,14415,14122,14427,14035,14444,13913,14469,13767,14504,13613,14548,13463,14598,13324,14651,13082,14704,12858,14752,12658,14795,12483,14831,12330,14860,12106,14881,11875,14895,11675,14903,11501,14905,11351,14903,11178,14900,10953,14892,10757,14880,10589,14865,10442,14847,10313,14827,10162,14805,9965,14782,9792,14757,9642,14731,9507,14562,13883,14562,13883,14563,13877,14566,13862,14570,13830,14576,13773,14584,13689,14595,13582,14613,13461,14637,13336,14668,13120,14704,12897,14741,12695,14776,12516,14808,12358,14835,12150,14856,11910,14870,11701,14878,11519,14882,11361,14884,11187,14880,10951,14871,10748,14858,10572,14842,10418,14823,10286,14801,10099,14777,9897,14751,9722,14725,9567,14696,9430,14666,9309,14702,13604,14702,13604,14702,13600,14703,13591,14705,13570,14707,13533,14709,13477,14712,13400,14718,13305,14727,13106,14743,12907,14762,12716,14784,12539,14807,12380,14827,12190,14844,11943,14855,11727,14863,11539,14870,11376,14871,11204,14868,10960,14858,10748,14845,10565,14829,10406,14809,10269,14786,10058,14761,9852,14734,9671,14705,9512,14674,9374,14641,9253,14608,9076,14821,13366,14821,13365,14821,13364,14821,13358,14821,13344,14821,13320,14819,13252,14817,13145,14815,13011,14814,12858,14817,12698,14823,12539,14832,12389,14841,12214,14850,11968,14856,11750,14861,11558,14866,11390,14867,11226,14862,10972,14853,10754,14840,10565,14823,10401,14803,10259,14780,10032,14754,9820,14725,9635,14694,9473,14661,9333,14627,9203,14593,8988,14557,8798,14923,13014,14922,13014,14922,13012,14922,13004,14920,12987,14919,12957,14915,12907,14909,12834,14902,12738,14894,12623,14888,12498,14883,12370,14880,12203,14878,11970,14875,11759,14873,11569,14874,11401,14872,11243,14865,10986,14855,10762,14842,10568,14825,10401,14804,10255,14781,10017,14754,9799,14725,9611,14692,9445,14658,9301,14623,9139,14587,8920,14548,8729,14509,8562,15008,12672,15008,12672,15008,12671,15007,12667,15005,12656,15001,12637,14997,12605,14989,12556,14978,12490,14966,12407,14953,12313,14940,12136,14927,11934,14914,11742,14903,11563,14896,11401,14889,11247,14879,10992,14866,10767,14851,10570,14833,10400,14812,10252,14789,10007,14761,9784,14731,9592,14698,9424,14663,9279,14627,9088,14588,8868,14548,8676,14508,8508,14467,8360,15080,12386,15080,12386,15079,12385,15078,12383,15076,12378,15072,12367,15066,12347,15057,12315,15045,12253,15030,12138,15012,11998,14993,11845,14972,11685,14951,11530,14935,11383,14920,11228,14904,10981,14887,10762,14870,10567,14850,10397,14827,10248,14803,9997,14774,9771,14743,9578,14710,9407,14674,9259,14637,9048,14596,8826,14555,8632,14514,8464,14471,8317,14427,8182,15139,12008,15139,12008,15138,12008,15137,12007,15135,12003,15130,11990,15124,11969,15115,11929,15102,11872,15086,11794,15064,11693,15041,11581,15013,11459,14987,11336,14966,11170,14944,10944,14921,10738,14898,10552,14875,10387,14850,10239,14824,9983,14794,9758,14762,9563,14728,9392,14692,9244,14653,9014,14611,8791,14569,8597,14526,8427,14481,8281,14436,8110,14391,7885,15188,11617,15188,11617,15187,11617,15186,11618,15183,11617,15179,11612,15173,11601,15163,11581,15150,11546,15133,11495,15110,11427,15083,11346,15051,11246,15024,11057,14996,10868,14967,10687,14938,10517,14911,10362,14882,10206,14853,9956,14821,9737,14787,9543,14752,9375,14715,9228,14675,8980,14632,8760,14589,8565,14544,8395,14498,8248,14451,8049,14404,7824,14357,7630,15228,11298,15228,11298,15227,11299,15226,11301,15223,11303,15219,11302,15213,11299,15204,11290,15191,11271,15174,11217,15150,11129,15119,11015,15087,10886,15057,10744,15024,10599,14990,10455,14957,10318,14924,10143,14891,9911,14856,9701,14820,9516,14782,9352,14744,9200,14703,8946,14659,8725,14615,8533,14568,8366,14521,8220,14472,7992,14423,7770,14374,7578,14315,7408,15260,10819,15260,10819,15259,10822,15258,10826,15256,10832,15251,10836,15246,10841,15237,10838,15225,10821,15207,10788,15183,10734,15151,10660,15120,10571,15087,10469,15049,10359,15012,10249,14974,10041,14937,9837,14900,9647,14860,9475,14820,9320,14779,9147,14736,8902,14691,8688,14646,8499,14598,8335,14549,8189,14499,7940,14448,7720,14397,7529,14347,7363,14256,7218,15285,10410,15285,10411,15285,10413,15284,10418,15282,10425,15278,10434,15272,10442,15264,10449,15252,10445,15235,10433,15210,10403,15179,10358,15149,10301,15113,10218,15073,10059,15033,9894,14991,9726,14951,9565,14909,9413,14865,9273,14822,9073,14777,8845,14730,8641,14682,8459,14633,8300,14583,8129,14531,7883,14479,7670,14426,7482,14373,7321,14305,7176,14201,6939,15305,9939,15305,9940,15305,9945,15304,9955,15302,9967,15298,9989,15293,10010,15286,10033,15274,10044,15258,10045,15233,10022,15205,9975,15174,9903,15136,9808,15095,9697,15053,9578,15009,9451,14965,9327,14918,9198,14871,8973,14825,8766,14775,8579,14725,8408,14675,8259,14622,8058,14569,7821,14515,7615,14460,7435,14405,7276,14350,7108,14256,6866,14149,6653,15321,9444,15321,9445,15321,9448,15320,9458,15317,9470,15314,9490,15310,9515,15302,9540,15292,9562,15276,9579,15251,9577,15226,9559,15195,9519,15156,9463,15116,9389,15071,9304,15025,9208,14978,9023,14927,8838,14878,8661,14827,8496,14774,8344,14722,8206,14667,7973,14612,7749,14556,7555,14499,7382,14443,7229,14385,7025,14322,6791,14210,6588,14100,6409,15333,8920,15333,8921,15332,8927,15332,8943,15329,8965,15326,9002,15322,9048,15316,9106,15307,9162,15291,9204,15267,9221,15244,9221,15212,9196,15175,9134,15133,9043,15088,8930,15040,8801,14990,8665,14938,8526,14886,8391,14830,8261,14775,8087,14719,7866,14661,7664,14603,7482,14544,7322,14485,7178,14426,6936,14367,6713,14281,6517,14166,6348,14054,6198,15341,8360,15341,8361,15341,8366,15341,8379,15339,8399,15336,8431,15332,8473,15326,8527,15318,8585,15302,8632,15281,8670,15258,8690,15227,8690,15191,8664,15149,8612,15104,8543,15055,8456,15001,8360,14948,8259,14892,8122,14834,7923,14776,7734,14716,7558,14656,7397,14595,7250,14534,7070,14472,6835,14410,6628,14350,6443,14243,6283,14125,6135,14010,5889,15348,7715,15348,7717,15348,7725,15347,7745,15345,7780,15343,7836,15339,7905,15334,8e3,15326,8103,15310,8193,15293,8239,15270,8270,15240,8287,15204,8283,15163,8260,15118,8223,15067,8143,15014,8014,14958,7873,14899,7723,14839,7573,14778,7430,14715,7293,14652,7164,14588,6931,14524,6720,14460,6531,14396,6362,14330,6210,14207,6015,14086,5781,13969,5576,15352,7114,15352,7116,15352,7128,15352,7159,15350,7195,15348,7237,15345,7299,15340,7374,15332,7457,15317,7544,15301,7633,15280,7703,15251,7754,15216,7775,15176,7767,15131,7733,15079,7670,15026,7588,14967,7492,14906,7387,14844,7278,14779,7171,14714,6965,14648,6770,14581,6587,14515,6420,14448,6269,14382,6123,14299,5881,14172,5665,14049,5477,13929,5310,15355,6329,15355,6330,15355,6339,15355,6362,15353,6410,15351,6472,15349,6572,15344,6688,15337,6835,15323,6985,15309,7142,15287,7220,15260,7277,15226,7310,15188,7326,15142,7318,15090,7285,15036,7239,14976,7177,14914,7045,14849,6892,14782,6736,14714,6581,14645,6433,14576,6293,14506,6164,14438,5946,14369,5733,14270,5540,14140,5369,14014,5216,13892,5043,15357,5483,15357,5484,15357,5496,15357,5528,15356,5597,15354,5692,15351,5835,15347,6011,15339,6195,15328,6317,15314,6446,15293,6566,15268,6668,15235,6746,15197,6796,15152,6811,15101,6790,15046,6748,14985,6673,14921,6583,14854,6479,14785,6371,14714,6259,14643,6149,14571,5946,14499,5750,14428,5567,14358,5401,14242,5250,14109,5111,13980,4870,13856,4657,15359,4555,15359,4557,15358,4573,15358,4633,15357,4715,15355,4841,15353,5061,15349,5216,15342,5391,15331,5577,15318,5770,15299,5967,15274,6150,15243,6223,15206,6280,15161,6310,15111,6317,15055,6300,14994,6262,14928,6208,14860,6141,14788,5994,14715,5838,14641,5684,14566,5529,14492,5384,14418,5247,14346,5121,14216,4892,14079,4682,13948,4496,13822,4330,15359,3498,15359,3501,15359,3520,15359,3598,15358,3719,15356,3860,15355,4137,15351,4305,15344,4563,15334,4809,15321,5116,15303,5273,15280,5418,15250,5547,15214,5653,15170,5722,15120,5761,15064,5763,15002,5733,14935,5673,14865,5597,14792,5504,14716,5400,14640,5294,14563,5185,14486,5041,14410,4841,14335,4655,14191,4482,14051,4325,13918,4183,13790,4012,15360,2282,15360,2285,15360,2306,15360,2401,15359,2547,15357,2748,15355,3103,15352,3349,15345,3675,15336,4020,15324,4272,15307,4496,15285,4716,15255,4908,15220,5086,15178,5170,15128,5214,15072,5234,15010,5231,14943,5206,14871,5166,14796,5102,14718,4971,14639,4833,14559,4687,14480,4541,14402,4401,14315,4268,14167,4142,14025,3958,13888,3747,13759,3556,15360,923,15360,925,15360,946,15360,1052,15359,1214,15357,1494,15356,1892,15352,2274,15346,2663,15338,3099,15326,3393,15309,3679,15288,3980,15260,4183,15226,4325,15185,4437,15136,4517,15080,4570,15018,4591,14950,4581,14877,4545,14800,4485,14720,4411,14638,4325,14556,4231,14475,4136,14395,3988,14297,3803,14145,3628,13999,3465,13861,3314,13729,3177,15360,263,15360,264,15360,272,15360,325,15359,407,15358,548,15356,780,15352,1144,15347,1580,15339,2099,15328,2425,15312,2795,15292,3133,15264,3329,15232,3517,15191,3689,15143,3819,15088,3923,15025,3978,14956,3999,14882,3979,14804,3931,14722,3855,14639,3756,14554,3645,14470,3529,14388,3409,14279,3289,14124,3173,13975,3055,13834,2848,13701,2658,15360,49,15360,49,15360,52,15360,75,15359,111,15358,201,15356,283,15353,519,15348,726,15340,1045,15329,1415,15314,1795,15295,2173,15269,2410,15237,2649,15197,2866,15150,3054,15095,3140,15032,3196,14963,3228,14888,3236,14808,3224,14725,3191,14639,3146,14553,3088,14466,2976,14382,2836,14262,2692,14103,2549,13952,2409,13808,2278,13674,2154,15360,4,15360,4,15360,4,15360,13,15359,33,15358,59,15357,112,15353,199,15348,302,15341,456,15331,628,15316,827,15297,1082,15272,1332,15241,1601,15202,1851,15156,2069,15101,2172,15039,2256,14970,2314,14894,2348,14813,2358,14728,2344,14640,2311,14551,2263,14463,2203,14376,2133,14247,2059,14084,1915,13930,1761,13784,1609,13648,1464,15360,0,15360,0,15360,0,15360,3,15359,18,15358,26,15357,53,15354,80,15348,97,15341,165,15332,238,15318,326,15299,427,15275,529,15245,654,15207,771,15161,885,15108,994,15046,1089,14976,1170,14900,1229,14817,1266,14731,1284,14641,1282,14550,1260,14460,1223,14370,1174,14232,1116,14066,1050,13909,981,13761,910,13623,839]);let vs=null;function cM(){return vs===null&&(vs=new qf(aM,32,32,Wh,_o),vs.minFilter=ki,vs.magFilter=ki,vs.wrapS=As,vs.wrapT=As,vs.generateMipmaps=!1,vs.needsUpdate=!0),vs}class TS{constructor(e={}){const{canvas:t=_m(),context:i=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:p=!1,multiviewStereo:m=!1}=e;this.isWebGLRenderer=!0;let g;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");g=i.getContextAttributes().alpha}else g=o;const x=new Set([qh,Xh,Gh]),d=new Set([ls,_r,na,eo,Vh,Hh]),h=new Uint32Array(4),M=new Int32Array(4);let _=null,b=null;const S=[],v=[];this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=tr,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const E=this;let R=!1;this._outputColorSpace=Oi;let w=0,T=0,C=null,I=-1,F=null;const V=new Mn,W=new Mn;let D=null;const B=new Et(0);let G=0,Y=t.width,N=t.height,te=1,q=null,fe=null;const re=new Mn(0,0,Y,N),ne=new Mn(0,0,Y,N);let K=!1;const he=new $h;let ae=!1,ge=!1;const H=new Ht,de=new ue,J=new Mn,me={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let U=!1;function ee(){return C===null?te:1}let P=i;function ie(L,Q){return t.getContext(L,Q)}try{const L={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine","three.js r181"),t.addEventListener("webglcontextlost",pt,!1),t.addEventListener("webglcontextrestored",mt,!1),t.addEventListener("webglcontextcreationerror",Rt,!1),P===null){const Q="webgl2";if(P=ie(Q,L),P===null)throw ie(Q)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(L){throw L("WebGLRenderer: "+L.message),L}let _e,xe,Z,Re,oe,Ee,ze,Ve,it,se,A,y,O,j,le,X,Se,Te,Fe,at,Pe,k,Ce,ve,Ae;function He(){_e=new g_(P),_e.init(),Ce=new Jb(P,_e),xe=new a_(P,_e,e,Ce),Z=new Zb(P,_e),xe.reversedDepthBuffer&&p&&Z.buffers.depth.setReversed(!0),Re=new b_(P),oe=new kb,Ee=new Qb(P,_e,Z,oe,xe,Ce,Re),ze=new l_(E),Ve=new m_(E),it=new Sg(P),ve=new r_(P,it),se=new x_(P,it,Re,ve),A=new y_(P,se,it,Re),at=new M_(P,xe,Ee),X=new c_(oe),y=new Fb(E,ze,Ve,_e,xe,ve,X),O=new rM(E,oe),j=new Bb,le=new qb(_e),Fe=new s_(E,ze,Ve,Z,A,g,l),Te=new v_(E,_e,P),Se=new $b(E,A,xe),Ae=new oM(P,Re,xe,Z),Pe=new o_(P,_e,Re),k=new __(P,_e,Re),Re.programs=y.programs,E.capabilities=xe,E.extensions=_e,E.properties=oe,E.renderLists=j,E.shadowMap=Se,E.state=Z,E.info=Re}He();const Le=new iM(E,P,_e,m);this.xr=Le,this.getContext=function(){return P},this.getContextAttributes=function(){return P.getContextAttributes()},this.forceContextLoss=function(){const L=_e.get("WEBGL_lose_context");L&&L.loseContext()},this.forceContextRestore=function(){const L=_e.get("WEBGL_lose_context");L&&L.restoreContext()},this.getPixelRatio=function(){return te},this.setPixelRatio=function(L){L!==void 0&&(te=L,this.setSize(Y,N,!1))},this.getSize=function(L){return L.set(Y,N)},this.setSize=function(L,Q,pe=!0){if(Le.isPresenting){Mt("WebGLRenderer: Can't change size while VR device is presenting.");return}Y=L,N=Q,t.width=Math.floor(L*te),t.height=Math.floor(Q*te),pe===!0&&(t.style.width=L+"px",t.style.height=Q+"px"),this.setViewport(0,0,L,Q)},this.getDrawingBufferSize=function(L){return L.set(Y*te,N*te).floor()},this.setDrawingBufferSize=function(L,Q,pe){Y=L,N=Q,te=pe,t.width=Math.floor(L*pe),t.height=Math.floor(Q*pe),this.setViewport(0,0,L,Q)},this.getCurrentViewport=function(L){return L.copy(V)},this.getViewport=function(L){return L.copy(re)},this.setViewport=function(L,Q,pe,ce){L.isVector4?re.set(L.x,L.y,L.z,L.w):re.set(L,Q,pe,ce),Z.viewport(V.copy(re).multiplyScalar(te).round())},this.getScissor=function(L){return L.copy(ne)},this.setScissor=function(L,Q,pe,ce){L.isVector4?ne.set(L.x,L.y,L.z,L.w):ne.set(L,Q,pe,ce),Z.scissor(W.copy(ne).multiplyScalar(te).round())},this.getScissorTest=function(){return K},this.setScissorTest=function(L){Z.setScissorTest(K=L)},this.setOpaqueSort=function(L){q=L},this.setTransparentSort=function(L){fe=L},this.getClearColor=function(L){return L.copy(Fe.getClearColor())},this.setClearColor=function(){Fe.setClearColor(...arguments)},this.getClearAlpha=function(){return Fe.getClearAlpha()},this.setClearAlpha=function(){Fe.setClearAlpha(...arguments)},this.clear=function(L=!0,Q=!0,pe=!0){let ce=0;if(L){let $=!1;if(C!==null){const Ue=C.texture.format;$=x.has(Ue)}if($){const Ue=C.texture.type,qe=d.has(Ue),tt=Fe.getClearColor(),Ke=Fe.getClearAlpha(),ct=tt.r,We=tt.g,ut=tt.b;qe?(h[0]=ct,h[1]=We,h[2]=ut,h[3]=Ke,P.clearBufferuiv(P.COLOR,0,h)):(M[0]=ct,M[1]=We,M[2]=ut,M[3]=Ke,P.clearBufferiv(P.COLOR,0,M))}else ce|=P.COLOR_BUFFER_BIT}Q&&(ce|=P.DEPTH_BUFFER_BIT),pe&&(ce|=P.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),P.clear(ce)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",pt,!1),t.removeEventListener("webglcontextrestored",mt,!1),t.removeEventListener("webglcontextcreationerror",Rt,!1),Fe.dispose(),j.dispose(),le.dispose(),oe.dispose(),ze.dispose(),Ve.dispose(),A.dispose(),ve.dispose(),Ae.dispose(),y.dispose(),Le.dispose(),Le.removeEventListener("sessionstart",je),Le.removeEventListener("sessionend",Xe),Ge.stop()};function pt(L){L.preventDefault(),Lu("WebGLRenderer: Context Lost."),R=!0}function mt(){Lu("WebGLRenderer: Context Restored."),R=!1;const L=Re.autoReset,Q=Se.enabled,pe=Se.autoUpdate,ce=Se.needsUpdate,$=Se.type;He(),Re.autoReset=L,Se.enabled=Q,Se.autoUpdate=pe,Se.needsUpdate=ce,Se.type=$}function Rt(L){Rn("WebGLRenderer: A WebGL context could not be created. Reason: ",L.statusMessage)}function ke(L){const Q=L.target;Q.removeEventListener("dispose",ke),Ye(Q)}function Ye(L){xt(L),oe.remove(L)}function xt(L){const Q=oe.get(L).programs;Q!==void 0&&(Q.forEach(function(pe){y.releaseProgram(pe)}),L.isShaderMaterial&&y.releaseShaderCache(L))}this.renderBufferDirect=function(L,Q,pe,ce,$,Ue){Q===null&&(Q=me);const qe=$.isMesh&&$.matrixWorld.determinant()<0,tt=Kn(L,Q,pe,ce,$);Z.setMaterial(ce,qe);let Ke=pe.index,ct=1;if(ce.wireframe===!0){if(Ke=se.getWireframeAttribute(pe),Ke===void 0)return;ct=2}const We=pe.drawRange,ut=pe.attributes.position;let Pt=We.start*ct,Kt=(We.start+We.count)*ct;Ue!==null&&(Pt=Math.max(Pt,Ue.start*ct),Kt=Math.min(Kt,(Ue.start+Ue.count)*ct)),Ke!==null?(Pt=Math.max(Pt,0),Kt=Math.min(Kt,Ke.count)):ut!=null&&(Pt=Math.max(Pt,0),Kt=Math.min(Kt,ut.count));const _n=Kt-Pt;if(_n<0||_n===1/0)return;ve.setup($,ce,tt,pe,Ke);let fn,sn=Pe;if(Ke!==null&&(fn=it.get(Ke),sn=k,sn.setIndex(fn)),$.isMesh)ce.wireframe===!0?(Z.setLineWidth(ce.wireframeLinewidth*ee()),sn.setMode(P.LINES)):sn.setMode(P.TRIANGLES);else if($.isLine){let Ln=ce.linewidth;Ln===void 0&&(Ln=1),Z.setLineWidth(Ln*ee()),$.isLineSegments?sn.setMode(P.LINES):$.isLineLoop?sn.setMode(P.LINE_LOOP):sn.setMode(P.LINE_STRIP)}else $.isPoints?sn.setMode(P.POINTS):$.isSprite&&sn.setMode(P.TRIANGLES);if($.isBatchedMesh)if($._multiDrawInstances!==null)ia("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),sn.renderMultiDrawInstances($._multiDrawStarts,$._multiDrawCounts,$._multiDrawCount,$._multiDrawInstances);else if(_e.get("WEBGL_multi_draw"))sn.renderMultiDraw($._multiDrawStarts,$._multiDrawCounts,$._multiDrawCount);else{const Ln=$._multiDrawStarts,ht=$._multiDrawCounts,Hi=$._multiDrawCount,Wt=Ke?it.get(Ke).bytesPerElement:1,Yn=oe.get(ce).currentProgram.getUniforms();for(let Ci=0;Ci<Hi;Ci++)Yn.setValue(P,"_gl_DrawID",Ci),sn.render(Ln[Ci]/Wt,ht[Ci])}else if($.isInstancedMesh)sn.renderInstances(Pt,_n,$.count);else if(pe.isInstancedBufferGeometry){const Ln=pe._maxInstanceCount!==void 0?pe._maxInstanceCount:1/0,ht=Math.min(pe.instanceCount,Ln);sn.renderInstances(Pt,_n,ht)}else sn.render(Pt,_n)};function Me(L,Q,pe){L.transparent===!0&&L.side===Ts&&L.forceSinglePass===!1?(L.side=gi,L.needsUpdate=!0,Ft(L,Q,pe),L.side=nr,L.needsUpdate=!0,Ft(L,Q,pe),L.side=Ts):Ft(L,Q,pe)}this.compile=function(L,Q,pe=null){pe===null&&(pe=L),b=le.get(pe),b.init(Q),v.push(b),pe.traverseVisible(function($){$.isLight&&$.layers.test(Q.layers)&&(b.pushLight($),$.castShadow&&b.pushShadow($))}),L!==pe&&L.traverseVisible(function($){$.isLight&&$.layers.test(Q.layers)&&(b.pushLight($),$.castShadow&&b.pushShadow($))}),b.setupLights();const ce=new Set;return L.traverse(function($){if(!($.isMesh||$.isPoints||$.isLine||$.isSprite))return;const Ue=$.material;if(Ue)if(Array.isArray(Ue))for(let qe=0;qe<Ue.length;qe++){const tt=Ue[qe];Me(tt,pe,$),ce.add(tt)}else Me(Ue,pe,$),ce.add(Ue)}),b=v.pop(),ce},this.compileAsync=function(L,Q,pe=null){const ce=this.compile(L,Q,pe);return new Promise($=>{function Ue(){if(ce.forEach(function(qe){oe.get(qe).currentProgram.isReady()&&ce.delete(qe)}),ce.size===0){$(L);return}setTimeout(Ue,10)}_e.get("KHR_parallel_shader_compile")!==null?Ue():setTimeout(Ue,10)})};let Ie=null;function Qe(L){Ie&&Ie(L)}function je(){Ge.stop()}function Xe(){Ge.start()}const Ge=new Jf;Ge.setAnimationLoop(Qe),typeof self<"u"&&Ge.setContext(self),this.setAnimationLoop=function(L){Ie=L,Le.setAnimationLoop(L),L===null?Ge.stop():Ge.start()},Le.addEventListener("sessionstart",je),Le.addEventListener("sessionend",Xe),this.render=function(L,Q){if(Q!==void 0&&Q.isCamera!==!0){Rn("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;if(L.matrixWorldAutoUpdate===!0&&L.updateMatrixWorld(),Q.parent===null&&Q.matrixWorldAutoUpdate===!0&&Q.updateMatrixWorld(),Le.enabled===!0&&Le.isPresenting===!0&&(Le.cameraAutoUpdate===!0&&Le.updateCamera(Q),Q=Le.getCamera()),L.isScene===!0&&L.onBeforeRender(E,L,Q,C),b=le.get(L,v.length),b.init(Q),v.push(b),H.multiplyMatrices(Q.projectionMatrix,Q.matrixWorldInverse),he.setFromProjectionMatrix(H,cs,Q.reversedDepth),ge=this.localClippingEnabled,ae=X.init(this.clippingPlanes,ge),_=j.get(L,S.length),_.init(),S.push(_),Le.enabled===!0&&Le.isPresenting===!0){const Ue=E.xr.getDepthSensingMesh();Ue!==null&&rt(Ue,Q,-1/0,E.sortObjects)}rt(L,Q,0,E.sortObjects),_.finish(),E.sortObjects===!0&&_.sort(q,fe),U=Le.enabled===!1||Le.isPresenting===!1||Le.hasDepthSensing()===!1,U&&Fe.addToRenderList(_,L),this.info.render.frame++,ae===!0&&X.beginShadows();const pe=b.state.shadowsArray;Se.render(pe,L,Q),ae===!0&&X.endShadows(),this.info.autoReset===!0&&this.info.reset();const ce=_.opaque,$=_.transmissive;if(b.setupLights(),Q.isArrayCamera){const Ue=Q.cameras;if($.length>0)for(let qe=0,tt=Ue.length;qe<tt;qe++){const Ke=Ue[qe];lt(ce,$,L,Ke)}if(U&&Fe.render(L),Le.enabled&&Le.isMultiview)Ee.setDeferTextureUploads(!0),Ct(_,L,Q,Q.cameras[0].viewport);else for(let qe=0,tt=Ue.length;qe<tt;qe++){const Ke=Ue[qe];Ct(_,L,Ke,Ke.viewport)}}else $.length>0&&lt(ce,$,L,Q),U&&Fe.render(L),Ct(_,L,Q);C!==null&&T===0&&(Ee.updateMultisampleRenderTarget(C),Ee.updateRenderTargetMipmap(C)),L.isScene===!0&&L.onAfterRender(E,L,Q),Ee.runDeferredUploads(),ve.resetDefaultState(),I=-1,F=null,v.pop(),v.length>0?(b=v[v.length-1],ae===!0&&X.setGlobalState(E.clippingPlanes,b.state.camera)):b=null,S.pop(),S.length>0?_=S[S.length-1]:_=null};function rt(L,Q,pe,ce){if(L.visible===!1)return;if(L.layers.test(Q.layers)){if(L.isGroup)pe=L.renderOrder;else if(L.isLOD)L.autoUpdate===!0&&L.update(Q);else if(L.isLight)b.pushLight(L),L.castShadow&&b.pushShadow(L);else if(L.isSprite){if(!L.frustumCulled||he.intersectsSprite(L)){ce&&J.setFromMatrixPosition(L.matrixWorld).applyMatrix4(H);const qe=A.update(L),tt=L.material;tt.visible&&_.push(L,qe,tt,pe,J.z,null)}}else if((L.isMesh||L.isLine||L.isPoints)&&(!L.frustumCulled||he.intersectsObject(L))){const qe=A.update(L),tt=L.material;if(ce&&(L.boundingSphere!==void 0?(L.boundingSphere===null&&L.computeBoundingSphere(),J.copy(L.boundingSphere.center)):(qe.boundingSphere===null&&qe.computeBoundingSphere(),J.copy(qe.boundingSphere.center)),J.applyMatrix4(L.matrixWorld).applyMatrix4(H)),Array.isArray(tt)){const Ke=qe.groups;for(let ct=0,We=Ke.length;ct<We;ct++){const ut=Ke[ct],Pt=tt[ut.materialIndex];Pt&&Pt.visible&&_.push(L,qe,Pt,pe,J.z,ut)}}else tt.visible&&_.push(L,qe,tt,pe,J.z,null)}}const Ue=L.children;for(let qe=0,tt=Ue.length;qe<tt;qe++)rt(Ue[qe],Q,pe,ce)}function Ct(L,Q,pe,ce){const{opaque:$,transmissive:Ue,transparent:qe}=L;b.setupLightsView(pe),ae===!0&&X.setGlobalState(E.clippingPlanes,pe),ce&&Z.viewport(V.copy(ce)),$.length>0&&Lt($,Q,pe),Ue.length>0&&Lt(Ue,Q,pe),qe.length>0&&Lt(qe,Q,pe),Z.buffers.depth.setTest(!0),Z.buffers.depth.setMask(!0),Z.buffers.color.setMask(!0),Z.setPolygonOffset(!1)}function lt(L,Q,pe,ce){if((pe.isScene===!0?pe.overrideMaterial:null)!==null)return;b.state.transmissionRenderTarget[ce.id]===void 0&&(b.state.transmissionRenderTarget[ce.id]=new ir(1,1,{generateMipmaps:!0,type:_e.has("EXT_color_buffer_half_float")||_e.has("EXT_color_buffer_float")?_o:ls,minFilter:mr,samples:4,stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:tn.workingColorSpace}));const Ue=b.state.transmissionRenderTarget[ce.id],qe=ce.viewport||V;Ue.setSize(qe.z*E.transmissionResolutionScale,qe.w*E.transmissionResolutionScale);const tt=E.getRenderTarget(),Ke=E.getActiveCubeFace(),ct=E.getActiveMipmapLevel();E.setRenderTarget(Ue),E.getClearColor(B),G=E.getClearAlpha(),G<1&&E.setClearColor(16777215,.5),E.clear(),U&&Fe.render(pe);const We=E.toneMapping;E.toneMapping=tr;const ut=ce.viewport;if(ce.viewport!==void 0&&(ce.viewport=void 0),b.setupLightsView(ce),ae===!0&&X.setGlobalState(E.clippingPlanes,ce),Lt(L,pe,ce),Ee.updateMultisampleRenderTarget(Ue),Ee.updateRenderTargetMipmap(Ue),_e.has("WEBGL_multisampled_render_to_texture")===!1){let Pt=!1;for(let Kt=0,_n=Q.length;Kt<_n;Kt++){const fn=Q[Kt],{object:sn,geometry:Ln,material:ht,group:Hi}=fn;if(ht.side===Ts&&sn.layers.test(ce.layers)){const Wt=ht.side;ht.side=gi,ht.needsUpdate=!0,gt(sn,pe,ce,Ln,ht,Hi),ht.side=Wt,ht.needsUpdate=!0,Pt=!0}}Pt===!0&&(Ee.updateMultisampleRenderTarget(Ue),Ee.updateRenderTargetMipmap(Ue))}E.setRenderTarget(tt,Ke,ct),E.setClearColor(B,G),ut!==void 0&&(ce.viewport=ut),E.toneMapping=We}function Lt(L,Q,pe){const ce=Q.isScene===!0?Q.overrideMaterial:null;for(let $=0,Ue=L.length;$<Ue;$++){const qe=L[$],{object:tt,geometry:Ke,group:ct}=qe;let We=qe.material;We.allowOverride===!0&&ce!==null&&(We=ce),tt.layers.test(pe.layers)&&gt(tt,Q,pe,Ke,We,ct)}}function gt(L,Q,pe,ce,$,Ue){L.onBeforeRender(E,Q,pe,ce,$,Ue),L.modelViewMatrix.multiplyMatrices(pe.matrixWorldInverse,L.matrixWorld),L.normalMatrix.getNormalMatrix(L.modelViewMatrix),$.onBeforeRender(E,Q,pe,ce,L,Ue),$.transparent===!0&&$.side===Ts&&$.forceSinglePass===!1?($.side=gi,$.needsUpdate=!0,E.renderBufferDirect(pe,Q,ce,$,L,Ue),$.side=nr,$.needsUpdate=!0,E.renderBufferDirect(pe,Q,ce,$,L,Ue),$.side=Ts):E.renderBufferDirect(pe,Q,ce,$,L,Ue),L.onAfterRender(E,Q,pe,ce,$,Ue)}function Ft(L,Q,pe){Q.isScene!==!0&&(Q=me);const ce=oe.get(L),$=b.state.lights,Ue=b.state.shadowsArray,qe=$.state.version,tt=y.getParameters(L,$.state,Ue,Q,pe),Ke=y.getProgramCacheKey(tt);let ct=ce.programs;ce.environment=L.isMeshStandardMaterial?Q.environment:null,ce.fog=Q.fog,ce.envMap=(L.isMeshStandardMaterial?Ve:ze).get(L.envMap||ce.environment),ce.envMapRotation=ce.environment!==null&&L.envMap===null?Q.environmentRotation:L.envMapRotation,ct===void 0&&(L.addEventListener("dispose",ke),ct=new Map,ce.programs=ct);let We=ct.get(Ke);if(We!==void 0){if(ce.currentProgram===We&&ce.lightsStateVersion===qe)return Gt(L,tt),We}else tt.uniforms=y.getUniforms(L),L.onBeforeCompile(tt,E),We=y.acquireProgram(tt,Ke),ct.set(Ke,We),ce.uniforms=tt.uniforms;const ut=ce.uniforms;return(!L.isShaderMaterial&&!L.isRawShaderMaterial||L.clipping===!0)&&(ut.clippingPlanes=X.uniform),Gt(L,tt),ce.needsLights=yr(L),ce.lightsStateVersion=qe,ce.needsLights&&(ut.ambientLightColor.value=$.state.ambient,ut.lightProbe.value=$.state.probe,ut.directionalLights.value=$.state.directional,ut.directionalLightShadows.value=$.state.directionalShadow,ut.spotLights.value=$.state.spot,ut.spotLightShadows.value=$.state.spotShadow,ut.rectAreaLights.value=$.state.rectArea,ut.ltc_1.value=$.state.rectAreaLTC1,ut.ltc_2.value=$.state.rectAreaLTC2,ut.pointLights.value=$.state.point,ut.pointLightShadows.value=$.state.pointShadow,ut.hemisphereLights.value=$.state.hemi,ut.directionalShadowMap.value=$.state.directionalShadowMap,ut.directionalShadowMatrix.value=$.state.directionalShadowMatrix,ut.spotShadowMap.value=$.state.spotShadowMap,ut.spotLightMatrix.value=$.state.spotLightMatrix,ut.spotLightMap.value=$.state.spotLightMap,ut.pointShadowMap.value=$.state.pointShadowMap,ut.pointShadowMatrix.value=$.state.pointShadowMatrix),ce.currentProgram=We,ce.uniformsList=null,We}function $t(L){if(L.uniformsList===null){const Q=L.currentProgram.getUniforms();L.uniformsList=lc.seqWithValue(Q.seq,L.uniforms)}return L.uniformsList}function Gt(L,Q){const pe=oe.get(L);pe.outputColorSpace=Q.outputColorSpace,pe.batching=Q.batching,pe.batchingColor=Q.batchingColor,pe.instancing=Q.instancing,pe.instancingColor=Q.instancingColor,pe.instancingMorph=Q.instancingMorph,pe.skinning=Q.skinning,pe.morphTargets=Q.morphTargets,pe.morphNormals=Q.morphNormals,pe.morphColors=Q.morphColors,pe.morphTargetsCount=Q.morphTargetsCount,pe.numClippingPlanes=Q.numClippingPlanes,pe.numIntersection=Q.numClipIntersection,pe.vertexAlphas=Q.vertexAlphas,pe.vertexTangents=Q.vertexTangents,pe.toneMapping=Q.toneMapping,pe.numMultiviewViews=Q.numMultiviewViews}function Kn(L,Q,pe,ce,$){Q.isScene!==!0&&(Q=me),Ee.resetTextureUnits();const Ue=Q.fog,qe=ce.isMeshStandardMaterial?Q.environment:null,tt=C===null?E.outputColorSpace:C.isXRRenderTarget===!0?C.texture.colorSpace:uo,Ke=(ce.isMeshStandardMaterial?Ve:ze).get(ce.envMap||qe),ct=ce.vertexColors===!0&&!!pe.attributes.color&&pe.attributes.color.itemSize===4,We=!!pe.attributes.tangent&&(!!ce.normalMap||ce.anisotropy>0),ut=!!pe.morphAttributes.position,Pt=!!pe.morphAttributes.normal,Kt=!!pe.morphAttributes.color;let _n=tr;ce.toneMapped&&(C===null||C.isXRRenderTarget===!0)&&(_n=E.toneMapping);const fn=C&&C.isWebGLMultiviewRenderTarget?C.numViews:0,sn=pe.morphAttributes.position||pe.morphAttributes.normal||pe.morphAttributes.color,Ln=sn!==void 0?sn.length:0,ht=oe.get(ce),Hi=b.state.lights;if(ae===!0&&(ge===!0||L!==F)){const pn=L===F&&ce.id===I;X.setState(ce,L,pn)}let Wt=!1;ce.version===ht.__version?(ht.needsLights&&ht.lightsStateVersion!==Hi.state.version||ht.outputColorSpace!==tt||$.isBatchedMesh&&ht.batching===!1||!$.isBatchedMesh&&ht.batching===!0||$.isBatchedMesh&&ht.batchingColor===!0&&$.colorTexture===null||$.isBatchedMesh&&ht.batchingColor===!1&&$.colorTexture!==null||$.isInstancedMesh&&ht.instancing===!1||!$.isInstancedMesh&&ht.instancing===!0||$.isSkinnedMesh&&ht.skinning===!1||!$.isSkinnedMesh&&ht.skinning===!0||$.isInstancedMesh&&ht.instancingColor===!0&&$.instanceColor===null||$.isInstancedMesh&&ht.instancingColor===!1&&$.instanceColor!==null||$.isInstancedMesh&&ht.instancingMorph===!0&&$.morphTexture===null||$.isInstancedMesh&&ht.instancingMorph===!1&&$.morphTexture!==null||ht.envMap!==Ke||ce.fog===!0&&ht.fog!==Ue||ht.numClippingPlanes!==void 0&&(ht.numClippingPlanes!==X.numPlanes||ht.numIntersection!==X.numIntersection)||ht.vertexAlphas!==ct||ht.vertexTangents!==We||ht.morphTargets!==ut||ht.morphNormals!==Pt||ht.morphColors!==Kt||ht.toneMapping!==_n||ht.morphTargetsCount!==Ln||ht.numMultiviewViews!==fn)&&(Wt=!0):(Wt=!0,ht.__version=ce.version);let Yn=ht.currentProgram;Wt===!0&&(Yn=Ft(ce,Q,$));let Ci=!1,ts=!1,fs=!1;const Qt=Yn.getUniforms(),wn=ht.uniforms;if(Z.useProgram(Yn.program)&&(Ci=!0,ts=!0,fs=!0),ce.id!==I&&(I=ce.id,ts=!0),Ci||F!==L){Yn.numMultiviewViews>0?(Te.updateCameraProjectionMatricesUniform(L,Qt),Te.updateCameraViewMatricesUniform(L,Qt)):(Z.buffers.depth.getReversed()&&L.reversedDepth!==!0&&(L._reversedDepth=!0,L.updateProjectionMatrix()),Qt.setValue(P,"projectionMatrix",L.projectionMatrix),Qt.setValue(P,"viewMatrix",L.matrixWorldInverse));const pn=Qt.map.cameraPosition;pn!==void 0&&pn.setValue(P,de.setFromMatrixPosition(L.matrixWorld)),xe.logarithmicDepthBuffer&&Qt.setValue(P,"logDepthBufFC",2/(Math.log(L.far+1)/Math.LN2)),(ce.isMeshPhongMaterial||ce.isMeshToonMaterial||ce.isMeshLambertMaterial||ce.isMeshBasicMaterial||ce.isMeshStandardMaterial||ce.isShaderMaterial)&&Qt.setValue(P,"isOrthographic",L.isOrthographicCamera===!0),F!==L&&(F=L,ts=!0,fs=!0)}if($.isSkinnedMesh){Qt.setOptional(P,$,"bindMatrix"),Qt.setOptional(P,$,"bindMatrixInverse");const pn=$.skeleton;pn&&(pn.boneTexture===null&&pn.computeBoneTexture(),Qt.setValue(P,"boneTexture",pn.boneTexture,Ee))}$.isBatchedMesh&&(Qt.setOptional(P,$,"batchingTexture"),Qt.setValue(P,"batchingTexture",$._matricesTexture,Ee),Qt.setOptional(P,$,"batchingIdTexture"),Qt.setValue(P,"batchingIdTexture",$._indirectTexture,Ee),Qt.setOptional(P,$,"batchingColorTexture"),$._colorsTexture!==null&&Qt.setValue(P,"batchingColorTexture",$._colorsTexture,Ee));const ns=pe.morphAttributes;if((ns.position!==void 0||ns.normal!==void 0||ns.color!==void 0)&&at.update($,pe,Yn),(ts||ht.receiveShadow!==$.receiveShadow)&&(ht.receiveShadow=$.receiveShadow,Qt.setValue(P,"receiveShadow",$.receiveShadow)),ce.isMeshGouraudMaterial&&ce.envMap!==null&&(wn.envMap.value=Ke,wn.flipEnvMap.value=Ke.isCubeTexture&&Ke.isRenderTargetTexture===!1?-1:1),ce.isMeshStandardMaterial&&ce.envMap===null&&Q.environment!==null&&(wn.envMapIntensity.value=Q.environmentIntensity),wn.dfgLUT!==void 0&&(wn.dfgLUT.value=cM()),ts&&(Qt.setValue(P,"toneMappingExposure",E.toneMappingExposure),ht.needsLights&&es(wn,fs),Ue&&ce.fog===!0&&O.refreshFogUniforms(wn,Ue),O.refreshMaterialUniforms(wn,ce,te,N,b.state.transmissionRenderTarget[L.id]),lc.upload(P,$t(ht),wn,Ee)),ce.isShaderMaterial&&ce.uniformsNeedUpdate===!0&&(lc.upload(P,$t(ht),wn,Ee),ce.uniformsNeedUpdate=!1),ce.isSpriteMaterial&&Qt.setValue(P,"center",$.center),Yn.numMultiviewViews>0?Te.updateObjectMatricesUniforms($,L,Qt):(Qt.setValue(P,"modelViewMatrix",$.modelViewMatrix),Qt.setValue(P,"normalMatrix",$.normalMatrix)),Qt.setValue(P,"modelMatrix",$.matrixWorld),ce.isShaderMaterial||ce.isRawShaderMaterial){const pn=ce.uniformsGroups;for(let Fs=0,ps=pn.length;Fs<ps;Fs++){const xa=pn[Fs];Ae.update(xa,Yn),Ae.bind(xa,Yn)}}return Yn}function es(L,Q){L.ambientLightColor.needsUpdate=Q,L.lightProbe.needsUpdate=Q,L.directionalLights.needsUpdate=Q,L.directionalLightShadows.needsUpdate=Q,L.pointLights.needsUpdate=Q,L.pointLightShadows.needsUpdate=Q,L.spotLights.needsUpdate=Q,L.spotLightShadows.needsUpdate=Q,L.rectAreaLights.needsUpdate=Q,L.hemisphereLights.needsUpdate=Q}function yr(L){return L.isMeshLambertMaterial||L.isMeshToonMaterial||L.isMeshPhongMaterial||L.isMeshStandardMaterial||L.isShadowMaterial||L.isShaderMaterial&&L.lights===!0}this.setTexture2D=(function(){var L=!1;return function(pe,ce){pe&&pe.isWebGLRenderTarget&&(L||(console.warn("THREE.WebGLRenderer.setTexture2D: don't use render targets as textures. Use their .texture property instead."),L=!0),pe=pe.texture),Ee.setTexture2D(pe,ce)}})(),this.getActiveCubeFace=function(){return w},this.getActiveMipmapLevel=function(){return T},this.getRenderTarget=function(){return C},this.setRenderTargetTextures=function(L,Q,pe){const ce=oe.get(L);ce.__autoAllocateDepthBuffer=L.resolveDepthBuffer===!1,ce.__autoAllocateDepthBuffer||(ce.__useRenderToTexture=!1),oe.get(L.texture).__webglTexture=Q,oe.get(L.depthTexture).__webglTexture=ce.__autoAllocateDepthBuffer?void 0:pe,ce.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(L,Q){const pe=oe.get(L);pe.__webglFramebuffer=Q,pe.__useDefaultFramebuffer=Q===void 0};const Sr=P.createFramebuffer();this.setRenderTarget=function(L,Q=0,pe=0){L===null&&this.xr.isPresenting&&(L=this.xr.getRenderTarget()),C=L,w=Q,T=pe;let ce=!0,$=null,Ue=!1,qe=!1;if(L){const Ke=oe.get(L);if(Ke.__useDefaultFramebuffer!==void 0)Z.bindFramebuffer(P.FRAMEBUFFER,null),ce=!1;else if(Ke.__webglFramebuffer===void 0)Ee.setupRenderTarget(L);else if(Ke.__hasExternalTextures)Ee.rebindTextures(L,oe.get(L.texture).__webglTexture,oe.get(L.depthTexture).__webglTexture);else if(L.depthBuffer){const ut=L.depthTexture;if(Ke.__boundDepthTexture!==ut){if(ut!==null&&oe.has(ut)&&(L.width!==ut.image.width||L.height!==ut.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");Ee.setupDepthRenderbuffer(L)}}const ct=L.texture;(ct.isData3DTexture||ct.isDataArrayTexture||ct.isCompressedArrayTexture)&&(qe=!0);const We=oe.get(L).__webglFramebuffer;L.isWebGLCubeRenderTarget?(Array.isArray(We[Q])?$=We[Q][pe]:$=We[Q],Ue=!0):L.samples>0&&Ee.useMultisampledRTT(L)===!1?$=oe.get(L).__webglMultisampledFramebuffer:Array.isArray(We)?$=We[pe]:$=We,V.copy(L.viewport),W.copy(L.scissor),D=L.scissorTest}else V.copy(re).multiplyScalar(te).floor(),W.copy(ne).multiplyScalar(te).floor(),D=K;if(pe!==0&&($=Sr),Z.bindFramebuffer(P.FRAMEBUFFER,$)&&ce&&Z.drawBuffers(L,$),Z.viewport(V),Z.scissor(W),Z.setScissorTest(D),Ue){const Ke=oe.get(L.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Ke.__webglTexture,pe)}else if(qe){const Ke=Q;for(let ct=0;ct<L.textures.length;ct++){const We=oe.get(L.textures[ct]);P.framebufferTextureLayer(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0+ct,We.__webglTexture,pe,Ke)}}else if(L!==null&&pe!==0){const Ke=oe.get(L.texture);P.framebufferTexture2D(P.FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,Ke.__webglTexture,pe)}I=-1},this.readRenderTargetPixels=function(L,Q,pe,ce,$,Ue,qe,tt=0){if(!(L&&L.isWebGLRenderTarget)){Rn("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ke=oe.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&qe!==void 0&&(Ke=Ke[qe]),Ke){Z.bindFramebuffer(P.FRAMEBUFFER,Ke);try{const ct=L.textures[tt],We=ct.format,ut=ct.type;if(!xe.textureFormatReadable(We)){Rn("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!xe.textureTypeReadable(ut)){Rn("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}Q>=0&&Q<=L.width-ce&&pe>=0&&pe<=L.height-$&&(L.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+tt),P.readPixels(Q,pe,ce,$,Ce.convert(We),Ce.convert(ut),Ue))}finally{const ct=C!==null?oe.get(C).__webglFramebuffer:null;Z.bindFramebuffer(P.FRAMEBUFFER,ct)}}},this.readRenderTargetPixelsAsync=async function(L,Q,pe,ce,$,Ue,qe,tt=0){if(!(L&&L.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Ke=oe.get(L).__webglFramebuffer;if(L.isWebGLCubeRenderTarget&&qe!==void 0&&(Ke=Ke[qe]),Ke)if(Q>=0&&Q<=L.width-ce&&pe>=0&&pe<=L.height-$){Z.bindFramebuffer(P.FRAMEBUFFER,Ke);const ct=L.textures[tt],We=ct.format,ut=ct.type;if(!xe.textureFormatReadable(We))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!xe.textureTypeReadable(ut))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const Pt=P.createBuffer();P.bindBuffer(P.PIXEL_PACK_BUFFER,Pt),P.bufferData(P.PIXEL_PACK_BUFFER,Ue.byteLength,P.STREAM_READ),L.textures.length>1&&P.readBuffer(P.COLOR_ATTACHMENT0+tt),P.readPixels(Q,pe,ce,$,Ce.convert(We),Ce.convert(ut),0);const Kt=C!==null?oe.get(C).__webglFramebuffer:null;Z.bindFramebuffer(P.FRAMEBUFFER,Kt);const _n=P.fenceSync(P.SYNC_GPU_COMMANDS_COMPLETE,0);return P.flush(),await bm(P,_n,4),P.bindBuffer(P.PIXEL_PACK_BUFFER,Pt),P.getBufferSubData(P.PIXEL_PACK_BUFFER,0,Ue),P.deleteBuffer(Pt),P.deleteSync(_n),Ue}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(L,Q=null,pe=0){const ce=Math.pow(2,-pe),$=Math.floor(L.image.width*ce),Ue=Math.floor(L.image.height*ce),qe=Q!==null?Q.x:0,tt=Q!==null?Q.y:0;Ee.setTexture2D(L,0),P.copyTexSubImage2D(P.TEXTURE_2D,pe,0,0,qe,tt,$,Ue),Z.unbindTexture()};const Os=P.createFramebuffer(),Er=P.createFramebuffer();this.copyTextureToTexture=function(L,Q,pe=null,ce=null,$=0,Ue=null){Ue===null&&($!==0?(ia("WebGLRenderer: copyTextureToTexture function signature has changed to support src and dst mipmap levels."),Ue=$,$=0):Ue=0);let qe,tt,Ke,ct,We,ut,Pt,Kt,_n;const fn=L.isCompressedTexture?L.mipmaps[Ue]:L.image;if(pe!==null)qe=pe.max.x-pe.min.x,tt=pe.max.y-pe.min.y,Ke=pe.isBox3?pe.max.z-pe.min.z:1,ct=pe.min.x,We=pe.min.y,ut=pe.isBox3?pe.min.z:0;else{const wn=Math.pow(2,-$);qe=Math.floor(fn.width*wn),tt=Math.floor(fn.height*wn),L.isDataArrayTexture?Ke=fn.depth:L.isData3DTexture?Ke=Math.floor(fn.depth*wn):Ke=1,ct=0,We=0,ut=0}ce!==null?(Pt=ce.x,Kt=ce.y,_n=ce.z):(Pt=0,Kt=0,_n=0);const sn=Ce.convert(Q.format),Ln=Ce.convert(Q.type);let ht;Q.isData3DTexture?(Ee.setTexture3D(Q,0),ht=P.TEXTURE_3D):Q.isDataArrayTexture||Q.isCompressedArrayTexture?(Ee.setTexture2DArray(Q,0),ht=P.TEXTURE_2D_ARRAY):(Ee.setTexture2D(Q,0),ht=P.TEXTURE_2D),P.pixelStorei(P.UNPACK_FLIP_Y_WEBGL,Q.flipY),P.pixelStorei(P.UNPACK_PREMULTIPLY_ALPHA_WEBGL,Q.premultiplyAlpha),P.pixelStorei(P.UNPACK_ALIGNMENT,Q.unpackAlignment);const Hi=P.getParameter(P.UNPACK_ROW_LENGTH),Wt=P.getParameter(P.UNPACK_IMAGE_HEIGHT),Yn=P.getParameter(P.UNPACK_SKIP_PIXELS),Ci=P.getParameter(P.UNPACK_SKIP_ROWS),ts=P.getParameter(P.UNPACK_SKIP_IMAGES);P.pixelStorei(P.UNPACK_ROW_LENGTH,fn.width),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,fn.height),P.pixelStorei(P.UNPACK_SKIP_PIXELS,ct),P.pixelStorei(P.UNPACK_SKIP_ROWS,We),P.pixelStorei(P.UNPACK_SKIP_IMAGES,ut);const fs=L.isDataArrayTexture||L.isData3DTexture,Qt=Q.isDataArrayTexture||Q.isData3DTexture;if(L.isDepthTexture){const wn=oe.get(L),ns=oe.get(Q),pn=oe.get(wn.__renderTarget),Fs=oe.get(ns.__renderTarget);Z.bindFramebuffer(P.READ_FRAMEBUFFER,pn.__webglFramebuffer),Z.bindFramebuffer(P.DRAW_FRAMEBUFFER,Fs.__webglFramebuffer);for(let ps=0;ps<Ke;ps++)fs&&(P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,oe.get(L).__webglTexture,$,ut+ps),P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,oe.get(Q).__webglTexture,Ue,_n+ps)),P.blitFramebuffer(ct,We,qe,tt,Pt,Kt,qe,tt,P.DEPTH_BUFFER_BIT,P.NEAREST);Z.bindFramebuffer(P.READ_FRAMEBUFFER,null),Z.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else if($!==0||L.isRenderTargetTexture||oe.has(L)){const wn=oe.get(L),ns=oe.get(Q);Z.bindFramebuffer(P.READ_FRAMEBUFFER,Os),Z.bindFramebuffer(P.DRAW_FRAMEBUFFER,Er);for(let pn=0;pn<Ke;pn++)fs?P.framebufferTextureLayer(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,wn.__webglTexture,$,ut+pn):P.framebufferTexture2D(P.READ_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,wn.__webglTexture,$),Qt?P.framebufferTextureLayer(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,ns.__webglTexture,Ue,_n+pn):P.framebufferTexture2D(P.DRAW_FRAMEBUFFER,P.COLOR_ATTACHMENT0,P.TEXTURE_2D,ns.__webglTexture,Ue),$!==0?P.blitFramebuffer(ct,We,qe,tt,Pt,Kt,qe,tt,P.COLOR_BUFFER_BIT,P.NEAREST):Qt?P.copyTexSubImage3D(ht,Ue,Pt,Kt,_n+pn,ct,We,qe,tt):P.copyTexSubImage2D(ht,Ue,Pt,Kt,ct,We,qe,tt);Z.bindFramebuffer(P.READ_FRAMEBUFFER,null),Z.bindFramebuffer(P.DRAW_FRAMEBUFFER,null)}else Qt?L.isDataTexture||L.isData3DTexture?P.texSubImage3D(ht,Ue,Pt,Kt,_n,qe,tt,Ke,sn,Ln,fn.data):Q.isCompressedArrayTexture?P.compressedTexSubImage3D(ht,Ue,Pt,Kt,_n,qe,tt,Ke,sn,fn.data):P.texSubImage3D(ht,Ue,Pt,Kt,_n,qe,tt,Ke,sn,Ln,fn):L.isDataTexture?P.texSubImage2D(P.TEXTURE_2D,Ue,Pt,Kt,qe,tt,sn,Ln,fn.data):L.isCompressedTexture?P.compressedTexSubImage2D(P.TEXTURE_2D,Ue,Pt,Kt,fn.width,fn.height,sn,fn.data):P.texSubImage2D(P.TEXTURE_2D,Ue,Pt,Kt,qe,tt,sn,Ln,fn);P.pixelStorei(P.UNPACK_ROW_LENGTH,Hi),P.pixelStorei(P.UNPACK_IMAGE_HEIGHT,Wt),P.pixelStorei(P.UNPACK_SKIP_PIXELS,Yn),P.pixelStorei(P.UNPACK_SKIP_ROWS,Ci),P.pixelStorei(P.UNPACK_SKIP_IMAGES,ts),Ue===0&&Q.generateMipmaps&&P.generateMipmap(ht),Z.unbindTexture()},this.initRenderTarget=function(L){oe.get(L).__webglFramebuffer===void 0&&Ee.setupRenderTarget(L)},this.initTexture=function(L){L.isCubeTexture?Ee.setTextureCube(L,0):L.isData3DTexture?Ee.setTexture3D(L,0):L.isDataArrayTexture||L.isCompressedArrayTexture?Ee.setTexture2DArray(L,0):Ee.setTexture2D(L,0),Z.unbindTexture()},this.resetState=function(){w=0,T=0,C=null,Z.reset(),ve.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return cs}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;const t=this.getContext();t.drawingBufferColorSpace=tn._getDrawingBufferColorSpace(e),t.unpackColorSpace=tn._getUnpackColorSpace()}}const Pd={type:"change"},Qh={type:"start"},r0={type:"end"},qa=new Ac,Dd=new Ks,lM=Math.cos(70*Of.DEG2RAD),In=new ue,ui=2*Math.PI,un={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},vl=1e-6;class AS extends vg{constructor(e,t=null){super(e,t),this.state=un.NONE,this.target=new ue,this.cursor=new ue,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:Qr.ROTATE,MIDDLE:Qr.DOLLY,RIGHT:Qr.PAN},this.touches={ONE:Yr.ROTATE,TWO:Yr.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._domElementKeyEvents=null,this._lastPosition=new ue,this._lastQuaternion=new dn,this._lastTargetPosition=new ue,this._quat=new dn().setFromUnitVectors(e.up,new ue(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new od,this._sphericalDelta=new od,this._scale=1,this._panOffset=new ue,this._rotateStart=new Ot,this._rotateEnd=new Ot,this._rotateDelta=new Ot,this._panStart=new Ot,this._panEnd=new Ot,this._panDelta=new Ot,this._dollyStart=new Ot,this._dollyEnd=new Ot,this._dollyDelta=new Ot,this._dollyDirection=new ue,this._mouse=new Ot,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=uM.bind(this),this._onPointerDown=hM.bind(this),this._onPointerUp=dM.bind(this),this._onContextMenu=bM.bind(this),this._onMouseWheel=mM.bind(this),this._onKeyDown=gM.bind(this),this._onTouchStart=xM.bind(this),this._onTouchMove=_M.bind(this),this._onMouseDown=fM.bind(this),this._onMouseMove=pM.bind(this),this._interceptControlDown=MM.bind(this),this._interceptControlUp=vM.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}connect(e){super.connect(e),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(e){e.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=e}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Pd),this.update(),this.state=un.NONE}update(e=null){const t=this.object.position;In.copy(t).sub(this.target),In.applyQuaternion(this._quat),this._spherical.setFromVector3(In),this.autoRotate&&this.state===un.NONE&&this._rotateLeft(this._getAutoRotationAngle(e)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,s=this.maxAzimuthAngle;isFinite(i)&&isFinite(s)&&(i<-Math.PI?i+=ui:i>Math.PI&&(i-=ui),s<-Math.PI?s+=ui:s>Math.PI&&(s-=ui),i<=s?this._spherical.theta=Math.max(i,Math.min(s,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+s)/2?Math.max(i,this._spherical.theta):Math.min(s,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const o=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=o!=this._spherical.radius}if(In.setFromSpherical(this._spherical),In.applyQuaternion(this._quatInverse),t.copy(this.target).add(In),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let o=null;if(this.object.isPerspectiveCamera){const a=In.length();o=this._clampDistance(a*this._scale);const l=a-o;this.object.position.addScaledVector(this._dollyDirection,l),this.object.updateMatrixWorld(),r=!!l}else if(this.object.isOrthographicCamera){const a=new ue(this._mouse.x,this._mouse.y,0);a.unproject(this.object);const l=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=l!==this.object.zoom;const c=new ue(this._mouse.x,this._mouse.y,0);c.unproject(this.object),this.object.position.sub(c).add(a),this.object.updateMatrixWorld(),o=In.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;o!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(o).add(this.object.position):(qa.origin.copy(this.object.position),qa.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(qa.direction))<lM?this.object.lookAt(this.target):(Dd.setFromNormalAndCoplanarPoint(this.object.up,this.target),qa.intersectPlane(Dd,this.target))))}else if(this.object.isOrthographicCamera){const o=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),o!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>vl||8*(1-this._lastQuaternion.dot(this.object.quaternion))>vl||this._lastTargetPosition.distanceToSquared(this.target)>vl?(this.dispatchEvent(Pd),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(e){return e!==null?ui/60*this.autoRotateSpeed*e:ui/60/60*this.autoRotateSpeed}_getZoomScale(e){const t=Math.abs(e*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(e){this._sphericalDelta.theta-=e}_rotateUp(e){this._sphericalDelta.phi-=e}_panLeft(e,t){In.setFromMatrixColumn(t,0),In.multiplyScalar(-e),this._panOffset.add(In)}_panUp(e,t){this.screenSpacePanning===!0?In.setFromMatrixColumn(t,1):(In.setFromMatrixColumn(t,0),In.crossVectors(this.object.up,In)),In.multiplyScalar(e),this._panOffset.add(In)}_pan(e,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const s=this.object.position;In.copy(s).sub(this.target);let r=In.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*e*r/i.clientHeight,this.object.matrix),this._panUp(2*t*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(e*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(e){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=e:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(e,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),s=e-i.left,r=t-i.top,o=i.width,a=i.height;this._mouse.x=s/o*2-1,this._mouse.y=-(r/a)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(e){return Math.max(this.minDistance,Math.min(this.maxDistance,e))}_handleMouseDownRotate(e){this._rotateStart.set(e.clientX,e.clientY)}_handleMouseDownDolly(e){this._updateZoomParameters(e.clientX,e.clientX),this._dollyStart.set(e.clientX,e.clientY)}_handleMouseDownPan(e){this._panStart.set(e.clientX,e.clientY)}_handleMouseMoveRotate(e){this._rotateEnd.set(e.clientX,e.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ui*this._rotateDelta.x/t.clientHeight),this._rotateUp(ui*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(e){this._dollyEnd.set(e.clientX,e.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(e){this._panEnd.set(e.clientX,e.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(e){this._updateZoomParameters(e.clientX,e.clientY),e.deltaY<0?this._dollyIn(this._getZoomScale(e.deltaY)):e.deltaY>0&&this._dollyOut(this._getZoomScale(e.deltaY)),this.update()}_handleKeyDown(e){let t=!1;switch(e.code){case this.keys.UP:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(ui*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateUp(-ui*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(ui*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:e.ctrlKey||e.metaKey||e.shiftKey?this.enableRotate&&this._rotateLeft(-ui*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(e.preventDefault(),this.update())}_handleTouchStartRotate(e){if(this._pointers.length===1)this._rotateStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._rotateStart.set(i,s)}}_handleTouchStartPan(e){if(this._pointers.length===1)this._panStart.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panStart.set(i,s)}}_handleTouchStartDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enablePan&&this._handleTouchStartPan(e)}_handleTouchStartDollyRotate(e){this.enableZoom&&this._handleTouchStartDolly(e),this.enableRotate&&this._handleTouchStartRotate(e)}_handleTouchMoveRotate(e){if(this._pointers.length==1)this._rotateEnd.set(e.pageX,e.pageY);else{const i=this._getSecondPointerPosition(e),s=.5*(e.pageX+i.x),r=.5*(e.pageY+i.y);this._rotateEnd.set(s,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(ui*this._rotateDelta.x/t.clientHeight),this._rotateUp(ui*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(e){if(this._pointers.length===1)this._panEnd.set(e.pageX,e.pageY);else{const t=this._getSecondPointerPosition(e),i=.5*(e.pageX+t.x),s=.5*(e.pageY+t.y);this._panEnd.set(i,s)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(e){const t=this._getSecondPointerPosition(e),i=e.pageX-t.x,s=e.pageY-t.y,r=Math.sqrt(i*i+s*s);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const o=(e.pageX+t.x)*.5,a=(e.pageY+t.y)*.5;this._updateZoomParameters(o,a)}_handleTouchMoveDollyPan(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enablePan&&this._handleTouchMovePan(e)}_handleTouchMoveDollyRotate(e){this.enableZoom&&this._handleTouchMoveDolly(e),this.enableRotate&&this._handleTouchMoveRotate(e)}_addPointer(e){this._pointers.push(e.pointerId)}_removePointer(e){delete this._pointerPositions[e.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(e){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==e.pointerId)return!0;return!1}_trackPointer(e){let t=this._pointerPositions[e.pointerId];t===void 0&&(t=new Ot,this._pointerPositions[e.pointerId]=t),t.set(e.pageX,e.pageY)}_getSecondPointerPosition(e){const t=e.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(e){const t=e.deltaMode,i={clientX:e.clientX,clientY:e.clientY,deltaY:e.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return e.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function hM(n){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(n.pointerId),this.domElement.addEventListener("pointermove",this._onPointerMove),this.domElement.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(n)&&(this._addPointer(n),n.pointerType==="touch"?this._onTouchStart(n):this._onMouseDown(n)))}function uM(n){this.enabled!==!1&&(n.pointerType==="touch"?this._onTouchMove(n):this._onMouseMove(n))}function dM(n){switch(this._removePointer(n),this._pointers.length){case 0:this.domElement.releasePointerCapture(n.pointerId),this.domElement.removeEventListener("pointermove",this._onPointerMove),this.domElement.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(r0),this.state=un.NONE;break;case 1:const e=this._pointers[0],t=this._pointerPositions[e];this._onTouchStart({pointerId:e,pageX:t.x,pageY:t.y});break}}function fM(n){let e;switch(n.button){case 0:e=this.mouseButtons.LEFT;break;case 1:e=this.mouseButtons.MIDDLE;break;case 2:e=this.mouseButtons.RIGHT;break;default:e=-1}switch(e){case Qr.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(n),this.state=un.DOLLY;break;case Qr.ROTATE:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=un.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=un.ROTATE}break;case Qr.PAN:if(n.ctrlKey||n.metaKey||n.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(n),this.state=un.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(n),this.state=un.PAN}break;default:this.state=un.NONE}this.state!==un.NONE&&this.dispatchEvent(Qh)}function pM(n){switch(this.state){case un.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(n);break;case un.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(n);break;case un.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(n);break}}function mM(n){this.enabled===!1||this.enableZoom===!1||this.state!==un.NONE||(n.preventDefault(),this.dispatchEvent(Qh),this._handleMouseWheel(this._customWheelEvent(n)),this.dispatchEvent(r0))}function gM(n){this.enabled!==!1&&this._handleKeyDown(n)}function xM(n){switch(this._trackPointer(n),this._pointers.length){case 1:switch(this.touches.ONE){case Yr.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(n),this.state=un.TOUCH_ROTATE;break;case Yr.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(n),this.state=un.TOUCH_PAN;break;default:this.state=un.NONE}break;case 2:switch(this.touches.TWO){case Yr.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(n),this.state=un.TOUCH_DOLLY_PAN;break;case Yr.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(n),this.state=un.TOUCH_DOLLY_ROTATE;break;default:this.state=un.NONE}break;default:this.state=un.NONE}this.state!==un.NONE&&this.dispatchEvent(Qh)}function _M(n){switch(this._trackPointer(n),this.state){case un.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(n),this.update();break;case un.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(n),this.update();break;case un.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(n),this.update();break;case un.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(n),this.update();break;default:this.state=un.NONE}}function bM(n){this.enabled!==!1&&n.preventDefault()}function MM(n){n.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function vM(n){n.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Jh=["auto","plain","spots","rosettes","reticulated","stripes","bands","saddle","dorsal-stripe","dapple","piebald","roan","brindle"],yn={socks:1,mask:2,blaze:4,"tail-tip":8,"tail-rings":16,"ear-tips":32,"rump-patch":64,"juvenile-spots":128},RS=Object.keys(yn),o0=["earth","savanna","reptile","plumage","slate","ink"],a0=["tawny","rufous","dun","fawn","grey","sable","olive","ochre"],c0=[...o0,...a0],da=["base","accent","belly","keratin","skin","eye","horn","plate"],yM={earth:{base:"#7a5a3c",accent:"#4a3322",belly:"#b89c78",keratin:"#2e2620",skin:"#8d6e5a",eye:"#120d0a",horn:"#6b6156",plate:"#5e4a36"},savanna:{base:"#c99a52",accent:"#6b3f1d",belly:"#ead8b0",keratin:"#2b241d",skin:"#8a6a4a",eye:"#100c08",horn:"#4a3a2a",plate:"#9a6a3a"},reptile:{base:"#5e7a3a",accent:"#37502a",belly:"#cfc890",keratin:"#3b3a2a",skin:"#6e7a4a",eye:"#2a2008",horn:"#8a8060",plate:"#7a6a3a"},plumage:{base:"#2f6fa8",accent:"#e0a020",belly:"#e8e2d0",keratin:"#e09a30",skin:"#c06040",eye:"#0a0a0a",horn:"#333038",plate:"#a03a2a"},slate:{base:"#6d6f70",accent:"#4c4e50",belly:"#8e8c88",keratin:"#3a3836",skin:"#7a7470",eye:"#0d0d0d",horn:"#9a948a",plate:"#585a5a"},ink:{base:"#2c2b31",accent:"#c84a2a",belly:"#5e5249",keratin:"#18161a",skin:"#6a5a50",eye:"#070707",horn:"#3a3030",plate:"#3a2c2c"},tawny:{base:"#a87c4f",accent:"#5a3a20",belly:"#d9c09a",keratin:"#2a2420",skin:"#8a6a52",eye:"#1a120a",horn:"#5a5048",plate:"#7a5a3a"},rufous:{base:"#8e4a2a",accent:"#3e2414",belly:"#e0cdb0",keratin:"#2a201a",skin:"#7a5040",eye:"#140c08",horn:"#4a4038",plate:"#6a3a22"},dun:{base:"#a8926a",accent:"#4a3a28",belly:"#d2c4a4",keratin:"#2e2822",skin:"#8a7660",eye:"#120e0a",horn:"#5a5048",plate:"#7a6a4e"},fawn:{base:"#b89a72",accent:"#6a4c32",belly:"#e6d8c0",keratin:"#2c2622",skin:"#9a7a64",eye:"#140e0a",horn:"#5c524a",plate:"#8a7256"},grey:{base:"#7b7872",accent:"#55524e",belly:"#96928a",keratin:"#3a3734",skin:"#827c76",eye:"#0e0d0c",horn:"#a09a90",plate:"#66625e"},sable:{base:"#4a3828",accent:"#241a12",belly:"#7a6450",keratin:"#1a1614",skin:"#5a4436",eye:"#0a0806",horn:"#3a3028",plate:"#3a2c20"},olive:{base:"#5f6a3a",accent:"#343c20",belly:"#c4be8c",keratin:"#34321f",skin:"#6a7048",eye:"#241c08",horn:"#807656",plate:"#6a6034"},ochre:{base:"#a8682f",accent:"#4a2a14",belly:"#e8dcc0",keratin:"#2a2018",skin:"#8a5c3c",eye:"#120c08",horn:"#3e3024",plate:"#8a5a30"}},SM={earth:"saddle",savanna:"reticulated",reptile:"bands",plumage:"plain",slate:"plain",ink:"plain",tawny:"plain",rufous:"plain",dun:"dorsal-stripe",fawn:"spots",grey:"plain",sable:"plain",olive:"bands",ochre:"reticulated"},EM=["torso","neck","head","muzzle","ear","limb-upper","limb-lower","foot","tail","tail-tip","horn","armor","wing","eye"];function l0(n){return typeof n=="string"&&Jh.includes(n)}function h0(n){return typeof n=="string"&&c0.includes(n)}function wM(n,e){return n==="auto"?SM[e]:n}const CS="fauna-composer-eye-catalogue-1",u0=["round","horizontal","vertical-slit","compound","eyespot"],TM=["raptor","owl","cat","gecko","frog","chameleon","crocodile","sclera","nocturnal","cephalopod","insect","spider","stalk"],eu=[...u0,...TM],AM=["dark-brown","brown","amber","gold","yellow","orange","red","green","pale"],RM=["blue","copper","grey-green"],CM=[...AM,...RM],LM=Object.freeze({blue:[.1,.22,.4],copper:[.48,.13,.02],"grey-green":[.26,.3,.13]}),PM=["muzzle","jaws","beak","flat-face","proboscis"],d0=Object.freeze({kind:"face",yawDeg:null,pitchDeg:null}),DM=Object.freeze([]),yi=n=>({structure:"camera",pupil:"round",pupilShape:null,size:1,placement:d0,lid:"almond",lidShape:null,brow:"none",sclera:"hidden",irisPattern:"plain",extras:"none",count:"pair",eyeshine:"none",irisBands:null,...n}),Io=n=>({pupil:"none",pupilShape:null,size:1,placement:d0,lid:"none",lidShape:null,brow:"none",sclera:"hidden",irisPattern:"plain",extras:"none",count:"pair",eyeshine:"none",irisBands:DM,...n}),IM={round:yi({label:"Round (birds, primates, large predators)",group:"pupil",standIn:"round",nativeFaces:["beak","flat-face","proboscis","muzzle","jaws"]}),horizontal:yi({label:"Horizontal bar (goat, horse, deer, octopus)",group:"pupil",standIn:"horizontal",pupil:"horizontal",eyeshine:"silver-white",nativeFaces:["muzzle","proboscis"]}),"vertical-slit":yi({label:"Vertical slit (fox, viper, small lizard)",group:"pupil",standIn:"vertical-slit",pupil:"vertical-slit",nativeFaces:["muzzle","jaws"]}),compound:Io({label:"Compound (centipede, generic arthropod)",group:"arthropod",standIn:"compound",structure:"compound",nativeFaces:["mandibles"]}),eyespot:Io({label:"Eyespots (worm)",group:"arthropod",standIn:"eyespot",structure:"eyespot",nativeFaces:["blunt"]}),raptor:yi({label:"Raptor (eagle, hawk, falcon)",group:"animal",standIn:"round",size:1.15,placement:{kind:"forward",yawDeg:55,pitchDeg:0},lidShape:{w:1,above:.55,below:.62},brow:"shelf",irisBands:["yellow","gold","brown","orange","red"],nativeFaces:["beak","jaws"]}),owl:yi({label:"Owl (huge frontal eyes, facial disc)",group:"animal",standIn:"round",pupil:"dilated",pupilShape:{r:.45},size:1.6,placement:{kind:"frontal",yawDeg:12,pitchDeg:0},lid:"round",lidShape:{w:.95,above:.9,below:.9},brow:"disc",irisBands:["yellow","orange","dark-brown"],nativeFaces:["beak"]}),cat:yi({label:"Cat (large, mid-width slit)",group:"animal",standIn:"vertical-slit",pupil:"slit-wide",pupilShape:{rx:.12,ry:.48,point:.6},size:1.25,placement:{kind:"forward",yawDeg:30,pitchDeg:null},lidShape:{w:1,above:.72,below:.62,cornerUpDeg:8},irisPattern:"radial",eyeshine:"green-gold",irisBands:["gold","yellow","green","amber","copper","blue"],nativeFaces:["muzzle"]}),gecko:yi({label:"Gecko (beaded slit, lidless)",group:"animal",standIn:"vertical-slit",pupil:"beaded-slit",pupilShape:{beads:5,bead:.07,pinch:.022,ry:.48},size:1.4,lid:"spectacle",lidShape:{w:.95,above:.9,below:.9},irisPattern:"reticulated",irisBands:["gold","pale","green","copper","grey-green"],nativeFaces:["jaws"]}),frog:yi({label:"Frog or toad (bulging dorsal eyes)",group:"animal",standIn:"horizontal",pupil:"horizontal",pupilShape:{rx:.48,ry:.22,n:2.6},size:1.45,placement:{kind:"dorsal",yawDeg:55,pitchDeg:35},brow:"raised-orbit",irisPattern:"reticulated",extras:"nictitating-lower",irisBands:["gold","amber","copper","red","green"],nativeFaces:["jaws"]}),chameleon:yi({label:"Chameleon (turret eyes, independent gaze)",group:"animal",standIn:"round",pupil:"pinhole",pupilShape:{r:.09,iris:.16,limbus:.2},size:1.5,placement:{kind:"independent",yawDeg:35,pitchDeg:-8,right:{yawDeg:110,pitchDeg:12}},lid:"turret",lidShape:{w:.22,above:.22,below:.22,turretW:.8,turretLift:.55},irisBands:["gold","dark-brown"],nativeFaces:["jaws"]}),crocodile:yi({label:"Crocodile (slit on raised orbits, third eyelid)",group:"animal",standIn:"vertical-slit",pupil:"vertical-slit",size:1.1,placement:{kind:"dorsal",yawDeg:60,pitchDeg:30},brow:"raised-orbit-shelf",irisPattern:"reticulated-faint",extras:"nictitating",eyeshine:"red-orange",irisBands:["gold","grey-green","pale","amber"],nativeFaces:["jaws"]}),sclera:yi({label:"Human-like (white sclera)",group:"animal",standIn:"round",pupilShape:{r:.2,iris:.44,limbus:.52},lid:"wide-almond",lidShape:{w:1.25,above:.5,below:.45},sclera:"white",irisPattern:"radial",irisBands:["dark-brown","brown","amber","green","blue","grey-green"],nativeFaces:["flat-face"]}),nocturnal:yi({label:"Nocturnal (huge, wide pupils: tarsier, bushbaby)",group:"animal",standIn:"round",pupil:"dilated",pupilShape:{r:.58,iris:.72,limbus:.9},size:1.75,placement:{kind:"frontal",yawDeg:null,pitchDeg:null,yawByFace:{"flat-face":10,muzzle:30}},lid:"round",lidShape:{w:1,above:.85,below:.8},eyeshine:"silver-white",eyeshineByFace:{"flat-face":"none"},irisBands:["brown","amber","gold"],nativeFaces:["flat-face","muzzle"]}),cephalopod:yi({label:"Cuttlefish (W-shaped pupil)",group:"animal",standIn:"horizontal",pupil:"w",pupilShape:{iris:.72,limbus:.92},size:1.4,placement:{kind:"lateral",yawDeg:80,pitchDeg:null},lid:"round",lidShape:{w:1,above:.8,below:.75},irisBands:["pale","gold","grey-green"],nativeFaces:["blunt"]}),insect:Io({label:"Insect (compound eyes and 3 ocelli)",group:"arthropod",standIn:"compound",structure:"compound",size:1.3,extras:"ocelli",count:"pair+3",nativeFaces:["mandibles"]}),spider:Io({label:"Spider (8 simple eyes)",group:"arthropod",standIn:"compound",structure:"ocellus",placement:{kind:"frontal",yawDeg:8,pitchDeg:null},count:"8",eyeshine:"silver-white",nativeFaces:["mandibles"]}),stalk:Io({label:"Stalk eyes (crab, snail)",group:"arthropod",standIn:"compound",structure:"stalk",placement:{kind:"stalk",yawDeg:40,pitchDeg:55},extras:"stalk",nativeFaces:["mandibles","blunt"]})},f0=n=>{if(n&&typeof n=="object"&&!Object.isFrozen(n)){for(const e of Object.values(n))f0(e);Object.freeze(n)}return n},fa=f0(Object.fromEntries(eu.map(n=>[n,{kind:n,...IM[n]}])));function po(n){return typeof n=="string"&&u0.includes(n)}function Th(n){return fa[n].structure==="camera"}function UM(n,e){return n==="eyespot"?e==="blunt"?"eyespot":"round":n==="stalk"?e==="blunt"?"eyespot":"compound":fa[n].standIn}function LS(n,e){return fa[n].nativeFaces.includes(e)||n==="round"&&PM.includes(e)}const PS="fauna-composer-face-2",NM=["auto",...eu],Pc=2;function bc(n){return n.eyeRules===1?1:2}const OM=["auto",...CM],p0=Object.freeze({"dark-brown":[.035,.018,.008],brown:[.09,.045,.015],amber:[.4,.2,.03],gold:[.55,.38,.06],yellow:[.7,.55,.05],orange:[.7,.25,.03],red:[.5,.04,.02],green:[.18,.28,.06],pale:[.55,.55,.5],...LM});function Dc(n){return n==="proboscis"?"muzzle":n}const fi=n=>({built:n,effect:null}),os=n=>({built:"none",effect:n}),Id="Not built: mammal skulls carry no bony crest.",Ud="Not built: birds and turtles never grow horns; only a casque (Crest).",yl=n=>({none:fi("none"),nasal:os(n),paired:os(n),ossicones:os(n),crest:os(n)}),FM=Object.freeze({muzzle:{none:fi("none"),nasal:fi("nasal"),paired:fi("paired"),ossicones:fi("ossicones"),crest:os(`${Id} Choose Paired horns or Ossicones.`)},proboscis:{none:fi("none"),paired:fi("paired"),nasal:os("Not built: a trunk face has no nose bones to carry a horn."),ossicones:os("Not built: ossicones grow only on giraffe-like muzzles."),crest:os(Id)},jaws:{none:fi("none"),nasal:fi("nasal"),paired:fi("paired"),crest:fi("crest"),ossicones:{built:"paired",effect:"Built as brow horns: ossicones grow only on giraffe-like muzzles."}},beak:{none:fi("none"),crest:fi("crest"),nasal:{built:"crest",effect:"Built as a casque: a beak carries a casque, not a nose horn."},paired:os(Ud),ossicones:os(Ud)},"flat-face":yl("Not built: primate faces carry no horns."),blunt:yl("Not built: a worm head has no skull to carry horns."),mandibles:yl("Not built: arthropod heads carry no bony horns.")});function tu(n){const e=FM[n.head],t=e?.[n.horns];return t?{...t}:fi("none")}const Uo=["round","horizontal","vertical-slit"],kM=Object.freeze({muzzle:Uo,proboscis:Uo,jaws:Uo,beak:Uo,"flat-face":Uo,blunt:["eyespot"],mandibles:["compound"]}),Ah=Object.freeze({"flat-face":{gazeYawDeg:15,k:.13},"muzzle-carnivore":{gazeYawDeg:35,k:.13},"muzzle-grazer":{gazeYawDeg:65,k:.14},"jaws-upright":{gazeYawDeg:45,k:.13},"jaws-sprawled":{gazeYawDeg:70,k:.13},proboscis:{gazeYawDeg:70,k:.07},beak:{gazeYawDeg:75,k:.16},mandibles:{gazeYawDeg:90,k:0},blunt:{gazeYawDeg:20,k:0},"mandibles-camera":{gazeYawDeg:70,k:.21},"blunt-camera":{gazeYawDeg:35,k:.19}}),zM=n=>n.feet==="hoof"||n.legs==="unguligrade"||n.legs==="pillar",nu=n=>n.layout==="sprawled"||n.layout==="limbless";function m0(n,e){if(e==="compound")return"mandibles";if(e==="eyespot")return"blunt";if(e&&(n.head==="mandibles"||n.head==="blunt"))return n.head==="mandibles"?"mandibles-camera":"blunt-camera";switch(n.head){case"muzzle":return zM(n)?"muzzle-grazer":"muzzle-carnivore";case"jaws":return nu(n)?"jaws-sprawled":"jaws-upright";default:return n.head}}function iu(n){switch(n.head){case"mandibles":return"compound";case"blunt":return"eyespot";case"beak":case"flat-face":case"proboscis":return"round";case"muzzle":return n.feet==="hoof"||n.legs==="unguligrade"?"horizontal":n.legs==="pillar"?"round":n.bodyLength<.9?"vertical-slit":"round";case"jaws":return nu(n)?"vertical-slit":"round";default:return"round"}}function BM(n){switch(n.head){case"mandibles":return n.layout==="many-legged"&&n.legPairs===4?"spider":n.layout!=="many-legged"||n.legPairs===3?"insect":"compound";case"muzzle":return n.feet==="hoof"||n.legs==="unguligrade"?"horizontal":n.legs==="pillar"?"round":n.bodyLength<.9?"cat":"round";case"jaws":return n.layout==="sprawled"&&n.bodyLength>=1?"crocodile":nu(n)?"vertical-slit":"round";default:return iu(n)}}function g0(n,e=bc(n)){return e===1?iu(n):BM(n)}function VM(n,e){if(!Th(e))return[];if(!po(e))return fa[e].irisBands??["dark-brown"];switch(n.head){case"muzzle":return e==="vertical-slit"?["amber","gold"]:["dark-brown","brown"];case"proboscis":return["dark-brown"];case"jaws":return["gold","amber","orange","green"];case"beak":return n.layout==="sprawled"?["dark-brown","green"]:["yellow","orange","red","dark-brown"];case"flat-face":return["dark-brown","brown"];case"mandibles":case"blunt":return["amber","gold"];default:return["dark-brown"]}}function HM(n,e){if(n.eyes!=="auto"||po(e)||!Th(e))return e;const t=iu(n);return Th(t)?t:e}function Nd(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e^=e>>>16,e=Math.imul(e,2146121005),e^=e>>>15,e=Math.imul(e,2221713035),(e^e>>>16)>>>0}const GM="compound eyes belong to arthropod heads.",WM="eyespots belong to worm heads.";function Mc(n){const e=bc(n),t=g0(n,e),i=n.eyes;let s=t,r=null;i!=="auto"&&(e===2||!po(i)||kM[n.head]?.includes(i)?s=i:n.head==="mandibles"?r="Built as compound: arthropod heads have compound eyes.":n.head==="blunt"?r="Built as eyespot: a worm head has only pigment eyespots.":r=`Built as ${t}: ${i==="compound"?GM:WM}`);const o=HM(n,s),a=VM(n,o);let l=null;a.length&&(l=n.iris!=="auto"?n.iris:po(o)?a[Nd(`face-eye-v1/${n.colorSeed}/${n.head}`)%a.length]:a[Nd(`face-eye-v2/${n.colorSeed}/${n.head}/${s}`)%a.length]);const c=UM(s,n.head),u=Ah[m0(n,c)];return{chosen:i,rules:e,kind:s,traits:fa[s],built:c,auto:i==="auto",iris:n.iris,irisBuilt:l,gazeYawDeg:u.gazeYawDeg,k:u.k,effect:r}}function XM(n){const e=[],t=tu(n);t.built!==n.horns&&e.push({part:"Horns",chosen:n.horns,effect:t.effect});const i=Mc(n);return i.effect&&e.push({part:"Eyes",chosen:n.eyes,effect:i.effect}),n.iris!=="auto"&&i.irisBuilt===null&&e.push({part:"Iris colour",chosen:n.iris,effect:i.rules===1&&po(i.kind)?"Iris colour has no effect: compound eyes and eyespots have no iris.":"Iris colour has no effect: compound eyes, simple eyes, eye stalks and eyespots have no iris."}),e}const qM=["muzzle","jaws","beak","flat-face","blunt","mandibles"];function YM(n,e){if(n.trunk!=="trunk")return;const t=typeof n.head=="string"&&qM.includes(n.head)?n.head:"muzzle";t==="muzzle"?(n.head="proboscis",e.push("Trunk: now a face type; this muzzle became Face = Proboscis.")):(n.trunk="none",e.push(`Trunk: removed. A trunk is a nose and only grows on a mammal muzzle; this ${t} face is kept. Choose Face -> Proboscis for a trunk.`))}function jM(n){return n.head==="proboscis"?{...n,head:"muzzle"}:n}const Ji=4,Od=1200,su=["limbless","biped","quadruped","sprawled","many-legged"],Ui={layout:su,torso:["slim","barrel","deep-chest","flat","annulated","segmented"],head:["muzzle","jaws","beak","flat-face","blunt","mandibles","proboscis"],horns:["none","nasal","paired","ossicones","crest"],legs:["pillar","plantigrade","digitigrade","unguligrade","arthropod"],feet:["hoof","paw","claw","pad","hand","spike"],arms:["none","small","grasping"],hands:["hand","claw","pincer"],tail:["none","stub","reptile","tufted","feather-fan","club"],armor:["none","dome","plates","osteoderms","bands"],wings:["none","feathered","membrane"],trunk:["none","trunk"],palette:c0,pattern:Jh,sex:["auto","female","male"],eyes:NM,iris:OM},ra={legPairs:[0,12,1],bodyLength:[.2,6,.01],girth:[.5,1.6,.01],posture:[0,1,.01],neckLength:[0,1.5,.01],headSize:[.5,1.6,.01],snoutLength:[0,1.5,.01],legLength:[.1,1.8,.01],armLength:[.2,1.4,.01],tailLength:[0,2,.01],wingSpan:[.5,4,.01],trunkLength:[.2,1.4,.01],colorSeed:[0,9999,1],marks:[0,255,1],patternScale:[.5,2,.05],patternContrast:[0,1.5,.05],countershade:[0,1,.05],dimorphism:[0,1,.05],variability:[0,2,.05],allometry:[0,1,.05],individualSeed:[0,9999,1],maturity:[.2,1,.01],condition:[-1,1,.05],eyeRules:[1,2,1]},DS=Object.freeze(["legPairs","bodyLength","girth","posture","neckLength","headSize","snoutLength","legLength","armLength","tailLength","wingSpan","trunkLength","colorSeed","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","individualSeed","maturity","condition"]),yo=["layout","legPairs","bodyLength","girth","posture","torso","neckLength","head","headSize","snoutLength","horns","legs","legLength","feet","arms","armLength","hands","tail","tailLength","armor","wings","wingSpan","trunk","trunkLength","palette","colorSeed"],ru=Object.freeze([...yo,"pattern","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","individualSeed","sex","maturity","condition"]),x0=Object.freeze([...ru,"eyes","iris"]),ou=[...x0,"eyeRules"],_0=[...yo,"pattern","marks","patternScale","patternContrast","countershade","dimorphism","variability","allometry","eyes","iris","eyeRules"],au={version:4,layout:"quadruped",legPairs:2,bodyLength:1,girth:1,posture:.2,torso:"slim",neckLength:.4,head:"muzzle",headSize:1,snoutLength:.6,horns:"none",legs:"digitigrade",legLength:.8,feet:"paw",arms:"none",armLength:.6,hands:"hand",tail:"tufted",tailLength:.6,armor:"none",wings:"none",wingSpan:2,trunk:"none",trunkLength:.8,palette:"earth",colorSeed:1,pattern:"auto",marks:0,patternScale:1,patternContrast:1,countershade:.8,dimorphism:0,variability:0,allometry:0,individualSeed:0,sex:"auto",maturity:1,condition:0,eyes:"auto",iris:"auto",eyeRules:Pc},$M=Object.freeze(Object.fromEntries(ru.filter(n=>!yo.includes(n)).map(n=>[n,au[n]]))),KM=Object.freeze({eyes:"auto",iris:"auto"}),ZM=Object.freeze({eyeRules:Pc}),Di=n=>Object.freeze({...au,...n}),Ii={variability:1,allometry:1},mo={dinosaur:Di({layout:"biped",legPairs:1,bodyLength:1.6,girth:1.05,posture:.12,torso:"deep-chest",neckLength:.45,head:"jaws",headSize:1.35,snoutLength:1,horns:"crest",legs:"digitigrade",legLength:1.05,feet:"claw",arms:"small",armLength:.38,hands:"claw",tail:"reptile",tailLength:1.6,palette:"reptile",colorSeed:17,marks:16,dimorphism:0,...Ii}),turtle:Di({layout:"sprawled",bodyLength:.55,girth:1.1,posture:0,torso:"flat",neckLength:.35,head:"beak",headSize:.9,snoutLength:.25,legs:"pillar",legLength:.42,feet:"pad",tail:"stub",tailLength:.25,armor:"dome",palette:"reptile",colorSeed:211,dimorphism:0,...Ii}),giraffe:Di({layout:"quadruped",bodyLength:1.5,girth:.9,posture:.7,torso:"slim",neckLength:1.5,head:"muzzle",headSize:.85,snoutLength:.8,horns:"ossicones",legs:"unguligrade",legLength:1.45,feet:"hoof",tail:"tufted",tailLength:.6,palette:"savanna",colorSeed:37,marks:0,dimorphism:.3,...Ii}),bird:Di({layout:"biped",legPairs:1,bodyLength:.22,girth:1.2,posture:.45,torso:"barrel",neckLength:.45,head:"beak",headSize:1.2,snoutLength:.55,legs:"digitigrade",legLength:.85,feet:"claw",tail:"feather-fan",tailLength:.9,wings:"feathered",wingSpan:3.2,palette:"plumage",colorSeed:5,dimorphism:.6,...Ii}),ostrich:Di({layout:"biped",legPairs:1,bodyLength:.8,girth:1.1,posture:.3,torso:"barrel",neckLength:1.5,head:"beak",headSize:.75,snoutLength:.45,legs:"digitigrade",legLength:1.8,feet:"claw",tail:"feather-fan",tailLength:.4,wings:"feathered",wingSpan:1.3,palette:"ink",colorSeed:88,marks:1,dimorphism:.8,...Ii}),rhinoceros:Di({layout:"quadruped",bodyLength:2.1,girth:1.4,posture:.1,torso:"barrel",neckLength:.2,head:"muzzle",headSize:1.15,snoutLength:.75,horns:"nasal",legs:"pillar",legLength:.5,feet:"pad",tail:"tufted",tailLength:.25,armor:"osteoderms",palette:"slate",colorSeed:61,countershade:.3,dimorphism:.2,...Ii}),ape:Di({layout:"biped",legPairs:1,bodyLength:.6,girth:1.15,posture:.85,torso:"deep-chest",neckLength:.1,head:"flat-face",headSize:1.1,snoutLength:.35,legs:"plantigrade",legLength:1.05,feet:"hand",arms:"grasping",armLength:1.25,hands:"hand",tail:"none",tailLength:0,palette:"ink",colorSeed:143,marks:2,dimorphism:.5,...Ii}),worm:Di({layout:"limbless",legPairs:0,bodyLength:1.1,girth:1,posture:0,torso:"annulated",neckLength:0,head:"blunt",headSize:1,snoutLength:.2,legs:"pillar",feet:"pad",tail:"none",tailLength:0,palette:"earth",colorSeed:401,dimorphism:0,...Ii}),centipede:Di({layout:"many-legged",legPairs:11,bodyLength:.55,girth:.9,posture:0,torso:"segmented",neckLength:0,head:"mandibles",headSize:1,snoutLength:.3,legs:"arthropod",legLength:.2,feet:"spike",tail:"none",tailLength:0,armor:"bands",palette:"ink",colorSeed:909,dimorphism:0,...Ii}),"shelled-giraffe-bird":Di({layout:"biped",legPairs:1,bodyLength:.9,girth:1.2,posture:.3,torso:"barrel",neckLength:1.3,head:"beak",headSize:.9,snoutLength:.5,horns:"crest",legs:"unguligrade",legLength:1.3,feet:"hoof",tail:"stub",tailLength:.3,armor:"dome",wings:"feathered",wingSpan:1.6,palette:"savanna",colorSeed:2718,dimorphism:0,...Ii}),"trunked-centipede":Di({layout:"many-legged",legPairs:7,bodyLength:1.4,girth:1.3,posture:0,torso:"segmented",neckLength:.3,head:"proboscis",headSize:1,snoutLength:.4,horns:"none",legs:"pillar",legLength:.24,feet:"pad",tail:"tufted",tailLength:.2,armor:"bands",trunk:"trunk",trunkLength:1,palette:"slate",colorSeed:3141,dimorphism:0,...Ii}),"winged-ape-rhino":Di({layout:"quadruped",bodyLength:1.2,girth:1.25,posture:.25,torso:"deep-chest",neckLength:.15,head:"flat-face",headSize:1.1,snoutLength:.5,horns:"none",legs:"plantigrade",legLength:.7,feet:"hand",arms:"grasping",armLength:.8,hands:"hand",tail:"club",tailLength:.8,wings:"membrane",wingSpan:2.4,palette:"earth",colorSeed:1618,dimorphism:0,...Ii})},QM=Object.keys(mo),IS={dinosaur:"Dinosaur-like",turtle:"Turtle-like",giraffe:"Giraffe-like",bird:"Bird-like",ostrich:"Ostrich-like",rhinoceros:"Rhinoceros-like",ape:"Ape-like",worm:"Worm-like",centipede:"Centipede-like","shelled-giraffe-bird":"Hybrid: shelled giraffe-bird","trunked-centipede":"Hybrid: trunked centipede","winged-ape-rhino":"Hybrid: winged ape-rhino"};function US(n){if(typeof n!="string"||!Object.hasOwn(mo,n))throw new Error(`Unknown composer preset: ${String(n).slice(0,40)}`);return{...mo[n]}}function NS(n){return typeof n=="string"&&Object.hasOwn(mo,n)}const JM={"shelled-giraffe-bird":{horns:"ossicones"},"trunked-centipede":{horns:"nasal"},"winged-ape-rhino":{horns:"nasal"}};function ev(n){return QM.find(e=>{const t={...mo[e],...JM[e]};return yo.every(i=>t[i]===n[i])})}const b0=(n,e)=>e>=1?Math.round(n):Math.round(n/e)*e,M0=n=>Number(n.toFixed(4));function v0(n){if(!su.includes(n))throw new Error(`Unknown composer layout: ${String(n).slice(0,40)}`);return n==="limbless"?[0,0]:n==="biped"?[1,1]:n==="quadruped"||n==="sprawled"?[2,2]:[3,12]}function br(n){const e=[],t=!!n&&typeof n=="object"&&!Array.isArray(n);let i=t?n:{};t||e.push("Recipe was not a plain object; defaults used."),t&&"version"in i&&i.version!==1&&i.version!==2&&i.version!==3&&i.version!==Ji&&e.push(`Recipe version ${String(i.version).slice(0,12)} is not supported; fields were read as version ${Ji}.`),t&&(i.version===1||i.version===2)&&(i={...i},YM(i,e));const s={...au},r=s;for(const l of Object.keys(Ui)){if(!(l in i))continue;const c=i[l],u=Ui[l];typeof c=="string"&&u.includes(c)?r[l]=c:e.push(`Unknown ${l} "${String(c).slice(0,40)}"; using ${String(r[l])}.`)}for(const l of Object.keys(ra)){if(!(l in i))continue;const[c,u,f]=ra[l],p=i[l],m=typeof p=="number"?p:typeof p=="string"&&p.trim()?Number(p):NaN;if(!Number.isFinite(m)){e.push(`${l} is not a finite number; using ${String(r[l])}.`);continue}const g=M0(Math.max(c,Math.min(u,b0(m,f))));Math.abs(g-m)>f*.5+1e-9&&e.push(`${l} ${m} limited to ${g}.`),r[l]=g}const[o,a]=v0(s.layout);if(s.legPairs<o||s.legPairs>a){const l=Math.max(o,Math.min(a,s.legPairs));"legPairs"in i&&e.push(`${s.layout} body uses ${o===a?o:`${o}-${a}`} leg pairs; ${s.legPairs} set to ${l}.`),s.legPairs=l}return s.trunk=s.head==="proboscis"?"trunk":"none",s.version=Ji,{recipe:s,issues:e}}function tv(n){const e=[],t=n.layout!=="limbless";if(t||(e.push({part:"Legs and feet",chosen:`${n.legs} / ${n.feet}`,effect:"Not built: a limbless body has no legs. It crawls on its belly instead."}),n.neckLength>0&&e.push({part:"Neck",chosen:n.neckLength.toFixed(2),effect:"A limbless body has no separate neck; the front of the body is raised and lengthened instead."})),n.layout==="many-legged"&&n.legs!=="arthropod"&&n.legLength>.45&&e.push({part:"Leg length",chosen:n.legLength.toFixed(2),effect:"Shortened to 0.45 body lengths so neighbouring leg pairs do not cross."}),n.armor==="dome"&&(n.layout==="limbless"||n.layout==="many-legged")&&e.push({part:"Shell",chosen:"dome",effect:"Covers only the middle third so the long flexible body can still bend."}),n.armor==="dome"&&n.wings!=="none"&&e.push({part:"Wings",chosen:n.wings,effect:"Wing roots are moved to the shell rim instead of the back."}),n.armor==="plates"&&n.layout==="many-legged"&&e.push({part:"Armor",chosen:"plates",effect:"One plate per body segment."}),e.push(...XM(n)),n.arms!=="none"&&n.layout!=="biped"&&e.push({part:"Arms",chosen:n.arms,effect:n.layout==="limbless"?"Attached behind the head; the body still crawls.":"Added as an extra pair in front of the walking legs; they do not touch the ground."}),n.arms==="none"&&n.hands!=="hand"&&e.push({part:"Hands",chosen:n.hands,effect:"Not built because no arms are selected."}),n.wings!=="none"){const i=y0(n);n.wingSpan>i&&e.push({part:"Wing span",chosen:n.wingSpan.toFixed(2),effect:`Limited to ${i.toFixed(2)} body lengths so folded wings stay off the ground.`}),e.push({part:"Wings",chosen:n.wings,effect:"Grounded display and folding only. Flight is not simulated."})}return n.tail==="none"&&n.tailLength>0&&e.push({part:"Tail length",chosen:n.tailLength.toFixed(2),effect:"Ignored because no tail is selected."}),n.feet==="spike"&&n.layout!=="many-legged"&&t&&e.push({part:"Feet",chosen:"spike",effect:"Pointed tips carry the weight on a very small contact area."}),n.layout==="biped"&&n.posture>.6&&n.tail!=="none"&&n.tailLength>1&&e.push({part:"Tail",chosen:n.tail,effect:"An upright body lets a long tail rest along the ground."}),e}function y0(n){return n.layout==="limbless"?1.5:n.layout==="many-legged"||n.layout==="sprawled"?2:4}function oa(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e^=e>>>16,e=Math.imul(e,2146121005),e^=e>>>15,e=Math.imul(e,2221713035),(e^e>>>16)>>>0}function cu(n){let e=oa(n)||1;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}const nv=["muzzle","jaws","beak","flat-face","blunt","mandibles"];function iv(n){const e=cu(`composer-random-v1/${String(n).slice(0,160)}`),t=(c,u)=>{if(!u)return c[Math.floor(e()*c.length)%c.length];const f=u.reduce((m,g)=>m+g,0);let p=e()*f;for(let m=0;m<c.length;m++)if(p-=u[m],p<=0)return c[m];return c[c.length-1]},i=(c,u,f)=>{const[p,m,g]=ra[c],x=u??p;return M0(b0(x+((f??m)-x)*e(),g))},s=t(su,[1,2.2,2.2,1.3,1.3]),[r,o]=v0(s),a=s==="many-legged"?t(Ui.legs,[1,.5,.4,.3,2.5]):t(Ui.legs,[1,1,1.2,1,.4]),l={...$M,...KM,...ZM,version:Ji,layout:s,legPairs:r+Math.floor(e()*(o-r+1)),bodyLength:s==="limbless"||s==="many-legged"?i("bodyLength",.4,2):i("bodyLength",.3,2.4),girth:i("girth",.75,1.4),posture:i("posture"),torso:t(s==="limbless"?["annulated","slim","segmented"]:s==="many-legged"?["segmented","annulated","flat"]:["slim","barrel","deep-chest","flat"]),neckLength:s==="limbless"?0:i("neckLength",0,1.5),head:t(nv),headSize:i("headSize",.7,1.4),snoutLength:i("snoutLength",.1,1.2),horns:t(Ui.horns,[2.5,1,1,1,1]),legs:a,legLength:s==="many-legged"?i("legLength",.12,.4):s==="sprawled"?i("legLength",.3,.7):i("legLength",.4,1.6),feet:a==="arthropod"?t(["spike","claw","hand"],[3,1,.5]):t(Ui.feet,[1,1,1,1,.6,.3]),arms:t(Ui.arms,s==="biped"?[1,1,1.5]:[3,.5,1]),armLength:i("armLength",.3,1.2),hands:t(Ui.hands),tail:t(Ui.tail,[.8,.8,1.5,1,.8,.6]),tailLength:i("tailLength",.2,1.6),armor:t(Ui.armor,[2,1,.8,.8,.8]),wings:t(Ui.wings,[2.2,1,1]),wingSpan:i("wingSpan",1,3),trunk:t(Ui.trunk,[3,1]),trunkLength:i("trunkLength",.4,1.2),palette:t(o0),colorSeed:Math.floor(e()*1e4)};return l.tail==="none"&&(l.tailLength=0),l}const sv=75;function rv(n,e){const t=`composer-wild-eyes-1/${String(n).slice(0,160)}`;if(oa(t)%1e3>=sv)return"auto";const i=g0(e,Pc),s=eu.filter(r=>r!==i);return s[oa(`${t}/kind`)%s.length]}function OS(n){const e=iv(n);return e.trunk==="trunk"&&(e.head==="muzzle"?e.head="proboscis":e.trunk="none"),e.horns=tu(e).built,e.eyeRules=Pc,e.eyes=rv(n,e),e.iris="auto",br(e).recipe}const ov=new Set(Object.keys(ra));function FS(n){const{recipe:e}=br(n);return[`v${Ji}`,...ou.map(t=>`${t}_${String(e[t])}`)].join("*")}function kS(n){if(typeof n!="string"||!n.trim())return{recipe:null,issues:[],error:"Empty composer recipe."};if(n.length>Od)return{recipe:null,issues:[],error:`Composer recipe is longer than ${Od} characters.`};const[e,...t]=n.split("*"),i=e==="v1"?1:e==="v2"?2:e==="v3"?3:e===`v${Ji}`?Ji:0;if(!i)return{recipe:null,issues:[],error:`Unsupported composer recipe version "${String(e).slice(0,12)}".`};const s=i===1,r=i===1?yo:i===2?ru:i===3?x0:ou,o={},a=[];for(const u of t){const f=u.indexOf("_"),p=f>0?u.slice(0,f):u,m=f>0?u.slice(f+1):"";if(!r.includes(p)){a.push(`Ignored unknown recipe field "${p.slice(0,24)}".`);continue}if(p in o){a.push(`Repeated recipe field "${p}"; first value kept.`);continue}o[p]=ov.has(p)?m.trim()?Number(m):NaN:m}const l=br({...o,version:i});i>=3&&"trunk"in o&&o.trunk!==l.recipe.trunk&&a.push("Trunk follows the Face; trunk field ignored."),s&&cv(l.recipe);const c=i<4?av(l.recipe):null;return{recipe:l.recipe,issues:[...a,...l.issues,...c?[c]:[]],error:null}}function av(n){const e=Mc({...n,eyeRules:2}),t=Mc({...n,eyeRules:1});if(e.kind===t.kind&&e.irisBuilt===t.irisBuilt)return null;const i=s=>`${s.kind}${s.irisBuilt?` (${s.irisBuilt})`:""}`;return`Eyes: upgraded to the current eye rules: ${i(e)} eyes, where the earlier rules built ${i(t)}. Eye rules -> Earlier restores them.`}function cv(n){const e=ev(n);if(!e)return;const t=n,i=mo[e];for(const s of _0)yo.includes(s)||(t[s]=i[s])}function zS(n,e){return n.version===Ji&&e.version===Ji&&ou.every(t=>n[t]===e[t])}function BS(n,e){return n.version===Ji&&e.version===Ji&&_0.every(t=>n[t]===e[t])}const Fd=Object.freeze({mapSize:2048,depthBiasM:.003,normalBiasM:.002}),Vr=n=>[n.x,n.y,n.z].every(Number.isFinite),lv=n=>{const e=[];for(const t of[n.min.x,n.max.x])for(const i of[n.min.y,n.max.y])for(const s of[n.min.z,n.max.z])e.push(new ue(t,i,s));return e};function VS(n,e,{groundY:t=-.004,paddingM:i=.1,depthBiasM:s=.001,normalBiasM:r=.002}={}){if(!n.isDirectionalLight||!Vr(e.min)||!Vr(e.max)||e.isEmpty())throw new Error("Finite nonempty full caster bounds and a directional light are required");if(![t,i,s,r].every(Number.isFinite)||i<=0||i>100||s<0||s>.005||r<0||r>.01)throw new Error("Invalid review shadow ground, padding or bounded physical bias");const o=e.getSize(new ue),a=Math.max(o.x,o.y,o.z);if(!(a>0)||!Number.isFinite(a))throw new Error("Caster bounds must have finite positive extent");if(![n.shadow.mapSize.x,n.shadow.mapSize.y].every(v=>Number.isFinite(v)&&v>=1))throw new Error("Positive finite shadow map dimensions are required");n.updateWorldMatrix(!0,!1),n.target.updateWorldMatrix(!0,!1);const l=n.getWorldPosition(new ue),c=n.target.getWorldPosition(new ue);if(!Vr(l)||!Vr(c)||!Vr(n.shadow.camera.up)||!(n.shadow.camera.up.lengthSq()>0))throw new Error("Finite light, target and shadow camera orientation are required");const u=l.clone().sub(c);if(!(u.length()>1e-9))throw new Error("Light and target must differ");if(u.normalize(),!(u.y>1e-4))throw new Error("Review key must shine downward onto the ground");const f=lv(e),p=f.map(v=>v.clone().addScaledVector(u,-(v.y-t)/u.y)),m=[...f,...p];if(!m.every(Vr))throw new Error("Nonfinite shadow ground projection");const g=Math.min(...m.map(v=>l.clone().sub(v).dot(u))),x=Math.max(0,i+.001-g),d=l.clone().addScaledVector(u,x),h=new Ht().lookAt(d,c,n.shadow.camera.up).setPosition(d).invert(),M=new Ps().setFromPoints(m.map(v=>v.clone().applyMatrix4(h))),_={left:M.min.x-i,right:M.max.x+i,bottom:M.min.y-i,top:M.max.y+i,near:Math.max(1e-4,-M.max.z-i),far:-M.min.z+i};if(!Object.values(_).every(Number.isFinite)||_.far<=_.near||_.right<=_.left||_.top<=_.bottom)throw new Error("Invalid fitted directional shadow frustum");const b=Math.min(s,a*.001),S=Math.min(r,a*.002);return x>0&&(n.position.copy(n.parent?n.parent.worldToLocal(d.clone()):d),n.updateWorldMatrix(!0,!1)),Object.assign(n.shadow.camera,_),n.shadow.camera.updateProjectionMatrix(),n.shadow.bias=-b/(_.far-_.near),n.shadow.normalBias=S,n.shadow.updateMatrices(n),n.shadow.needsUpdate=!0,{frustum:_,direction:u.toArray(),groundY:t,paddingM:i,lightRetreatM:x,casterBounds:{min:e.min.toArray(),max:e.max.toArray()},groundBounds:{min:new Ps().setFromPoints(p).min.toArray(),max:new Ps().setFromPoints(p).max.toArray()},texelSizeM:[(_.right-_.left)/n.shadow.mapSize.x,(_.top-_.bottom)/n.shadow.mapSize.y],depthBiasM:b,normalBiasM:S,normalizedDepthBias:n.shadow.bias}}const hv=new Et("#b5cce3"),S0=new Et("#697451"),uv=["studio","planet-noon","planet-evening"],jr=[-20,38,26],kd=Math.hypot(...jr);function zd(n){const e=Of.degToRad(n),t=Math.hypot(jr[0],jr[2]),i=Math.cos(e)*kd;return[jr[0]/t*i,Math.sin(e)*kd,jr[2]/t*i]}const Bd={color:"#91b3cc",intensity:.22*.4},Vd=`#${hv.getHexString()}`,Hd=`#${S0.getHexString()}`,dv=Object.freeze({studio:Object.freeze({id:"studio",label:"Studio (bright, even)",description:"The original Lab light: strong cool fill from every side. Shows shape everywhere; flatter than any real sky.",background:"#08131a",ground:"#36504a",exposure:1.15,key:Object.freeze({color:"#ffe0b2",intensity:3.8,position:jr}),hemisphere:Object.freeze({sky:"#cdeeff",ground:"#263d32",intensity:2.8}),ambient:Object.freeze({color:"#56817b",intensity:.6})}),"planet-noon":Object.freeze({id:"planet-noon",label:"Planet surface, midday",description:"In-game daylight: sun 55 degrees high, weak sky fill and ground bounce, with cast shadows.",background:"#a9c0d6",ground:Hd,exposure:1.2,key:Object.freeze({color:"#fff1dc",intensity:3,position:zd(55)}),hemisphere:Object.freeze({sky:Vd,ground:"surface",intensity:.7}),ambient:Object.freeze({...Bd})}),"planet-evening":Object.freeze({id:"planet-evening",label:"Planet surface, evening",description:"Low warm sun 12 degrees high with long shadows; dim sky fill.",background:"#c9a385",ground:Hd,exposure:1.2,key:Object.freeze({color:"#ffb070",intensity:1.6,position:zd(12)}),hemisphere:Object.freeze({sky:Vd,ground:"surface",intensity:.35}),ambient:Object.freeze({...Bd})})});function fv(n){return typeof n=="string"&&uv.includes(n)}function pv(n){if(n.hemisphere.ground!=="surface")return new Et(n.hemisphere.ground);const e=new ue(0,1,0),t=new ue(...n.key.position).normalize(),i=new Et(n.hemisphere.sky),s=new Et(n.key.color),r=Math.max(0,e.dot(t))*Math.max(0,n.key.intensity)/n.hemisphere.intensity;return s.multiplyScalar(r).add(i).multiply(S0)}function HS(n){return(n.hemisphere.intensity+n.ambient.intensity)/n.key.intensity}function GS(n,e){const t=typeof e=="string"?dv[e]:e;if(!t||!fv(t.id))throw new Error(`Unknown fauna review lighting preset: ${String(e).slice(0,40)}`);const i=new mg(t.hemisphere.sky,16777215,t.hemisphere.intensity);i.groundColor.copy(pv(t)),i.name=`fauna-review-${t.id}-sky`;const s=new _g(t.key.color,t.key.intensity);s.position.set(...t.key.position),s.shadow.mapSize.set(Fd.mapSize,Fd.mapSize),s.name=`fauna-review-${t.id}-key`;const r=new bg(t.ambient.color,t.ambient.intensity);r.name=`fauna-review-${t.id}-ambient`;const o=n.background;n.add(i,s,r),n.background=new Et(t.background);let a=!1;return{preset:t,lights:[i,s,r],key:s,hemisphere:i,ambient:r,dispose(){a||(a=!0,n.remove(i,s,r),s.shadow.map?.dispose(),s.shadow.dispose(),n.background instanceof Et&&n.background.equals(new Et(t.background))&&(n.background=o))}}}const WS="fauna-coat-1",Ic={marks:[0,255],scale:[.5,2],contrast:[0,1.5],countershade:[0,1],bellyLine:[-1,1],warp:[0,1],threshold:[-.3,.3],juvenileSpots:[0,1],greying:[0,1]},go={plain:0,spots:11,rosettes:8,reticulated:6.5,stripes:4.5,bands:3,saddle:0,"dorsal-stripe":0,dapple:12,piebald:2.2,roan:60,brindle:9};function aa(n,e,t){return n<e?e:n>t?t:n}function Qs(n){return n<0?0:n>1?1:n}const $n=1/4294967296,rn=new Uint32Array(3);function pa(n){let e=n>>>0^2654435769|0;return e=Math.imul(e^e>>>16,2146121005),e=Math.imul(e^e>>>15,2221713035),e^e>>>16|0}function Ei(n,e,t,i){let s=Math.imul(n|0,1664525)+1013904223+i|0,r=Math.imul(e|0,1664525)+1013904223^(i<<11|i>>>21)|0,o=Math.imul(t|0,1664525)+1013904223+Math.imul(i,668265263)|0;s=s+Math.imul(r,o)|0,r=r+Math.imul(o,s)|0,o=o+Math.imul(s,r)|0,s^=s>>>16,r^=r>>>16,o^=o>>>16,s=s+Math.imul(r,o)|0,r=r+Math.imul(o,s)|0,o=o+Math.imul(s,r)|0,rn[0]=s>>>0,rn[1]=r>>>0,rn[2]=o>>>0}function Rh(n,e,t,i){return Ei(n,e,t,pa(i)),rn[2]}function io(n){return n*n*n*(n*(n*6-15)+10)}const we=new Float64Array(4);function Wn(n){const e=we[0],t=we[1],i=we[2],s=Math.floor(e),r=Math.floor(t),o=Math.floor(i),a=io(e-s),l=io(t-r),c=io(i-o);Ei(s,r,o,n);const u=rn[2];Ei(s+1,r,o,n);const f=rn[2];Ei(s,r+1,o,n);const p=rn[2];Ei(s+1,r+1,o,n);const m=rn[2];Ei(s,r,o+1,n);const g=rn[2];Ei(s+1,r,o+1,n);const x=rn[2];Ei(s,r+1,o+1,n);const d=rn[2];Ei(s+1,r+1,o+1,n);const h=rn[2],M=u+(f-u)*a,_=p+(m-p)*a,b=g+(x-g)*a,S=d+(h-d)*a,v=M+(_-M)*l,E=b+(S-b)*l;we[3]=(v+(E-v)*c)*$n}const so=new Float64Array(3);function mv(n){const e=we[0],t=we[1],i=we[2],s=Math.floor(e),r=Math.floor(t),o=Math.floor(i),a=io(e-s),l=io(t-r),c=io(i-o);let u=0,f=0,p=0;for(let m=0;m<8;m++){const g=m&1,x=m>>1&1,d=m>>2&1,h=(g?a:1-a)*(x?l:1-l)*(d?c:1-c);Ei(s+g,r+x,o+d,n),u+=rn[0]*h,f+=rn[1]*h,p+=rn[2]*h}so[0]=u*$n,so[1]=f*$n,so[2]=p*$n}function gv(n,e,t,i){return we[0]=n,we[1]=e,we[2]=t,Wn(pa(i)),we[3]}function No(n){const e=we[0],t=we[1],i=we[2];Wn(n);const s=we[3];we[0]=e*2.03+17.31,we[1]=t*2.03-9.17,we[2]=i*2.03+5.71,Wn(n^1540483477|0),we[3]=(2*s+we[3])/3}const Wo=.9;function Ya(n,e){const t=we[0],i=we[1],s=we[2],r=Math.floor(t),o=Math.floor(i),a=Math.floor(s);let l=1e9,c=1e9,u=0,f=0,p=0,m=0;const g=(1-Wo)*.5;for(let x=-1;x<=1;x++)for(let d=-1;d<=1;d++)for(let h=-1;h<=1;h++){const M=r+x,_=o+d,b=a+h;Ei(M,_,b,n);const S=t-(M+g+Wo*rn[0]*$n),v=i-(_+g+Wo*rn[1]*$n),E=s-(b+g+Wo*rn[2]*$n),R=S*S+v*v+E*E;R<l?(c=l,l=R,u=Math.imul(rn[0]^rn[2]>>>7,2654435761)^rn[1],f=S,p=v,m=E):R<c&&(c=R)}e[0]=Math.sqrt(l),e[1]=Math.sqrt(c),e[2]=u>>>0,e.length>=6&&(e[3]=f,e[4]=p,e[5]=m)}function xv(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e^=e>>>16,e=Math.imul(e,2146121005),e^=e>>>15,e=Math.imul(e,2221713035),(e^e>>>16)>>>0}function Uc(n){let e=xv(n)||1;return()=>{e=e+1831565813>>>0;let t=e;return t=Math.imul(t^t>>>15,t|1),t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function ro(n){return n<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function oo(n){return n<=.0031308?n*12.92:1.055*Math.pow(n,1/2.4)-.055}function E0(n){return .2126*n[0]+.7152*n[1]+.0722*n[2]}function _v(n){const e=parseInt(n.replace("#",""),16);return[ro((e>>16&255)/255),ro((e>>8&255)/255),ro((e&255)/255)]}function Xr(n,e,t,i){const s=oo(Qs(n[0])),r=oo(Qs(n[1])),o=oo(Qs(n[2])),a=Math.max(s,r,o),l=Math.min(s,r,o),c=a-l;let u=0;c>1e-12&&(a===s?u=(r-o)/c/6:a===r?u=((o-s)/c+2)/6:u=((s-r)/c+4)/6,u<0&&(u+=1));const f=a>0?c/a:0;u=((u+e)%1+1)%1;const p=Qs(f*t),m=Qs(a*i),g=Math.floor(u*6),x=u*6-g,d=m*(1-p),h=m*(1-x*p),M=m*(1-(1-x)*p);let _=m,b=M,S=d;switch(g%6){case 1:_=h,b=m,S=d;break;case 2:_=d,b=m,S=M;break;case 3:_=d,b=h,S=m;break;case 4:_=M,b=d,S=m;break;case 5:_=m,b=d,S=h;break}return[ro(_),ro(b),ro(S)]}const bv={base:[.02,.6],accent:[.02,.6],belly:[.02,.6],skin:[.02,.6],keratin:[0,.5],eye:[0,.6],horn:[0,.6],plate:[.02,.6]};function Ch(n,e){const[t,i]=bv[n],s=E0(e);if(s>=t&&s<=i)return e;if(s<=1e-9){const o=Math.max(t,1e-4);return[o,o,o]}const r=(s<t?t:i)/s;return[e[0]*r,e[1]*r,e[2]*r]}function w0(n){const e={};for(const t of da)e[t]=[n[t][0],n[t][1],n[t][2]];return e}function T0(n,e){const t=Uc(`coat-species-v1/${n}/${e}`),i=(t()-.5)*.08,s=(t()-.5)*.24,r=(t()-.5)*.2,o=Math.floor(t()*4294967296)>>>0;return{dh:i,ds:s,dv:r,seed:o}}function Mv(n,e){if(!h0(n))throw new RangeError(`Unknown coat palette '${String(n)}'`);const t=T0(n,e),i=yM[n],s={};for(const r of da)s[r]=Ch(r,Xr(_v(i[r]),t.dh,1+t.ds,1+t.dv));return s}const Sl={melanistic:.012,leucistic:.004,erythristic:.008};function A0(n,e){const t=Number.isFinite(e)?Qs(e):0,i=Uc(`coat-individual-v1/${n}`),s=[];for(let u=0;u<9;u++)s.push(i());if(t===0)return{hue:0,saturation:0,value:0,reseed:0,scale:0,threshold:0,warp:0,greying:0,morph:"none"};const r=s[8],o=Sl.melanistic*t,a=Sl.leucistic*t,l=Sl.erythristic*t,c=r<o?"melanistic":r<o+a?"leucistic":r<o+a+l?"erythristic":"none";return{hue:(s[0]*2-1)*.015*t,value:(s[1]*2-1)*.08*t,saturation:(s[2]*2-1)*.1*t,reseed:(Math.floor(s[3]*4294967296)|1)>>>0,scale:(s[4]*2-1)*.08*t,threshold:(s[5]*2-1)*.06*t,warp:(s[6]*2-1)*.1*t,greying:.3*t*s[7]*s[7],morph:c}}const vv=["base","accent","belly","skin"];function R0(n,e){const t=w0(n.colours);if(e.hue!==0||e.saturation!==0||e.value!==0||e.morph!=="none"){for(const s of vv){let r=Xr(t[s],e.hue,1+e.saturation,1+e.value);if(e.morph==="melanistic")r=Xr(r,0,1,.35);else if(e.morph==="erythristic")r=Xr(r,-.04,1.2,1);else if(e.morph==="leucistic"){r=Xr(r,0,.25,1);const o=E0(r),a=Math.min(.55,o+(.55-o)*.8);if(o>1e-6){const l=a/o;r=[r[0]*l,r[1]*l,r[2]*l]}}t[s]=Ch(s,r)}e.value!==0&&(t.plate=Ch("plate",Xr(t.plate,0,1,1+e.value)))}return{...n,colours:t,seed:e.reseed?(n.seed^e.reseed)>>>0:n.seed,scale:aa(n.scale*(1+e.scale),.5,2),threshold:aa(n.threshold+e.threshold,-.3,.3),warp:Qs(n.warp+e.warp),greying:Qs(n.greying+e.greying)}}function C0(n,e,t={}){if(!h0(n))throw new RangeError(`Unknown coat palette '${String(n)}'`);const i=T0(n,e),s=Mv(n,e),r=t.pattern??"auto";if(!l0(r))throw new RangeError(`Unknown coat pattern '${String(r)}'`);const o=aa(Math.round(t.marks??0),0,255),a=w0(s);if(t.colours)for(const u of da){const f=t.colours[u];f&&(a[u]=[f[0],f[1],f[2]])}const l=Ic,c=(u,f,[p,m])=>aa(Number.isFinite(u)?u:f,p,m);return{version:"fauna-coat-1",pattern:wM(r,n),marks:o,scale:c(t.scale,1,l.scale),contrast:c(t.contrast,1,l.contrast),countershade:c(t.countershade,.8,l.countershade),bellyLine:c(t.bellyLine,-.45,l.bellyLine),colours:a,markRole:t.markRole==="belly"?"belly":"accent",seed:t.seed===void 0?i.seed:t.seed>>>0,warp:c(t.warp,.5,l.warp),threshold:c(t.threshold,0,l.threshold),juvenileSpots:c(t.juvenileSpots,o&yn["juvenile-spots"]?1:0,l.juvenileSpots),greying:c(t.greying,0,l.greying)}}const gn=new Float64Array(6),St=new Float64Array(6),yv=new Map(Object.entries(go)),hc=739982445,$s=695872825,L0=1597334677,Sv=461845907,gr=1759714724,Lh=1013904242;function P0(n,e){const t=St[4];St[0]=0,St[1]=0,St[2]=0,St[3]=0;const i=n.pattern;if(i==="plain"){St[5]=0;return}const s=pa(n.seed),r=n.threshold,o=n.warp,a=yv.get(i)*n.scale,l=e.region;let c,u,f;if(i==="saddle"){if(l!=="torso"&&l!=="neck"&&l!=="tail"){St[5]=0;return}we[0]=e.x*7,we[1]=e.y*7,we[2]=e.z*7,No(s^$s|0);const M=we[3]-.5;we[0]=e.x*42,we[1]=e.y*42,we[2]=e.z*42,Wn(s^gr|0);const _=we[3]-.5,b=(e.x+.03)/(.3+.3*r),S=(1-e.dorsal)/(.8+.3*r),v=Math.sqrt(b*b+S*S)+.22*o*M+.16*_,E=Math.max(.06,t*4);u=.92-E,f=.92+E,c=(v-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=1-c*c*(3-2*c);return}if(i==="dorsal-stripe"){const M=Math.max(.012,t*.5);let _=0;if(l==="torso"||l==="neck"||l==="tail"||l==="head"){we[0]=e.x*18,we[1]=.5,we[2]=.5,Wn(s^$s|0);const b=(we[3]-.5)*.012*(.5+o),S=.04+.03*r;u=S-M,f=S+M,c=(Math.abs(e.z+b)-u)/(f-u),c=c<0?0:c>1?1:c;const v=1-c*c*(3-2*c);c=(e.dorsal-.55)/(.72-.55),c=c<0?0:c>1?1:c,_=v*(c*c*(3-2*c)),l==="head"&&(c=(e.along-.05)/(.3-.05),c=c<0?0:c>1?1:c,_*=1-c*c*(3-2*c))}if(l==="torso"){const b=Math.abs(e.x-.26-.05*(1-e.dorsal)),S=Math.max(.012,t*.5);u=.018-S,f=.018+S,c=(b-u)/(f-u),c=c<0?0:c>1?1:c;const v=.55*(1-c*c*(3-2*c));c=(e.dorsal-.2)/(.55-.2),c=c<0?0:c>1?1:c,_=Math.max(_,v*(c*c*(3-2*c)))}else if(l==="limb-lower"||l==="limb-upper"){const b=l==="limb-lower"?5:3,S=e.along*b+.3,v=Math.abs(S-Math.floor(S)-.5),E=Math.max(.06,t*b*3);u=.16-E,f=.16+E,c=(v-u)/(f-u),c=c<0?0:c>1?1:c,_=.45*(1-c*c*(3-2*c)),l==="limb-upper"&&(c=(e.along-.4)/(1-.4),c=c<0?0:c>1?1:c,_*=c*c*(3-2*c)),l==="limb-lower"&&(c=(e.along-.25)/(.9-.25),c=c<0?0:c>1?1:c,_=Math.max(_,.6*(c*c*(3-2*c))))}else(l==="foot"||l==="tail-tip")&&(_=.6);St[5]=_;return}const p=l==="limb-upper"||l==="limb-lower"||l==="foot";if(i==="stripes"||i==="bands"){const M=i==="stripes";let _;if(p){const V=(l==="limb-upper"?3.5:l==="limb-lower"?5:2)*(M?1:.65)*n.scale;_=e.along*V+(l==="limb-lower"?.37:l==="foot"?.71:0)}else _=(e.x+(M?.05:.015)*(1-e.dorsal))*a;const b=M?.55*o:.12*o,S=a*.6;we[0]=e.x*S,we[1]=e.y*S*1.6,we[2]=e.z*S*1.6,No(s^hc|0),_+=b*(we[3]-.5)*2;const v=Math.floor(_),E=_-v;Ei(v,M?1:2,0,s^Lh|0);const R=.6+.4*(rn[0]*$n+(rn[2]&65535)/65536);let T=.5*((M?.43:.42)+.3*r)*R,C=Math.abs(E-.5);if(M&&!p){const V=n.bellyLine+.1+.45*rn[1]*$n;u=V-.04,f=V+.22,c=(e.dorsal-u)/(f-u),c=c<0?0:c>1?1:c,T*=c*c*(3-2*c)}M&&rn[2]*$n<.3&&(C=Math.abs(C-.55*T),T*=.42),we[0]=e.x*a*3,we[1]=e.y*a*3,we[2]=e.z*a*3,Wn(s^$s|0);const I=(we[3]-.5)*(M?.08:.05),F=Math.max(M?.03:.02,t*a*.5);if(T<=0){St[5]=0;return}u=T-F,f=T+F,c=(C+I-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=1-c*c*(3-2*c);return}if(i==="brindle"){const M=a;we[0]=e.x*M*.45,we[1]=e.y*M*.6,we[2]=e.z*M*.6,No(s^hc|0);const _=we[3]-.5;we[0]=e.x*M*2,we[1]=e.y*M*2,we[2]=e.z*M*2,Wn(s^$s|0);const b=we[3]-.5,S=(p?e.along*6*n.scale:e.x*M+.4*(1-e.dorsal))+(1.3+1.2*o)*_+.35*b,v=S-Math.floor(S);we[0]=e.x*M*.8+3.1,we[1]=e.y*M*.8,we[2]=e.z*M*.8,Wn(s^gr|0);const R=(.1+.1*we[3])*(1+1.2*r),w=Math.max(.035,t*M*.5);we[0]=e.x*M*1.3-7.7,we[1]=e.y*M*1.3,we[2]=e.z*M*1.3,Wn(s^Lh|0),c=(we[3]-.22)/(.4-.22),c=c<0?0:c>1?1:c;const T=c*c*(3-2*c);u=R-w,f=R+w,c=(Math.abs(v-.5)-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=(1-c*c*(3-2*c))*T*.9;return}let m=e.x*a,g=e.y*a,x=e.z*a;const d=i==="piebald"?.45:i==="roan"?0:i==="reticulated"?.32:i==="rosettes"?.28:.22;if(d>0&&o>0){we[0]=m*.45+31.7,we[1]=g*.45-12.9,we[2]=x*.45+4.3,mv(s^hc|0);const M=o*d*2;m+=M*(so[0]-.5),g+=M*(so[1]-.5),x+=M*(so[2]-.5)}const h=t*a*.5;if(i==="spots"){we[0]=m,we[1]=g,we[2]=x,Ya(s,gn);const M=gn[2]*$n,_=.35+.06*(2*M-1)+.25*r,b=Math.max(.05,h);St[0]=gn[0],St[1]=gn[1],St[2]=_,f=_+b,c=(gn[0]-_)/(f-_),c=c<0?0:c>1?1:c,St[5]=1-c*c*(3-2*c);return}if(i==="rosettes"){we[0]=m,we[1]=g,we[2]=x,Ya(s,gn);const M=gn[2]>>>0,_=gn[0]/Math.max(gn[1],1e-6),b=1/Math.max(gn[0],1e-6);St[0]=gn[0],St[1]=gn[1];const S=gn[3]*b,v=gn[4]*b,E=gn[5]*b;we[0]=S*1.6+(M&1023)*.37,we[1]=v*1.6+(M>>>10&1023)*.41,we[2]=E*1.6+(M>>>20&1023)*.43,Wn(s^$s|0);const R=we[3];we[0]=S*2.3+9.1,we[1]=v*2.3-3.3,we[2]=E*2.3+1.7,Wn(s^gr|0);const w=we[3],T=Math.max(.035,h*.6),C=.8-.04*(M*$n)+.2*r,I=C-.22-.12*(w-.5)-.15*r;St[2]=I,St[3]=C,u=I-T,f=I+T,c=(_-u)/(f-u),c=c<0?0:c>1?1:c;const F=c*c*(3-2*c);u=C-T,f=C+T,c=(_-u)/(f-u),c=c<0?0:c>1?1:c;const V=F*(1-c*c*(3-2*c));c=(R-.3)/(.44-.3),c=c<0?0:c>1?1:c;const W=V*(c*c*(3-2*c)),D=.35*(1-F);St[5]=Math.max(W,D);return}if(i==="reticulated"){we[0]=m,we[1]=g,we[2]=x,Ya(s,gn);const M=gn[1]-gn[0],_=gn[2]*$n;St[0]=gn[0],St[1]=gn[1],we[0]=m*1.7,we[1]=g*1.7,we[2]=x*1.7,Wn(s^$s|0);const b=(we[3]-.5)*.04,S=.05-.1*r+b,v=Math.max(0,h-.025);c=(M-.12)/(.6-.12),c=c<0?0:c>1?1:c;const E=.55+.3*_+.18*(c*c*(3-2*c));St[3]=E<0?0:E>1?1:E,u=S-v,f=S+.05+v,c=(M-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=c*c*(3-2*c);return}if(i==="dapple"){we[0]=m,we[1]=g,we[2]=x,Ya(s,gn),St[0]=gn[0],St[1]=gn[1];const M=gn[0]/Math.max(gn[1],1e-6),_=.86+.25*r,b=Math.max(0,h*.5);u=_-.45-b,f=_+.04+b,c=(M-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=.85*(1-c*c*(3-2*c));return}if(i==="piebald"){we[0]=m,we[1]=g,we[2]=x,No(s);let M=we[3];M+=.16*-e.dorsal+(l==="limb-lower"||l==="foot"?.18:l==="muzzle"||l==="head"?.1:0);const _=.56-.35*r,b=Math.max(.008,h*.15);u=_-b,f=_+b,c=(M-u)/(f-u),c=c<0?0:c>1?1:c,St[5]=c*c*(3-2*c);return}if(i==="roan"){we[0]=e.x*2.6,we[1]=e.y*2.6,we[2]=e.z*2.6,No(s^$s|0);const M=.32+.35*r+.6*(we[3]-.5);we[0]=(.8*m+.6*x)*1.73+5.3,we[1]=g*1.73,we[2]=(.8*x-.6*m)*1.73,Wn(s^L0|0);const _=we[3];we[0]=m,we[1]=g,we[2]=x,Wn(s),c=(t*a-.4)/(1.2-.4),c=c<0?0:c>1?1:c;const b=(.5*we[3]+.5*_-.5)*.8*(1-c*c*(3-2*c)),S=M+b;St[5]=.8*(S<0?0:S>1?1:S);return}St[5]=0}const Ev={plain:0,spots:.45,rosettes:.6,reticulated:.75,stripes:0,bands:.35,saddle:0,"dorsal-stripe":0,dapple:.6,piebald:0,roan:.3,brindle:.5},wv=new Map(Object.entries(Ev)),Oo=.6,Fo=.585,ko=.55,Oe=new Float64Array(3),vc=new Float64Array(2);function D0(n,e,t,i,s,r=!1){const o=n.colours,a=e.region;if(a==="eye"){const R=o.eye;t[i]=R[0],t[i+1]=R[1],t[i+2]=R[2];return}const l=pa(n.seed);we[0]=e.x*40,we[1]=e.y*40,we[2]=e.z*40,Wn(l^L0|0);const c=1+.08*(we[3]-.5);if(a==="horn"||a==="armor"){const R=a==="horn"?o.horn:o.plate;t[i]=R[0]*c,t[i+1]=R[1]*c,t[i+2]=R[2]*c;return}const u=o.base,f=o.belly,p=o.accent,m=n.pattern,g=e.footprint!==void 0&&e.footprint>0?e.footprint:0,x=e.along,d=e.dorsal;let h,M,_,b;M=n.bellyLine+.3,_=n.bellyLine-.3,h=(d-M)/(_-M),h=h<0?0:h>1?1:h;let S=n.countershade*(h*h*(3-2*h));a==="limb-upper"?(h=x/.35,h=h<0?0:h>1?1:h,S*=1+(.5-1)*(h*h*(3-2*h))):(a==="limb-lower"||a==="foot")&&(S*=.5),m==="reticulated"?(Oe[0]=f[0],Oe[1]=f[1],Oe[2]=f[2]):(Oe[0]=u[0]+(f[0]-u[0])*S,Oe[1]=u[1]+(f[1]-u[1])*S,Oe[2]=u[2]+(f[2]-u[2])*S),we[0]=e.x*3.2,we[1]=e.y*3.2,we[2]=e.z*3.2,Wn(l^Sv|0);const v=1+.06*(we[3]-.5);if(Oe[0]*=v,Oe[1]*=v,Oe[2]*=v,m!=="plain"){let R;if(s?R=vc[0]:(St[4]=g,P0(n,e),R=St[5]),R>0){M=n.bellyLine+.35,_=n.bellyLine-.2,h=(d-M)/(_-M),h=h<0?0:h>1?1:h;const w=1-wv.get(m)*(h*h*(3-2*h));let T=0;switch(a){case"torso":case"neck":case"tail":case"tail-tip":case"wing":T=1;break;case"head":m==="roan"?(h=x/.3,h=h<0?0:h>1?1:h,T=1+(.25-1)*(h*h*(3-2*h))):(h=x/.5,h=h<0?0:h>1?1:h,T=1+(.6-1)*(h*h*(3-2*h)));break;case"muzzle":T=m==="roan"?.2:.45;break;case"ear":T=.5;break;case"limb-upper":T=m==="roan"?1+(.4-1)*x:m==="dapple"?1+(.5-1)*x:1+(.85-1)*x;break;case"limb-lower":T=m==="roan"?.4+(.2-.4)*x:m==="dapple"?.5+(.2-.5)*x:.85+(.65-.85)*x;break;case"foot":T=m==="roan"||m==="dapple"?.2:.6;break}const C=R*T*w*n.contrast;let I,F,V;if(m==="reticulated"){const W=s?vc[1]:St[3];I=u[0]+(p[0]-u[0])*W,F=u[1]+(p[1]-u[1])*W,V=u[2]+(p[2]-u[2])*W}else m==="piebald"?(I=f[0]+(Oo-f[0])*.6,F=f[1]+(Fo-f[1])*.6,V=f[2]+(ko-f[2])*.6):m==="roan"?(I=f[0]+(Oo-f[0])*.5,F=f[1]+(Fo-f[1])*.5,V=f[2]+(ko-f[2])*.5):m==="dapple"?(I=(u[0]+(f[0]-u[0])*.85)*1.08,F=(u[1]+(f[1]-u[1])*.85)*1.08,V=(u[2]+(f[2]-u[2])*.85)*1.08):n.markRole==="belly"?(I=f[0]+(Oo-f[0])*.3,F=f[1]+(Fo-f[1])*.3,V=f[2]+(ko-f[2])*.3):(I=p[0],F=p[1],V=p[2]);if(C<=1)Oe[0]+=(I-Oe[0])*C,Oe[1]+=(F-Oe[1])*C,Oe[2]+=(V-Oe[2])*C;else{const W=C-1,D=Oe[0],B=Oe[1],G=Oe[2];Oe[0]=I+(I-D)*W,Oe[1]=F+(F-B)*W,Oe[2]=V+(V-G)*W}}}const E=n.marks|0;if(E){const R=n.markRole==="belly",w=R?f[0]+(Oo-f[0])*.45:p[0],T=R?f[1]+(Fo-f[1])*.45:p[1],C=R?f[2]+(ko-f[2])*.45:p[2],I=f[0]+(Oo-f[0])*.55,F=f[1]+(Fo-f[1])*.55,V=f[2]+(ko-f[2])*.55;if(E&yn.socks)if(a==="limb-lower"){we[0]=e.x*30,we[1]=e.y*30,we[2]=e.z*30,Wn(l^gr|0);const W=.45+.12*(we[3]-.5);M=W-.18,_=W+.12,h=(x-M)/(_-M),h=h<0?0:h>1?1:h,b=.92*(h*h*(3-2*h)),Oe[0]+=(w-Oe[0])*b,Oe[1]+=(T-Oe[1])*b,Oe[2]+=(C-Oe[2])*b}else a==="foot"&&(Oe[0]+=(w-Oe[0])*.92,Oe[1]+=(T-Oe[1])*.92,Oe[2]+=(C-Oe[2])*.92);if(E&yn.mask){if(a==="muzzle")Oe[0]+=(p[0]-Oe[0])*.82,Oe[1]+=(p[1]-Oe[1])*.82,Oe[2]+=(p[2]-Oe[2])*.82;else if(a==="head"){h=(x-.15)/(.65-.15),h=h<0?0:h>1?1:h;const W=.6*(h*h*(3-2*h));h=(d-.45)/(.95-.45),h=h<0?0:h>1?1:h,b=W*(1-.6*(h*h*(3-2*h))),Oe[0]+=(p[0]-Oe[0])*b,Oe[1]+=(p[1]-Oe[1])*b,Oe[2]+=(p[2]-Oe[2])*b}}if(E&yn.blaze&&(a==="head"||a==="muzzle")){const W=a==="head"?.035+.015*x:.045,D=Math.max(.012,g*.5);M=W-D,_=W+D,h=(Math.abs(e.z)-M)/(_-M),h=h<0?0:h>1?1:h;const B=1-h*h*(3-2*h);h=(d- -.35)/(.05- -.35),h=h<0?0:h>1?1:h;let G=B*(h*h*(3-2*h));a==="head"&&(h=(x-.1)/(.4-.1),h=h<0?0:h>1?1:h,G*=h*h*(3-2*h)),b=.92*G,Oe[0]+=(I-Oe[0])*b,Oe[1]+=(F-Oe[1])*b,Oe[2]+=(V-Oe[2])*b}if(E&yn["tail-tip"]&&a==="tail-tip"&&(h=x/.25,h=h<0?0:h>1?1:h,b=.95*(h*h*(3-2*h)),Oe[0]+=(w-Oe[0])*b,Oe[1]+=(T-Oe[1])*b,Oe[2]+=(C-Oe[2])*b),E&yn["tail-rings"]&&(a==="tail"||a==="tail-tip")){const W=(a==="tail"?x*7:7+x*1.5)+.25,D=Math.abs(W-Math.floor(W)-.5),B=Math.max(.04,g*25);M=.22-B,_=.22+B,h=(D-M)/(_-M),h=h<0?0:h>1?1:h,b=.88*(1-h*h*(3-2*h)),Oe[0]+=(w-Oe[0])*b,Oe[1]+=(T-Oe[1])*b,Oe[2]+=(C-Oe[2])*b}if(E&yn["ear-tips"]&&a==="ear"&&(h=(x-.62)/(.8-.62),h=h<0?0:h>1?1:h,b=.95*(h*h*(3-2*h)),Oe[0]+=(w-Oe[0])*b,Oe[1]+=(T-Oe[1])*b,Oe[2]+=(C-Oe[2])*b),E&yn["rump-patch"]){if(a==="torso"){we[0]=e.y*14,we[1]=e.z*14,we[2]=.5,Wn(l^gr|0);const W=.03*(we[3]-.5);h=(e.x+W- -.31)/(-.4- -.31),h=h<0?0:h>1?1:h;const D=.9*(h*h*(3-2*h));h=(d- -.3)/(-.1- -.3),h=h<0?0:h>1?1:h,b=D*(h*h*(3-2*h)),Oe[0]+=(I-Oe[0])*b,Oe[1]+=(F-Oe[1])*b,Oe[2]+=(V-Oe[2])*b}else if(a==="tail"){h=(x-.1)/(.35-.1),h=h<0?0:h>1?1:h;const W=.9*(1-h*h*(3-2*h));h=(d-.2)/(-.4-.2),h=h<0?0:h>1?1:h,b=W*(h*h*(3-2*h)),Oe[0]+=(I-Oe[0])*b,Oe[1]+=(F-Oe[1])*b,Oe[2]+=(V-Oe[2])*b}}if(E&yn["juvenile-spots"]&&n.juvenileSpots>0&&a==="torso"){St[4]=g,Tv(e,l);const W=St[5];W>0&&(b=.85*n.juvenileSpots*W,Oe[0]+=(I-Oe[0])*b,Oe[1]+=(F-Oe[1])*b,Oe[2]+=(V-Oe[2])*b)}}if(n.greying>0){let R=0;if(a==="muzzle"?R=.85:a==="head"&&(h=(x-.45)/(.95-.45),h=h<0?0:h>1?1:h,R=.5*(h*h*(3-2*h))),R>0){const w=.4+(f[0]-.4)*.3,T=.39+(f[1]-.39)*.3,C=.37+(f[2]-.37)*.3;b=n.greying*R,Oe[0]+=(w-Oe[0])*b,Oe[1]+=(T-Oe[1])*b,Oe[2]+=(C-Oe[2])*b}}h=Oe[0]*c,t[i]=r?h:h<.002?.002:h>1?1:h,h=Oe[1]*c,t[i+1]=r?h:h<.002?.002:h>1?1:h,h=Oe[2]*c,t[i+2]=r?h:h<.002?.002:h>1?1:h}function Ri(n,e,t,i=0){D0(n,e,t,i,!1)}function Tv(n,e){const t=St[4],i=n.z>=0?1:2,s=.048,r=n.x;let o=(r- -.42)/(-.34- -.42);o=o<0?0:o>1?1:o;const a=o*o*(3-2*o);o=(r-.26)/(.34-.26),o=o<0?0:o>1?1:o;const l=a*(1-o*o*(3-2*o));if(l<=0){St[5]=0;return}let c=0;const u=Math.max(.004,t*.5);for(let f=0;f<3;f++){const p=f===0?.74:f===1?.5:.22,m=f===1?.5:f===2?.25:0,g=r/s-m,x=Math.floor(g);for(let d=x-1;d<=x+1;d++){if(Ei(d,f,i,e^gr|0),f===2&&rn[2]*$n>.55||f<2&&rn[2]*$n>.9)continue;const h=(d+m+.5+(rn[0]*$n-.5)*.5)*s,M=p+(rn[1]*$n-.5)*(f===2?.2:.09),_=r-h,b=(n.dorsal-M)*.2,S=.0085+.006*(rn[2]>>>8&255)/255-(f===2?.002:0),v=S-u,E=S+u;o=(Math.sqrt(_*_+b*b)-v)/(E-v),o=o<0?0:o>1?1:o;const R=1-o*o*(3-2*o);R>c&&(c=R)}}St[5]=c*l}function Av(n,e,t){let i=0;n.pattern!=="plain"&&(St[4]=e.footprint??0,P0(n,e),i=St[5]),t[0]=i,t[1]=St[0],t[2]=St[1],t[3]=St[2],t[4]=St[3]}const Rv=512;let ja;function So(){if(ja)return ja;const n=[],e=.6180339887498949,t=i=>{const s=i.bx-i.ax,r=i.by-i.ay,o=i.bz-i.az,a=Math.hypot(s,r,o),l=s/a,c=r/a,u=o/a;let f=-l*c,p=1-c*c,m=-u*c;const g=Math.hypot(f,p,m)||1;f/=g,p/=g,m/=g,Math.abs(c)>.95&&(f=1,p=0,m=0);const x=c*m-u*p,d=u*f-l*m,h=l*p-c*f,_=Math.PI*(3*(i.ry+i.rz)-Math.sqrt((3*i.ry+i.rz)*(i.ry+3*i.rz)))*a/i.count;for(let b=0;b<i.count;b++){const S=(b+.5)/i.count,v=2*Math.PI*(b*e%1),E=Math.cos(v),R=Math.sin(v),w=i.ax+s*S+(f*E*i.ry+x*R*i.rz),T=i.ay+r*S+(p*E*i.ry+d*R*i.rz),C=i.az+o*S+(m*E*i.ry+h*R*i.rz);let I=f*E/i.ry+x*R/i.rz,F=p*E/i.ry+d*R/i.rz,V=m*E/i.ry+h*R/i.rz;const W=Math.hypot(I,F,V)||1;I/=W,F/=W,V/=W;const D=(i.alongFrom??0)+((i.alongTo??1)-(i.alongFrom??0))*S;n.push({x:w,y:T,z:C,dorsal:aa(F,-1,1),region:i.region,along:D,weight:_})}};t({region:"torso",ax:-.4,ay:0,az:0,bx:.36,by:.02,bz:0,ry:.15,rz:.12,count:260}),t({region:"neck",ax:.33,ay:.06,az:0,bx:.52,by:.24,bz:0,ry:.06,rz:.06,count:36}),t({region:"head",ax:.5,ay:.27,az:0,bx:.64,by:.26,bz:0,ry:.06,rz:.05,count:32}),t({region:"muzzle",ax:.64,ay:.255,az:0,bx:.73,by:.22,bz:0,ry:.035,rz:.035,count:16});for(const i of[1,-1])t({region:"ear",ax:.53,ay:.32,az:.04*i,bx:.49,by:.4,bz:.06*i,ry:.015,rz:.008,count:4});t({region:"tail",ax:-.42,ay:.06,az:0,bx:-.58,by:-.12,bz:0,ry:.02,rz:.02,count:16}),t({region:"tail-tip",ax:-.58,ay:-.12,az:0,bx:-.62,by:-.17,bz:0,ry:.02,rz:.02,count:4});for(const[i,s]of[[.26,.08],[.26,-.08],[-.28,.08],[-.28,-.08]])t({region:"limb-upper",ax:i,ay:-.04,az:s,bx:i-.01,by:-.28,bz:s,ry:.045,rz:.04,count:18}),t({region:"limb-lower",ax:i-.01,ay:-.28,az:s,bx:i,by:-.52,bz:s,ry:.026,rz:.024,count:14}),t({region:"foot",ax:i,ay:-.52,az:s,bx:i+.01,by:-.56,bz:s,ry:.03,rz:.028,count:3});if(n.length!==Rv)throw new Error(`canonical coat sample count ${n.length}`);return ja=Object.freeze(n.map(i=>Object.freeze(i))),ja}function Cv(n){const e=go[n.pattern]*n.scale,t=n.threshold;let i=1;switch(n.pattern){case"spots":i=2*Math.max(.08,.29+.25*t)/e;break;case"rosettes":i=.08/e;break;case"reticulated":i=Math.max(.03,.08-.1*t)/e;break;case"stripes":i=(.43+.3*t)*.6*.42/e;break;case"bands":i=(.42+.3*t)*.6/e;break;case"saddle":i=.1;break;case"dorsal-stripe":i=.036;break;case"dapple":i=.1/e;break;case"piebald":i=.35/e;break;case"roan":i=.3/e;break;case"brindle":i=.2*(1+1.2*Math.min(0,t))/e;break}return i}function Ph(n,e,t,i,s,r){vc[0]=s,vc[1]=r,D0(n,e,t,i,!0)}function Lv(n){return pa(n)}const $a=Object.freeze({warp:hc,detail:$s,mark:gr,band:Lh}),Pv=Wo,Dv=(n,e,t)=>Math.max(e,Math.min(t,n)),Xo=(n,e,t)=>n+(e-n)*t,I0=(n,e,t)=>{const i=Dv((t-n)/(e-n),0,1);return i*i*(3-2*i)},Iv="planet-juvenile-coat-1";function U0(n){return Xo(.4,1,I0(.2,.7,n))}const Gd=new WeakMap,El=new Float64Array(3);function wl(n,e,t,i,s,r,o=0){const a=(n.marks&yn["juvenile-spots"])!==0&&n.juvenileSpots>0,l=Object.isFrozen(n);let c=l?Gd.get(n):void 0;if(!c){const p=a?{...n,marks:n.marks&-129}:n;c={unspotted:p,unstocked:{...p,marks:p.marks&-2}},l&&Gd.set(n,c)}const{unspotted:u,unstocked:f}=c;if(r===void 0?Ri(u,t,s,0):Ph(u,t,s,0,r,o),e.stage==="juvenile"&&u.marks&yn.socks&&(t.region==="limb-lower"||t.region==="foot")){const p=U0(e.maturity);if(p<1){r===void 0?Ri(f,t,El,0):Ph(f,t,El,0,r,o);for(let m=0;m<3;m++)s[m]=Xo(El[m],s[m],p)}}if(a&&(t.region==="torso"||t.region==="limb-upper")){const p=F0(n.seed,i.x,i.y,i.z,i.cell,i.halfH,i.halfW),m=.85*n.juvenileSpots*p;if(m>0)for(let g=0;g<3;g++){const x=N0[g];s[g]=Xo(s[g],Math.max(Xo(n.colours.belly[g],x,.55),Xo(s[g],x,.5)),m)}}}const N0=[.6,.585,.55],Uv=2.1,O0=.024,Wd=1512013361,Js=.1,Xd=-.36,qd=.28;function Nv(n){const e=n>0?n:O0,t=Math.max(Uv*e,.042),i=2*(1+Js)*t+2*e,s=i/(1-2*Js),r=.5*s*(1-2*Js),o=Math.sqrt(Math.max(i*i-r*r,0))/(1-2*Js),a=.5*i+Js*o;return{radius:t,spacing:s,rowGap:o,rows:[a,a+o,a+2*o]}}let Yd=NaN,Tl;function F0(n,e,t,i,s,r,o){(s!==Yd||!Tl)&&(Yd=s,Tl=Nv(s));const a=Tl;if(e<Xd-2*a.radius||e>qd+2*a.radius)return 0;const l=Math.hypot(t,i),c=Math.atan2(Math.abs(i),t)*l,u=i>=0?1:2,f=.6*(s>0?s:O0),p=r*Math.cos(Math.min(a.rows[0]/Math.max(r,.001),Math.PI/2)),m=Math.abs(i)>=.4*o;let g=0;for(let x=0;x<3;x++){const d=x===0?c:t,h=x===0?a.rows[0]:p-x*a.rowGap,M=x===1?.5:x===2?.25:0;if(x>0&&!m||Math.abs(d-h)>a.rowGap)continue;const _=Math.floor(e/a.spacing-M);for(let b=_-1;b<=_+1;b++){const S=Rh(b,x,u,n^Wd),v=Rh(b,x,u+4,n^Wd);if((S&255)/256>(x===2?.45:.9))continue;const E=(b+M+.5+((S>>>8&255)/255-.5)*2*Js)*a.spacing;if(E<Xd||E>qd)continue;const R=h+((S>>>16&255)/255-.5)*2*Js*a.rowGap,w=a.radius*(1+Js*(v&255)/255),T=1-I0(w-f,w+f,Math.hypot(e-E,d-R));T>g&&(g=T)}}return g}const ca="fauna-appearance-2",Ov="fauna-appearance-1",k0=["ungulate","cursorial","padded","long-neck","proboscidean","winged"],Un=(n,e,t)=>Math.max(e,Math.min(t,n)),Ds=(n,e,t)=>n+(e-n)*t,dr=(n,e,t)=>{const i=Un((t-n)/(e-n),0,1);return i*i*(3-2*i)};function Nc(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e^=e>>>16,e=Math.imul(e,2146121005),e^=e>>>15,(e^e>>>16)>>>0}const wi=n=>Nc(n)/4294967295*2-1,Rs=n=>Nc(n)/4294967296;function Fv(n){return[1,3,5].map(e=>parseInt(n.slice(e,e+2),16)/255)}function kv(n){return"#"+n.map(e=>Math.round(Un(e,0,1)*255).toString(16).padStart(2,"0")).join("")}function Al(n){return Fv(n).map(e=>e<=.04045?e/12.92:((e+.055)/1.055)**2.4)}function uc(n){return kv([oo(Un(n[0],0,1)),oo(Un(n[1],0,1)),oo(Un(n[2],0,1))])}const zv={runner:[["tawny",3],["dun",2],["fawn",2],["rufous",1]],browser:[["rufous",3],["fawn",2],["dun",2],["grey",1]],"long-neck":[["ochre",4],["tawny",2],["fawn",1]],"low-slung":[["grey",3],["sable",2],["dun",2],["olive",1]]},Bv={plain:[["plain",.42],["saddle",.24],["dorsal-stripe",.19],["piebald",.09],["roan",.06]],spots:[["spots",.35],["rosettes",.25],["reticulated",.25],["dapple",.15]],stripes:[["stripes",.4],["bands",.25],["brindle",.15],["dorsal-stripe",.2]]},z0={runner:["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],browser:["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],"long-neck":["socks","mask","blaze","rump-patch","tail-tip","ear-tips"],"low-slung":["socks","mask","blaze","tail-rings","tail-tip","ear-tips"]};function jd(n,e,t){let i=0;for(const[r,o]of n)i+=o*(t?t(r):1);let s=e*i;for(const[r,o]of n)if(s-=o*(t?t(r):1),s<0)return r;return n[n.length-1][0]}function B0(n){return`${n.archetype}/${n.color}/${n.pattern}/coat-lineage-v2`}function Oc(n){return`${n.archetype}/${n.torsoLength}/${n.torsoWidth}/${n.legLength}/${n.neckLength}/${n.color}/${n.pattern}`}function Vv(n){const e=B0(n),t=n.archetype,i=jd(zv[t],Rs(`${e}/family`)),s=jd(Bv[n.pattern],Rs(`${e}/pattern`),a=>a==="reticulated"&&t==="long-neck"?3:1);let r=0;for(const a of z0[t])Rs(`${e}/mark/${a}`)<.3&&(r|=yn[a]);const o=(t==="browser"||t==="long-neck")&&Rs(`${e}/juvenile-spots`)<.6;return{family:i,pattern:s,marks:r,juvenileSpots:o}}function Hv(n){const e=Oc(n),t=yc(n),i=.15+.55*Rs(`${e}/dimorphism-v2`),s=Un(i*(t==="ungulate"||t==="long-neck"?1.3:1),.15,.7);return{dimorphism:s,hornlessFemales:s>.55&&Rs(`${e}/hornless-females-v2`)<.5}}function V0(n){const e=Vv(n),t=Uc(`${Oc(n)}/coat-v2`),i=Math.floor(t()*4294967296)>>>0,s=1+(t()*2-1)*.25,r=1+(t()*2-1)*.2,o=.35+t()*.55,a=-.45+(t()*2-1)*.1;let l=e.marks;for(const m of z0[n.archetype])t()<.25&&(l^=yn[m]);const c=t()<.3?"belly":"accent",u=.35+t()*.4,f=(t()*2-1)*.1;e.juvenileSpots&&(l|=yn["juvenile-spots"]);const p=C0(e.family,i,{pattern:e.pattern,marks:l,scale:s,contrast:r,countershade:o,bellyLine:a,markRole:c,warp:u,threshold:f,juvenileSpots:0});return{lineage:e,coat:p}}const H0={ungulate:{torso:.38,neck:.065,head:.052,tail:.021,upper:.289,lower:.124,foot:.069,footHoof:.671},cursorial:{torso:.353,neck:.055,head:.054,tail:.017,upper:.324,lower:.154,foot:.043,footHoof:.267},padded:{torso:.465,neck:.033,head:.104,tail:.038,upper:.13,lower:.104,foot:.126,footHoof:.413},"long-neck":{torso:.298,neck:.155,head:.037,tail:.015,upper:.319,lower:.129,foot:.046,footHoof:.665},proboscidean:{torso:.364,neck:.053,head:.095,tail:.021,upper:.231,lower:.118,foot:.118,footHoof:.441},winged:{torso:.382,neck:.085,head:.061,tail:.021,upper:.268,lower:.122,foot:.061,footHoof:.268}},G0=[.035,.03,.026];function W0(n,e){return e!=="proboscidean"&&n.archetype==="low-slung"&&n.armor>.05?Un(.25*n.armor,0,.2):0}function Eo(n,e){return n.pattern==="rosettes"?2*e:e}const On={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},us=.022,Ki=new Float64Array(3);function Gv(n,e,t=0){const i={},s=(p,m)=>{const g=i[p]??=[0,0,0,0];g[0]+=Ki[0]*m,g[1]+=Ki[1]*m,g[2]+=Ki[2]*m,g[3]+=m},r={torso:"torso",neck:"neck",head:"head",muzzle:"head",ear:"head",tail:"tail","tail-tip":"tail","limb-upper":"upper","limb-lower":"lower",foot:"foot"},o=Q0(n,us);for(const p of So())Object.assign(On,p),On.footprint=Eo(n,us),Ri(o,On,Ki,0),s(r[p.region]??"torso",p.weight),t>0&&p.region==="torso"&&p.dorsal>.3&&(On.region="armor",Ri(o,On,Ki,0),s("armor",p.weight));const a=H0[e],l=[0,0,0],c=[["torso",a.torso],["neck",a.neck],["head",a.head],["tail",a.tail],["upper",a.upper],["lower",a.lower],["foot",a.foot]],u=c.reduce((p,[,m])=>p+m,0),f=1-t;for(const[p,m]of c){const g=i[p],x=m/u*f;for(let d=0;d<3;d++){const h=g[d]/g[3];l[d]+=x*(p==="foot"?Ds(h,G0[d],a.footHoof):h)}}if(t>0){const p=i.armor;for(let m=0;m<3;m++)l[m]+=t*p[m]/p[3]}return l}const Ka=new Map,Fc={torso:0,neck:1,head:2,muzzle:2,ear:2,tail:3,"tail-tip":3,"limb-upper":4,"limb-lower":5,foot:6},Xn=7,xr=4,Wv=96,Rl=4,Ko=(1<<Xn)-1,Xv=new Set(["piebald"]),qv=new Set(["bands"]),X0={bands:11},Yv=.3,jv=.2,zo=new Float64Array(3),Za=new Float64Array(3);function kc(n,e){const t=Z0(n,e);return n.scale>t?{...n,scale:t}:n}function Hr(n,e,t,i,s=xr){const r=kc(n,us),o=Eo(n,us),a=Yv,l=jv,c={...r,colours:{...r.colours,base:[a,a,a],accent:[a,a,a],belly:[a,a,a]}},u={...r,colours:{...r.colours,base:[a+l,a,a],accent:[a,a+l,a],belly:[a,a,a+l]}},f=new Float64Array(Xn*7),p=So(),m=(g,x,d,h,M,_)=>{const b=x*7,S=h+M+_;g[b]+=h*d,g[b+1]+=M*d,g[b+2]+=_*d;for(let v=0;v<3;v++)g[b+3+v]+=(zo[v]-a*S)*d;g[b+6]+=d};for(let g=0;g<p.length;g+=t){const x=p[g],d=Fc[x.region]??0;if(!(e>>d&1))continue;Object.assign(On,x),On.footprint=o,Ri(u,On,Za,0),Ri(c,On,zo,0);const h=(Za[0]-zo[0])/l,M=(Za[1]-zo[1])/l,_=(Za[2]-zo[2])/l;m(f,d,x.weight,h,M,_),i&&g%s===0&&m(i,d,x.weight,h,M,_)}for(const g of i?[f,i]:[f])for(let x=0;x<Xn;x++){const d=x*7,h=g[d+6];if(h>0)for(let M=0;M<6;M++)g[d+M]/=h}return f}function Qa(n,e,t,i){const s=e*7,r=t.base,o=t.accent,a=t.belly;for(let l=0;l<3;l++)i[l]=n[s]*r[l]+n[s+1]*o[l]+n[s+2]*a[l]+n[s+3+l]}const $v=[["contrast",.1,!1],["countershade",.1,!1],["threshold",.04,!0],["bellyLine",.04,!0]],$d=new Float64Array(5);function dc(n,e){const t=kc(n,us),i=Eo(n,us),s=So(),r=X0[n.pattern]??Ko;e.fill(0);for(let o=0;o<s.length;o+=xr){const a=s[o],l=Fc[a.region]??0;q0[l]<3||!(r>>l&1)||(Object.assign(On,a),On.footprint=i,Av(t,On,$d),e[l*2]+=$d[0]*a.weight,e[l*2+1]+=a.weight)}for(let o=0;o<Xn;o++)e[o*2+1]>0&&(e[o*2]/=e[o*2+1]);return e}function Kv(n,e,t){const i=Ka.get(n);if(i)return i;let s=0;for(const x of K0[t])s|=yn[x];const r=new Float64Array(Xn*7),o=Hr(e,Ko,1,r,xr),a={...e,marks:e.marks^s},l=$v.map(([x,d,h])=>{const M=Hr({...e,[x]:e[x]+d},Ko,xr),_=h?Hr({...e,[x]:e[x]-d},Ko,xr):r,b=new Float64Array(M.length);for(let S=0;S<M.length;S++)b[S]=S%7===6?0:(M[S]-_[S])/(h?2*d:d);return[x,b]}),c={...kc(e,us),colours:{...e.colours,plate:[.5,.5,.5]}};let u=0,f=0;for(const x of So())x.region==="torso"&&x.dorsal>.3&&(Object.assign(On,x),On.region="armor",On.footprint=Eo(e,us),Ri(c,On,Ki,0),u+=Ki[0]/.5*x.weight,f+=x.weight);let p,m;if(qv.has(e.pattern)){p=dc(e,new Float64Array(Xn*2));const x=dc({...e,threshold:e.threshold+.04},new Float64Array(Xn*2)),d=dc({...e,threshold:e.threshold-.04},new Float64Array(Xn*2));m=new Float64Array(Xn);for(let h=0;h<Xn;h++)m[h]=(x[h*2]-d[h*2])/.08}const g={species:e,flipBits:s,base:o,slopes:l,armour:u/f,mask:p,maskSlope:m,flipped:s?Hr(a,Wv|Rl,1):void 0,grey:Hr({...e,greying:1},Rl,1),greyFlipped:s&yn.blaze?Hr({...a,greying:1},Rl,1):void 0};return Ka.size>=256&&Ka.clear(),Ka.set(n,g),g}const q0=(()=>{const n=new Array(Xn).fill(0),e=So();for(let t=0;t<e.length;t+=xr)n[Fc[e[t].region]??0]++;return n})(),Ja=Array.from({length:Xn},()=>[0,0,0]),Kd=[0,0,0],ec=[0,0,0],ur=new Float64Array(Xn*4),Zv=new Float64Array(Xn*2);function Y0(n,e,t,i,s,r=0){const o=Kv(n,e,t),a=i.marks^o.species.marks|0;if(i.pattern!==o.species.pattern||a&~o.flipBits)return Gv(i,s,r);const l=i.colours,c=a&yn.socks,u=a&yn.blaze;for(let d=0;d<Xn;d++){const h=Ja[d];if(Qa((d===5||d===6?c:d===2?u:0)?o.flipped:o.base,d,l,h),d===2&&i.greying>0){Qa(u?o.greyFlipped:o.grey,2,l,Kd);for(let _=0;_<3;_++)h[_]=Ds(h[_],Kd[_],i.greying)}for(const[_,b]of o.slopes){const S=i[_]-o.species[_];if(S!==0){Qa(b,d,l,ec);for(let v=0;v<3;v++)h[v]+=S*ec[v]}}}if(o.mask&&o.maskSlope){const d=dc(i,Zv),h=i.threshold-o.species.threshold,M=o.slopes.find(([_])=>_==="threshold")[1];for(let _=0;_<Xn;_++){const b=o.maskSlope[_];if(d[_*2+1]<=0||Math.abs(b)<.001)continue;const S=(d[_*2]-o.mask[_*2]-b*h)/b;Qa(M,_,l,ec);for(let v=0;v<3;v++)Ja[_][v]+=S*ec[v]}}else if(Xv.has(i.pattern)){const d=kc(i,us),h=Eo(i,us),M=So();ur.fill(0);const _=X0[i.pattern]??Ko;for(let b=0;b<M.length;b+=xr){const S=M[b],v=Fc[S.region]??0,E=v*4;q0[v]<3||!(_>>v&1)||(Object.assign(On,S),On.footprint=h,Ri(d,On,Ki,0),ur[E]+=Ki[0]*S.weight,ur[E+1]+=Ki[1]*S.weight,ur[E+2]+=Ki[2]*S.weight,ur[E+3]+=S.weight)}for(let b=0;b<Xn;b++){const S=b*4,v=ur[S+3];if(v>0)for(let E=0;E<3;E++)Ja[b][E]=ur[S+E]/v}}const f=H0[s],p=[f.torso,f.neck,f.head,f.tail,f.upper,f.lower,f.foot],m=p.reduce((d,h)=>d+h,0),g=1-r,x=[0,0,0];for(let d=0;d<Xn;d++){const h=p[d]/m*g,M=Ja[d];for(let _=0;_<3;_++)x[_]+=h*(d===6?Ds(M[_],G0[_],f.footHoof):M[_])}if(r>0)for(let d=0;d<3;d++)x[d]+=r*i.colours.plate[d]*o.armour;return x}function j0(n){return`${Oc(n)}|${B0(n)}`}function $0(n,e,t){const i=R0(e,A0(`${t}/coat`,1));return Jv(n,i,t)}const K0={browser:["socks","blaze"],runner:["socks","blaze"],"long-neck":["socks"],"low-slung":["socks"]},Qv={browser:.14,runner:.14,"low-slung":.22,"long-neck":.2},Zd={browser:0,runner:0,"low-slung":.18,"long-neck":.3};function Jv(n,e,t){const i=Uc(`${t}/coat-individual-v2`),s=()=>i()*2-1,r=Math.pow(1+Qv[n]*s(),2.2),o=.15*s(),a=.1*s(),l=.05*s(),c=e.pattern==="stripes"||e.pattern==="bands"||e.pattern==="brindle",u=.05*s(),f=.15*s(),p=1+(c?.1:.06)*s();let m=e.marks;for(const h of["socks","blaze"])i()<.12&&K0[n].includes(h)&&(m^=yn[h]);const g=Ic,x={...e.colours};for(const h of["base","accent","belly"])x[h]=e.colours[h].map(M=>Un(M*r,0,1));const d=Math.pow(1+Zd[n]*s(),2.2);return Zd[n]>0&&(x.accent=x.accent.map(h=>Un(h*d,0,1))),{...e,colours:x,marks:m,contrast:Un(e.contrast+o,g.contrast[0],g.contrast[1]),countershade:Un(e.countershade+a,g.countershade[0],g.countershade[1]),bellyLine:Un(e.bellyLine+l,g.bellyLine[0],g.bellyLine[1]),threshold:Un(e.threshold+u,g.threshold[0],g.threshold[1]),warp:Un(e.warp+f,g.warp[0],g.warp[1]),scale:Un(e.scale*p,g.scale[0],g.scale[1])}}function ey(n){return 1-dr(.3,.7,n)}const tc=new Map;function ty(n){const e=j0(n),t=tc.get(e);if(t)return t;const i=Oc(n),{lineage:s,coat:r}=V0(n),{dimorphism:o,hornlessFemales:a}=Hv(n),l={farId:e,lineage:s,coat:r,dimorphism:o,hornlessFemales:a,mass:wi(`${i}/mass`),limb:wi(`${i}/limb`),neck:wi(`${i}/neck`),roughness:.84+wi(`${i}/roughness`)*.035};return tc.size>=512&&tc.clear(),tc.set(e,l),l}function ny(n,e,t,i){const s=`${e}/${t}/appearance-v1`,{farId:r,lineage:o,coat:a,mass:l,limb:c,neck:u,roughness:f,dimorphism:p,hornlessFemales:m}=ty(n),g=$0(n.archetype,a,s),x=i==="adult"?1:.22+.23*Rs(`${s}/maturity-v2`),d=i==="adult"?g:{...g,juvenileSpots:g.marks&yn["juvenile-spots"]?ey(x):0,greying:0},h=yc(n),M=Y0(r,a,n.archetype,g,h,W0(n,h));return{version:ca,individualKey:s,markingSeed:Nc(`${s}/markings`),pattern:n.pattern,palette:{base:uc(M),marking:uc(g.colours.accent),belly:uc(g.colours.belly)},roughness:f,profile:{mass:l,limb:c,neck:u,dimorphism:p,hornlessFemales:m},individual:{size:wi(`${s}/size`),condition:wi(`${s}/condition`),muzzle:wi(`${s}/muzzle`),ears:wi(`${s}/ears`),sex:Rs(`${s}/sex-v2`)<.5?"male":"female",coatPhase:Rs(`${s}/coat-phase-v2`),limb:wi(`${s}/limb-v2`),neck:wi(`${s}/neck-v2`),tail:wi(`${s}/tail-v2`)},growth:{stage:i,maturity:x,lateral:1},coat:d,lineage:{family:o.family,pattern:o.pattern}}}function iy(n){if(!n||typeof n!="object"||n.version!=="fauna-coat-1")return["invalid coat genome"];const e=[];(!l0(n.pattern)||n.pattern==="auto")&&e.push("invalid coat pattern");for(const[t,[i,s]]of Object.entries(Ic)){const r=n[t];(!Number.isFinite(r)||r<i||r>s)&&e.push(`coat ${t} out of range`)}return(!Number.isInteger(n.seed)||n.seed<0||n.seed>4294967295)&&e.push("invalid coat seed"),n.markRole!=="accent"&&n.markRole!=="belly"&&e.push("invalid coat mark role"),(!n.colours||!da.every(t=>Array.isArray(n.colours[t])&&n.colours[t].length===3&&n.colours[t].every(i=>Number.isFinite(i)&&i>=0&&i<=1)))&&e.push("invalid coat colours"),e}function sy(n){return typeof n=="string"&&a0.includes(n)}function yc(n){return n.morphology?n.morphology.family:n.archetype==="browser"?"ungulate":n.archetype==="runner"?"cursorial":n.archetype==="long-neck"?"long-neck":Nc(`${n.torsoLength}/${n.torsoWidth}/${n.color}/family-v1`)%4===0?"proboscidean":"padded"}const ry={browser:{trunk:.58,width:.55,limb:.69,neck:.53,head:.75,foot:.76,ear:.82},runner:{trunk:.56,width:.56,limb:.63,neck:.57,head:.76,foot:.8,ear:.82},"low-slung":{trunk:.59,width:.58,limb:.62,neck:.56,head:.75,foot:.78,ear:.8},"long-neck":{trunk:.59,width:.56,limb:.71,neck:.43,head:.73,foot:.77,ear:.81}},oy=.28,ay={torso:"torso",neck:"neck",head:"head",tail:"tail",upper:"limb-upper",lower:"limb-lower",foot:"foot",armor:"armor",muzzle:"muzzle",ear:"ear","limb-upper":"limb-upper","limb-lower":"limb-lower","tail-tip":"tail-tip",horn:"horn",wing:"wing",eye:"eye"},cy={rosettes:.4,reticulated:.67,dapple:.67,stripes:.67,bands:.67,brindle:.67,piebald:.67};function Z0(n,e){const t=4*e;if(!(t>0))return 1/0;if(n.pattern==="spots")return Cv({...n,scale:1})/t;const i=cy[n.pattern],s=go[n.pattern];return i===void 0||!(s>0)?1/0:i/(s*t)}let Qd,Jd=NaN,Cl;function Q0(n,e){if(n===Qd&&e===Jd)return Cl;const t=Z0(n,e);return Qd=n,Jd=e,Cl=n.scale>t?{...n,scale:t}:n,Cl}function ly(n){const e=n.coat;return e.pattern!=="bands"&&e.pattern!=="stripes"||!Number.isFinite(n.individual.coatPhase)?0:n.individual.coatPhase/(go[e.pattern]*e.scale)}const pi={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},Si=new Float64Array(3);function hy(n,e,t,i,s,r,o){const a=n.appearance,l=Math.max(n.torsoLength,.001);pi.x=e/l+ly(a),pi.y=(t-s)/l,pi.z=i/l*(a.growth.lateral??1),pi.dorsal=o?.dorsal!==void 0&&Number.isFinite(o.dorsal)?Un(o.dorsal,-1,1):Un(2*(t-s)/Math.max(n.torsoHeight,.05),-1,1),pi.region=r!==void 0&&ay[r]||"torso",pi.along=o?.along!==void 0&&Number.isFinite(o.along)?Un(o.along,0,1):0;const c=o?.cellM!==void 0&&o.cellM>0?o.cellM/l:0;return pi.footprint=Eo(a.coat,c),c>0?Q0(a.coat,c):a.coat}let ef,tf;function uy(n){return n!==ef&&(ef=n,tf={...n,marks:n.marks&-129}),tf}function XS(n,e,t,i,s,r,o){return dy(n,e,t,i,s,r,o)}function dy(n,e,t,i,s,r,o,a,l=0,c=!1){const u=n.appearance;if(!u)return;if(u.version!==ca||!u.coat)return fy(n,e,t,i,s);const f=hy(n,e,t,i,s,r,o),p=u.growth.stage==="juvenile"&&(f.marks&yn.socks)!==0&&(pi.region==="limb-lower"||pi.region==="foot");if(!(f.marks&yn["juvenile-spots"])||!(f.juvenileSpots>0))return Ri(f,pi,Si,0),p&&of(f,u.growth.maturity,a,l),[Si[0],Si[1],Si[2]];const m=uy(f);if(Ri(m,pi,Si,0),p&&of(m,u.growth.maturity,a,l),pi.region==="torso"||pi.region==="limb-upper"){const g=Math.max(n.torsoLength,.001),x=o?.cellM!==void 0&&o.cellM>0?o.cellM/g:0,d=F0(f.seed,e/g,(t-s)/g,i/g,x,n.torsoHeight/2/g,n.torsoWidth/2/g);if(d>0){const h=f.colours.belly,M=.85*f.juvenileSpots*d;for(let _=0;_<3;_++){const b=N0[_];Si[_]=Ds(Si[_],Math.max(Ds(h[_],b,.55),Ds(Si[_],b,.5)),M)}}}return[Si[0],Si[1],Si[2]]}let nf,sf;const rf=new Float64Array(3);function of(n,e,t,i=0){const s=U0(e);if(!(s>=1)){n!==nf&&(nf=n,sf={...n,marks:n.marks&-2}),Ri(sf,pi,rf,0);for(let r=0;r<3;r++)Si[r]=Ds(rf[r],Si[r],s)}}function fy(n,e,t,i,s){const r=n.appearance,o=e/n.torsoLength,a=(t-s)/n.torsoHeight,l=Math.abs(i)/n.torsoWidth,c=(r.markingSeed>>>0)/4294967296*Math.PI*2;let u=0;if(r.pattern==="stripes"){const h=Math.sin(o*32+Math.sin(a*4+c)*.65+l*1.5+c);u=dr(.44,.72,h)*(1-dr(.6,1.3,Math.abs(a)))}else if(r.pattern==="spots"){const h=o*10,M=a*6+l*.7,_=Math.floor(h),b=Math.floor(M);let S=2;for(let v=-1;v<=1;v++)for(let E=-1;E<=1;E++){const R=_+v,w=b+E,T=`${r.markingSeed}/${R}/${w}`,C=.5+wi(`${T}/x`)*.22,I=.5+wi(`${T}/y`)*.22;S=Math.min(S,Math.hypot(h-R-C,M-w-I))}u=(1-dr(.2,.34,S))*(1-dr(.7,1.4,Math.abs(a)))}const f=Al(r.palette.base),p=Al(r.palette.marking),m=Al(r.palette.belly),g=1-dr(-.42,.06,a),x=1-.1*dr(.02,.55,a),d=1+.018*Math.sin(o*69+a*23+c)*Math.sin(l*37-a*41);return f.map((h,M)=>Un(Ds(Ds(h,p[M],u*.78),m[M],g*.62)*x*d,0,1))}const J0="creature-genome-1",ep=["browser","runner","low-slung","long-neck"],af=["#8d633e","#657a4b","#5f6d78","#9a7650","#78654a","#596f65"],cf=["#e1c58a","#c98757","#a9bec3","#d6a56d","#b9a675","#d1d6c8"];function tp(n){let e=2166136261;for(let t=0;t<n.length;t++)e^=n.charCodeAt(t),e=Math.imul(e,16777619);return e^=e>>>16,e=Math.imul(e,2146121005),e^=e>>>15,e=Math.imul(e,2221713035),(e^e>>>16)>>>0}function fc(n){return tp(n)/4294967296}function py(n,e,t){return e+(t-e)*fc(n)}function my(n,e,t){return Math.max(e,Math.min(t,n))}function Zi(n){return Math.round(n*1e3)/1e3}function gy(n){if(typeof n!="string"||!n.trim()||n.length>160)throw new Error("seed must be a non-empty string up to 160 characters")}function xy(n){if(!ep.includes(n))throw new Error(`Unknown creature archetype: ${String(n)}`)}function _y(n){return{...n,mutationLog:[...n.mutationLog],...n.appearance?{appearance:by(n.appearance)}:{},...n.morphology?{morphology:{...n.morphology}}:{}}}function by(n){const e={...n,palette:{...n.palette},profile:{...n.profile},individual:{...n.individual},growth:{...n.growth}};return n.coat&&(e.coat={...n.coat,colours:Object.fromEntries(Object.entries(n.coat.colours).map(([t,i])=>[t,[...i]]))}),n.lineage&&(e.lineage={...n.lineage}),e}const My={browser:{torsoLength:1.72,torsoHeight:.82,torsoWidth:.68,legLength:1.08,upperLegFraction:.53,stanceWidth:.76,neckLength:.58,neckRise:.34,headLength:.48,headWidth:.32,tailLength:.48,footLength:.25,footWidth:.15,hornLength:.22,earLength:.18,armor:.08,walkSpeed:1.05,runSpeed:3.15,strideLength:.9},runner:{torsoLength:1.94,torsoHeight:.66,torsoWidth:.48,legLength:1.46,upperLegFraction:.52,stanceWidth:.58,neckLength:.38,neckRise:.2,headLength:.44,headWidth:.25,tailLength:1.05,footLength:.3,footWidth:.11,hornLength:0,earLength:.24,armor:.02,walkSpeed:1.55,runSpeed:5.6,strideLength:1.35},"low-slung":{torsoLength:1.8,torsoHeight:.48,torsoWidth:.82,legLength:.62,upperLegFraction:.49,stanceWidth:.92,neckLength:.31,neckRise:.1,headLength:.52,headWidth:.42,tailLength:.3,footLength:.28,footWidth:.23,hornLength:.08,earLength:.12,armor:.58,walkSpeed:.72,runSpeed:2.25,strideLength:.58},"long-neck":{torsoLength:1.66,torsoHeight:.76,torsoWidth:.57,legLength:1.35,upperLegFraction:.54,stanceWidth:.68,neckLength:1.42,neckRise:.82,headLength:.43,headWidth:.27,tailLength:.72,footLength:.27,footWidth:.14,hornLength:0,earLength:.2,armor:.05,walkSpeed:1.12,runSpeed:3.45,strideLength:1.08}},np={torsoLength:[.7,3.2],torsoHeight:[.25,1.5],torsoWidth:[.25,1.5],legLength:[.35,2.5],upperLegFraction:[.4,.62],stanceWidth:[.35,1.5],neckLength:[.15,2.8],neckRise:[0,1.8],headLength:[.2,1],headWidth:[.12,.7],tailLength:[0,1.8],footLength:[.1,.65],footWidth:[.06,.45],hornLength:[0,.9],earLength:[0,.45],armor:[0,1],walkSpeed:[.4,2.4],runSpeed:[1.2,7.5],strideLength:[.18,1.9]};function ip(n){for(const[e,[t,i]]of Object.entries(np))n[e]=Zi(my(n[e],t,i));return n.runSpeed=Zi(Math.max(n.runSpeed,n.walkSpeed*1.75)),n}function qS(n,e,t){gy(n),xy(e);const i=tp(n).toString(16),s=My[e],r={version:J0,archetype:e,...s,color:af[Math.floor(fc(`${i}/color`)*af.length)],accentColor:cf[Math.floor(fc(`${i}/accent`)*cf.length)],pattern:["plain","stripes","spots"][Math.floor(fc(`${i}/pattern`)*3)],mutationLog:[`${e} founder anatomy`]};for(const o of["torsoLength","torsoHeight","torsoWidth","legLength","neckLength","headLength","tailLength","footLength","earLength"])r[o]=Zi(r[o]*(1+py(`${i}/${o}`,-.07,.07)));return ip(r)}function YS(n,e,t,i="adult",s){if(yy(n).length)throw new Error("Invalid creature genome");if(typeof e!="string"||!e||!Number.isInteger(t)||t<0||t>3||i!=="adult"&&i!=="juvenile")throw new Error("Invalid creature specimen request");if(s!==void 0&&!k0.includes(s))throw new Error("Invalid fauna morphology family");const r=s??yc(n),o=_y(n),a=ny(n,e,t,i),l=a.profile,c=a.individual,u=(b,S)=>{o[b]=Zi(o[b]*S)},f=1+c.size*(js(a)?n.archetype==="long-neck"?.1:.07:.045),p=1+c.condition*(js(a)?n.archetype==="low-slung"?.13:.09:.055);for(const b of["torsoLength","torsoHeight","torsoWidth","legLength","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","strideLength"])u(b,f);u("torsoLength",1+l.mass*.035),u("torsoHeight",(1+l.mass*.055)*p),u("torsoWidth",(1+l.mass*.075)*p),u("stanceWidth",1+l.mass*.065),u("footWidth",1+l.mass*.05),u("legLength",1+l.limb*.055-l.mass*.025),u("strideLength",1+l.limb*.055-l.mass*.025),u("neckLength",1+l.neck*.07),u("neckRise",1+l.neck*.06),u("headLength",1+c.muzzle*.065),u("headWidth",1+c.condition*.035),u("earLength",1+c.ears*.12);const m=js(a),g=m?1+(c.limb??0)*(n.archetype==="long-neck"?.06:.04):1,x=m?1+(c.neck??0)*(n.archetype==="long-neck"?.14:.07):1;m&&(u("legLength",g),u("strideLength",g),u("neckLength",x),u("neckRise",x),u("tailLength",1+(c.tail??0)*.1));const d=c.sex,h=Number.isFinite(l.dimorphism)?l.dimorphism:0;if(d==="male"){const b=1+.06*h;for(const S of["torsoLength","torsoHeight","torsoWidth","legLength","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","strideLength"])u(S,b);u("hornLength",1+.4*h)}else d==="female"&&(u("hornLength",1-.7*h),l.hornlessFemales&&(o.hornLength=0));if(s!==void 0){const S={ungulate:[.48,.39,.64,.34,.28,.17],cursorial:[.34,.26,.76,.23,.25,.14],padded:[.29,.48,.35,.18,.31,.24],"long-neck":[.46,.35,.83,.88,.25,.16],proboscidean:[.57,.49,.51,.17,.34,.29],winged:[.39,.34,.63,.34,.27,.17]}[r],v=o.torsoLength;o.torsoHeight=v*S[0]*p,o.torsoWidth=v*S[1]*p,o.legLength=v*S[2]*(1+l.limb*.035)*g,o.neckLength=v*S[3]*(1+l.neck*.035)*x,o.headLength=v*S[4]*(1+c.muzzle*.065),o.headWidth=v*S[5],o.neckRise=o.neckLength*(r==="long-neck"?.59:.45),o.stanceWidth=o.torsoWidth*1.1,o.footWidth=o.torsoWidth*(r==="proboscidean"?.27:.23),o.footLength=o.footWidth*1.5,o.strideLength=o.legLength*.82,o.hornLength=r==="ungulate"?Math.min(o.hornLength,o.headLength*.65):0,o.armor=r==="padded"?Math.min(o.armor,.4):0}if(r==="proboscidean"){const b=m?p:1,S=m?1+c.condition*.035:1,v=m?1+c.ears*.12:1;o.torsoHeight=Math.max(o.torsoHeight,o.torsoLength*.48*b),o.headWidth=Math.max(o.headWidth,o.headLength*.77*S),o.footWidth=Math.max(o.footWidth,o.torsoWidth*.25),o.hornLength=0,o.armor=0,o.earLength=Math.max(o.earLength,o.headLength*.52*v)}if(r!=="ungulate"&&o.hornLength>0&&(o.hornLength=0,o.mutationLog.push(`${r} face: horns not grown (only hoofed browsers carry horns)`)),s!==void 0&&js(a)&&s!==yc(n)){const b=V0(n).coat;a.palette.base=uc(Y0(j0(n),b,n.archetype,$0(n.archetype,b,a.individualKey),r,W0(o,r)))}d==="male"&&(o.torsoWidth*=1+.06*h);const M=o.legLength/n.legLength;o.walkSpeed*=Math.sqrt(M),o.runSpeed*=Math.sqrt(M),o.strideLength=Math.min(o.strideLength,o.legLength*.96);const _=o.torsoWidth/o.torsoLength;if(i==="juvenile"){const S=ry[r==="long-neck"?"long-neck":r==="cursorial"?"runner":r==="padded"||r==="proboscidean"?"low-slung":"browser"];js(a)?vy(o,S,a.growth.maturity):(u("torsoLength",S.trunk),u("torsoHeight",S.trunk),u("torsoWidth",S.width),u("legLength",S.limb),u("stanceWidth",S.width),u("neckLength",S.neck),u("neckRise",S.neck),u("headLength",S.head),u("headWidth",S.head),u("footLength",S.foot),u("footWidth",S.foot),u("earLength",S.ear),u("tailLength",S.trunk),u("hornLength",.18),u("armor",.6),u("strideLength",S.limb),u("walkSpeed",Math.sqrt(S.limb)),u("runSpeed",Math.sqrt(S.limb)))}if(js(a)&&r==="long-neck"&&o.neckLength<o.torsoLength*.6){const b=o.torsoLength*.6/o.neckLength;o.neckLength*=b,o.neckRise*=b}return js(a)&&r==="padded"&&(o.legLength=Math.min(o.legLength,o.torsoLength*.445)),ip(o),o.footWidth=Zi(Math.min(o.footWidth,o.stanceWidth*.55)),o.strideLength=Zi(Math.min(o.strideLength,o.legLength*.96)),js(a)&&i==="juvenile"&&(a.growth.lateral=Math.round(_/(o.torsoWidth/o.torsoLength)*1e6)/1e6),o.appearance=a,o.color=a.palette.base,o.accentColor=a.palette.marking,o.morphology={version:"fauna-morphology-1",family:r,footType:r==="ungulate"||r==="long-neck"?"hoof":r==="padded"||r==="proboscidean"?"broad-pad":"paw",trunkLength:r==="proboscidean"?Zi(Math.min(1.45,o.headLength*1.9)):0,wingSpan:r==="winged"?Zi(o.torsoLength*1.85):0,wingState:r==="winged"?"folded":"none"},o.mutationLog.push(`${r} phenotype; ${i} anatomy and identity-preserving coat${d?`; ${d}`:""}`),o}function js(n){return n.version===ca&&!!n.coat}function vy(n,e,t){const i=(1-t)/(1-oy),s=d=>1-(1-d)*i,r=s(e.trunk),o=s(e.width),a=s(e.limb)*(1+.12*(1-t)),l=s(e.neck),c=s(e.head),u=s(e.foot),f=s(e.ear),p=(d,h)=>{n[d]=Zi(n[d]*h)};p("torsoLength",r),p("torsoHeight",r),p("torsoWidth",o),p("legLength",a),p("stanceWidth",o),p("neckLength",l),p("neckRise",l),p("footLength",u),p("footWidth",u),p("earLength",f),p("tailLength",r);const m=n.headLength*c,g=.05*(1-t)/(1-.22)*n.torsoLength,x=(m+g)/m;n.headLength=Zi(m*x),n.headWidth=Zi(n.headWidth*c*x),p("hornLength",Math.min(t*t,.2)),p("armor",.6),p("strideLength",a),p("walkSpeed",Math.sqrt(a)),p("runSpeed",Math.sqrt(a))}function yy(n){const e=[];if(!n||typeof n!="object")return["genome must be an object"];n.version!==J0&&e.push("unsupported genome version"),ep.includes(n.archetype)||e.push("unknown archetype");const t=["torsoLength","torsoHeight","torsoWidth","legLength","upperLegFraction","stanceWidth","neckLength","neckRise","headLength","headWidth","tailLength","footLength","footWidth","hornLength","earLength","armor","walkSpeed","runSpeed","strideLength"];for(const i of t){const s=n[i],[r,o]=np[i];(!Number.isFinite(s)||s<r||s>o)&&e.push(`${i} must be a finite number from ${r} to ${o}`)}if((n.upperLegFraction<.35||n.upperLegFraction>.7)&&e.push("upperLegFraction must permit a two-segment leg"),(n.legLength<=0||n.torsoLength<=0||n.torsoHeight<=0||n.torsoWidth<=0||n.stanceWidth<=0||n.headLength<=0||n.footWidth<=0)&&e.push("core body dimensions must be positive"),n.runSpeed<=n.walkSpeed&&e.push("runSpeed must exceed walkSpeed"),(!/^#[0-9a-f]{6}$/i.test(n.color)||!/^#[0-9a-f]{6}$/i.test(n.accentColor))&&e.push("colors must be #RRGGBB"),["plain","stripes","spots"].includes(n.pattern)||e.push("unknown pattern"),(!Array.isArray(n.mutationLog)||!n.mutationLog.every(i=>typeof i=="string"))&&e.push("mutationLog must be string[]"),n.appearance!==void 0){const i=n.appearance;if(!i||i.version!==ca&&i.version!==Ov)e.push("unsupported fauna appearance version");else{if(i.version===ca){e.push(...iy(i.coat)),(!i.individual||i.individual.sex!=="female"&&i.individual.sex!=="male")&&e.push("invalid individual sex"),(!i.individual||!Number.isFinite(i.individual.coatPhase)||i.individual.coatPhase<0||i.individual.coatPhase>1)&&e.push("invalid individual coat phase"),(!i.profile||!Number.isFinite(i.profile.dimorphism)||i.profile.dimorphism<0||i.profile.dimorphism>1||typeof i.profile.hornlessFemales!="boolean")&&e.push("invalid species dimorphism"),(!i.lineage||!sy(i.lineage.family)||typeof i.lineage.pattern!="string")&&e.push("invalid coat lineage");for(const s of["limb","neck","tail"]){const r=i.individual?.[s];r!==void 0&&(!Number.isFinite(r)||r<-1||r>1)&&e.push(`invalid individual ${s} axis`)}(!i.growth||!Number.isFinite(i.growth.lateral)||i.growth.lateral<.5||i.growth.lateral>2)&&e.push("invalid coat growth frame")}(typeof i.individualKey!="string"||!i.individualKey||!Number.isInteger(i.markingSeed)||i.markingSeed<0||i.markingSeed>4294967295)&&e.push("invalid appearance identity"),["plain","stripes","spots"].includes(i.pattern)||e.push("invalid appearance pattern"),(!i.palette||!["base","marking","belly"].every(s=>/^#[0-9a-f]{6}$/i.test(i.palette[s]??"")))&&e.push("invalid appearance palette"),(!Number.isFinite(i.roughness)||i.roughness<.65||i.roughness>1)&&e.push("invalid coat roughness"),(!i.profile||!["mass","limb","neck"].every(s=>Number.isFinite(i.profile[s])&&Math.abs(i.profile[s])<=1))&&e.push("invalid species profile"),(!i.individual||!["size","condition","muzzle","ears"].every(s=>Number.isFinite(i.individual[s])&&Math.abs(i.individual[s])<=1))&&e.push("invalid individual profile"),(!i.growth||!["adult","juvenile"].includes(i.growth.stage)||!Number.isFinite(i.growth.maturity)||i.growth.maturity<0||i.growth.maturity>1)&&e.push("invalid growth profile")}}if(n.morphology!==void 0){const i=n.morphology;if(!i||i.version!=="fauna-morphology-1"||!k0.includes(i.family))e.push("unsupported fauna morphology");else{["paw","hoof","broad-pad"].includes(i.footType)||e.push("invalid morphology feet"),(!Number.isFinite(i.trunkLength)||i.trunkLength<0||i.trunkLength>1.5||!Number.isFinite(i.wingSpan)||i.wingSpan<0||i.wingSpan>6)&&e.push("invalid morphology appendage dimensions"),i.wingState!=="none"&&i.wingState!=="folded"&&e.push("invalid wing state"),(i.family==="winged"!=i.wingSpan>0||i.wingState!==(i.family==="winged"?"folded":"none")||i.family==="proboscidean"!=i.trunkLength>0)&&e.push("incoherent morphology appendages");const s=i.family==="ungulate"||i.family==="long-neck"?"hoof":i.family==="padded"||i.family==="proboscidean"?"broad-pad":"paw";i.footType!==s&&e.push("incoherent morphology feet")}}return e}const Sy="fauna-composer-phenotype-1";function Ey(n){if(!n||n.version!==Sy||n.units!=="m")throw new Error("Unsupported Composer build phenotype");const e=(s,r,o,a)=>{if(!Number.isFinite(s)||s<r||s>o)throw new Error(`Invalid Composer phenotype ${a}`)},t=n.dimensions;if(!t||!n.identity||!n.motion||!n.coatFrame)throw new Error("Incomplete Composer build phenotype");for(const s of["bodyLength","torsoWidth","torsoHeight","legReach","stanceWidth","neckLength","headLength","headWidth","footLength","footWidth"])e(t[s],.001,20,s);for(const s of["tailLength","hornLength","earLength","trunkLength","wingSpan"])e(t[s],0,30,s);if(e(t.upperLegFraction,.1,.9,"upperLegFraction"),e(t.neckElevation,-Math.PI/2,Math.PI/2,"neckElevation"),e(n.identity.maturity,0,1,"maturity"),!["none","female","male"].includes(n.identity.sex))throw new Error("Invalid Composer phenotype sex");for(const s of["individualId","speciesId","appearanceKey"]){const r=n.identity[s];if(r!==void 0&&(typeof r!="string"||!r||r.length>2048))throw new Error(`Invalid Composer phenotype ${s}`)}if(e(n.motion.walkSpeed,.001,30,"walkSpeed"),e(n.motion.strideLength,.001,20,"strideLength"),n.coatStage){if(n.coatStage.version!==Iv||!["adult","juvenile"].includes(n.coatStage.stage))throw new Error("Invalid Composer coat stage");e(n.coatStage.maturity,0,1,"coat stage maturity")}e(n.coatFrame.phase,-10,10,"coat phase"),e(n.coatFrame.lateral,.01,100,"coat lateral"),e(n.roughness,0,1,"roughness");const i=n.coat;if(!i||i.version!=="fauna-coat-1"||i.pattern==="auto"||!Jh.includes(i.pattern)||!["accent","belly"].includes(i.markRole))throw new Error("Invalid Composer resolved coat");if(!Number.isInteger(i.seed)||i.seed<0||i.seed>4294967295||!Number.isInteger(i.marks))throw new Error("Invalid Composer resolved coat seed/marks");for(const[s,r]of Object.entries(Ic))e(i[s],r[0],r[1],`coat.${s}`);for(const s of da){const r=i.colours?.[s];if(!Array.isArray(r)||r.length!==3)throw new Error(`Invalid Composer coat role ${s}`);for(const o of r)e(o,0,1,`coat.${s}`)}return structuredClone(n)}function wy(n){if(n.layout!=="quadruped")throw new Error("Composer phenotype-1 currently supports the inherited quadruped layout");if(n.maturity!==1||n.individualSeed!==0||n.variability!==0||n.dimorphism!==0||n.allometry!==0||n.condition!==0||n.sex!=="auto")throw new Error("Resolved Composer phenotype requires neutral individual controls; edit resolved dimensions instead of applying growth twice")}const Ty="fauna-composer-individual-2",Ay=["layout","torso","head","horns","legs","feet","arms","hands","tail","armor","wings","trunk"],as=(n,e,t)=>Math.max(e,Math.min(t,n)),Zt=n=>{const e=Math.round(n*1e9)/1e9;return e===0?0:e},Ry=n=>n.toString(16).padStart(8,"0");function Cy(n){const e=jM(n);return Ry(oa(Ay.map(t=>`${t}_${String(e[t])}`).join("*")))}function Ly(n,e){if(e===0)return{z:{size:0,limb:0,neck:0,head:0,tail:0,mass:0,carriage:0},sexU:0,horn:0,curl:0,asymMag:0,asymSign:0,ear:0,eye:0,limbR:0,fore:[0,0,0],hind:[0,0,0],torso:[0,0,0,0,0],headPitch:0,tailCarriage:0,phase:0,period:0,duty:0,lift:0,breath:0,look:0,osteoderm:.5,plate:.5,feather:.5,posture:0};const t=cu(`composer-individual-v2/${n}/${e}`),i=()=>as((t()+t()+t()-1.5)/.5,-2,2),s={size:i(),limb:i(),neck:i(),head:i(),tail:i(),mass:i(),carriage:i()},r=t(),o=i(),a=i(),l=t(),c=t(),u=i(),f=i(),p=i(),m=[i(),i(),i()],g=[i(),i(),i()],x=[i(),i(),i(),i(),i()],d=i(),h=i(),M=t(),_=i(),b=i(),S=i(),v=t(),E=t(),R=t(),w=t(),T=t(),C=i();return{z:s,sexU:r,horn:o,curl:a,asymMag:l,asymSign:c,ear:u,eye:f,limbR:p,fore:m,hind:g,torso:x,headPitch:d,tailCarriage:h,phase:M,period:_,duty:b,lift:S,breath:v,look:E,osteoderm:R,plate:w,feather:T,posture:C}}const ss=(n,e,t)=>as(e*n+Math.sqrt(1-e*e)*t,-2,2);function Py(n,e){return n.sex==="female"||n.sex==="male"?n.sex:n.dimorphism>0&&n.individualSeed>0?e<.5?"female":"male":"none"}function Zo(n){const e=br(n).recipe,t=e.variability,i=e.dimorphism,s=e.maturity,r=e.individualSeed,o=Cy(e),a=Ly(o,r),l=a.z,c=Py(e,a.sexU),u=c==="male"?1+.35*i:c==="female"?1-.6*i:1,f=Math.round(e.bodyLength*1e3)/1e3,p=e.allometry,m=(d,h,M)=>{if(r===0||t===0)return 0;const _=h+Math.min(M-h,Math.floor(d*(M-h+1)));return Math.round(_*Math.min(1,t))||0},g=e.marks&yn["juvenile-spots"]?as((.75-s)/.4,0,1):0;return{version:Ty,individualSeed:r,speciesKey:o,sex:c,maturity:s,condition:e.condition,size:Zt(l.size),limb:Zt(l.limb),neck:Zt(l.neck),head:Zt(l.head),tail:Zt(l.tail),mass:Zt(l.mass),posture:Zt(ss(l.carriage,.4,a.posture)),hornScale:Zt(Math.max(.05,1+.15*t*a.horn)*u*s*s),hornCurl:Zt(.15*t*a.curl),hornAsym:Zt((a.asymSign<.5?-1:1)*(.02+.03*a.asymMag)*t*(r===0?0:1)),earScale:Zt((1+.075*t*a.ear)*(1+.2*(1-s))),eyeScale:Zt((1+.04*t*a.eye)*(1+.25*(1-s))),limbRadius:Zt(1+.05*t*ss(l.mass,.6,a.limbR)+.04*e.condition),segmentJitter:{fore:a.fore.map(d=>Zt(.025*t*d)),hind:a.hind.map(d=>Zt(.025*t*d))},torso:{chest:Zt(as(t*ss(l.mass,.5,a.torso[0]),-2,2)),belly:Zt(as(t*ss(l.mass,.5,a.torso[1]),-2,2)),rump:Zt(as(t*ss(l.mass,.5,a.torso[2]),-2,2)),waist:Zt(as(t*ss(l.mass,-.4,a.torso[3]),-2,2)),withers:Zt(as(t*ss(l.neck,.5,a.torso[4]),-2,2))},carriage:{neck:Zt(.06*t*l.carriage),headPitch:Zt(.04*t*ss(l.carriage,-.5,a.headPitch)),tail:Zt(.075*t*ss(l.carriage,.3,a.tailCarriage))},motion:{phase:Zt(a.phase),periodScale:Zt(1+.03*t*ss(l.size,.5,a.period)),dutyDelta:Zt(.015*t*a.duty),liftScale:Zt(1+.05*t*a.lift),breathPhase:Zt(a.breath),lookPhase:Zt(a.look)},coat:{driftKey:`${o}/${r}`,juvenileSpots:Zt(g)},countScale:{osteoderm:m(a.osteoderm,-2,2),plate:m(a.plate,-2,2),feather:m(a.feather,-1,3)},allometry:{limbRobust:Zt(f**(.09*p)),headRel:Zt(f**(-.12*p)),eyeRel:Zt(f**(-.25*p))},neutral:r===0&&s===1&&e.condition===0&&c==="none"&&p===0}}const Dy={bodyLength:["Body length"," m"],girth:["Girth",""],legLength:["Leg length",""],neckLength:["Neck length",""],headSize:["Head size",""],snoutLength:["Snout length",""],tailLength:["Tail length",""],posture:["Posture",""]},Iy=(n,e)=>e>=1?Math.round(n):Math.round(n/e)*e,Uy=n=>Number(n.toFixed(4));function jS(n){const e=br(n).recipe,t=Zo(e);if(t.neutral)return{recipe:{...e},traits:t,deltas:[]};const i={...e},s=[],r=[],o=e.variability,a=e.dimorphism,l=e.maturity,c=t.sex,u=(x,d,h=0)=>{const M=d.reduce((I,[F])=>I*F,1);if(M===1&&h===0)return;const[_,b,S]=ra[x],v=i[x],E=v*M+h,R=Uy(as(Iy(E,S),_,b)),[w,T]=Dy[x];if((E<_-S*.5||E>b+S*.5)&&r.push(`${w} limited to ${R.toFixed(2)}${T} (range ${E<_?"minimum":"maximum"}; ${E.toFixed(3)}${T} requested).`),R===v)return;i[x]=R;const C=[...d.filter(([I])=>I!==1).map(([I,F])=>`${F} ${I>=1?"+":""}${((I-1)*100).toFixed(1)}%`),...h?[`individual carriage ${h>0?"+":""}${h.toFixed(3)}`]:[]].join(", ");s.push(`${w} ${v.toFixed(2)} → ${R.toFixed(2)}${T} (${C}).`)},f=1-l,p=e.legs==="unguligrade"||e.legs==="digitigrade";u("bodyLength",[[1+.045*o*t.size,"individual size"],[c==="male"?1+.1*a:1,"male"],[.45+.55*l,`maturity ${l}`]]);const m=Zo(i).allometry.headRel;if(u("legLength",[[1+.045*o*t.limb-.01*o*t.mass,"individual limbs"],[p?1+.15*f:1,`maturity ${l}`]]),u("neckLength",[[1+.065*o*t.neck,"individual neck"],[.75+.25*l,`maturity ${l}`]]),u("headSize",[[1+.05*o*t.head,"individual head"],[1+.5*f,`maturity ${l}`],[m,"allometry"]]),u("snoutLength",[[1+.06*o*t.head,"individual head"],[.7+.3*l,`maturity ${l}`]]),e.tail!=="none"&&u("tailLength",[[1+.08*o*t.tail,"individual tail"],[.8+.2*l,`maturity ${l}`]]),u("girth",[[1+.06*e.condition+.04*o*t.mass,"condition and build"],[c==="male"?1+.05*a:1,"male"]]),e.layout==="quadruped"&&u("posture",[],.12*o*t.posture),e.layout==="biped"){const x=e.posture,d=x>.6,h=as(x+.035*o*t.posture,d?Math.min(x,.61):0,d?1:.6);u("posture",[],h-x)}const g=br(i).recipe;return{recipe:g,traits:Zo(g),deltas:[...s,...r]}}const $S="fauna-composer-face-geometry-2",Ny=Object.freeze({muzzle:{headScale:1,craniumHeight:.34,craniumWidth:.9,snout:.62},jaws:{headScale:1.15,craniumHeight:.34,craniumWidth:.95,snout:.62},beak:{headScale:.9,craniumHeight:.34,craniumWidth:.9,snout:.62},"flat-face":{headScale:.9,craniumHeight:.42,craniumWidth:.9,snout:.62},blunt:{headScale:.6,craniumHeight:.5,craniumWidth:.9,snout:.62},mandibles:{headScale:.7,craniumHeight:.3,craniumWidth:1.4,snout:.62},proboscis:{headScale:1.05,craniumHeight:.4,craniumWidth:.9,snout:.62*.4}});function Oy(n,e,t){return e==="limbless"?-.12:e==="many-legged"||e==="biped"&&t>.6?-.08:n==="beak"?-.12:-.3}function sp(n,e){const t=e.headLength,i=e.craniumWidth,s=e.craniumHeight,r=e.snoutLength;switch(n){case"muzzle":return{x:.4*t+r,y:-.24*s,h:.52*s,w:.48*i};case"jaws":return{x:.4*t+r,y:-.12*s,h:.36*s,w:.5*i};case"proboscis":return{x:.4*t+Math.max(r,nc.minMuzzle*t),y:nc.tipY*s,h:nc.tipH*s,w:nc.tipW*i};case"beak":{const o=Math.max(r,.15*t);return{x:.36*t+o,y:-.05*s,h:.1*s,w:.06*i}}case"flat-face":{const o=Math.max(.05*t,r*.6);return{x:.36*t+o,y:-.42*s,h:.34*s,w:.42*i}}case"blunt":return{x:.6*t+r*.3+.7*i,y:0,h:.5*s,w:.75*i};case"mandibles":{const o=Math.max(.25*t,r*1.1);return{x:.72*t+o,y:-.25*s,h:.3*s,w:.3*i}}}}const nc=Object.freeze({tipY:-.2,tipH:.92,tipW:1.02,minMuzzle:.08}),Fy=1,ky=1.45,zy=Object.freeze({tip:.3,power:1.25});function By(n,e){const t=zy;return n*(t.tip+(1-t.tip)*Math.pow(1-Math.min(1,Math.max(0,e)),t.power))}const rp=Object.freeze({hang:-1.45,ease:.5,lead:.4,flick:.55,curlMax:.9,maxPitch:1.1});function Gr(n,e,t=n,i=0){const s=rp,r=[];for(let o=0;o<n;o++){const a=Math.min(1,(o+s.lead)/(n-1+s.lead));let l=e+(s.hang-e)*Math.pow(a,s.ease)+(o===n-1&&n>1?s.flick:0);o>=t&&(l=Math.min(Math.max(l,s.maxPitch),l+i*(o-t+1))),r.push(l)}return r}function Vy(n,e,t){if(t(Gr(n,e)))return Gr(n,e);const i=rp.curlMax;for(let s=n-1;s>=1;s--){if(!t(Gr(n,e,s,i)))continue;let r=0,o=i;for(let a=0;a<24;a++){const l=(r+o)/2;t(Gr(n,e,s,l))?o=l:r=l}return Gr(n,e,s,o)}return Gr(n,e,1,i)}const Hy="fauna-composer-graph-4",KS="fauna-composer-trunk-motion-1",lf=Object.freeze({maxBones:160,maxVertices:48e3,maxTriangles:8e4,drawCallsPerCreature:2}),ZS=["neutral","idle","walk","display"],qn=(n,e,t)=>Math.max(e,Math.min(t,n)),di=(n,e,t)=>n+(e-n)*t,Es=(n,e,t)=>{const i=qn((t-n)/(e-n),0,1);return i*i*(3-2*i)},ft=(n=0,e=0,t=0)=>new ue(n,e,t),Fn=Object.freeze(ft(0,1,0)),Gy=Object.freeze(ft(1,0,0)),Is=n=>[n.x,n.y,n.z],Qo=n=>[n.x,n.y,n.z,n.w],xn=n=>ft(n[0],n[1],n[2]),ti=n=>new dn(n[0],n[1],n[2],n[3]),Qi=(n,e)=>new dn().setFromAxisAngle(n,e),Wy=ft(1,0,0),Xy=ft(0,1,0),la=ft(0,0,1),Dh=2e-5,Ih=.985;function Fi(n,e){const t=n.clone().normalize();let i=e.clone().addScaledVector(t,-e.dot(t));i.lengthSq()<1e-10&&(i=Math.abs(t.y)<.9?Fn.clone():ft(-Math.sign(t.y)||-1,0,0),i.addScaledVector(t,-i.dot(t))),i.normalize();const s=ft().crossVectors(t,i);return new dn().setFromRotationMatrix(new Ht().makeBasis(t,i,s))}function op(n,e,t,i,s){const r=e.clone().sub(n),o=r.length(),a=qn(o,Math.abs(t-i)+1e-6,t+i-1e-6),l=o>1e-9?r.multiplyScalar(1/o):ft(0,-1,0),c=(t*t-i*i+a*a)/(2*a),u=Math.sqrt(Math.max(0,t*t-c*c));let f=s.clone().addScaledVector(l,-s.dot(l));f.lengthSq()<1e-10&&(f=Math.abs(l.y)<.9?Fn.clone().addScaledVector(l,-l.y):Gy.clone().addScaledVector(l,-l.x)),f.normalize();const p=n.clone().addScaledVector(l,c).addScaledVector(f,u),m=n.clone().addScaledVector(l,a);return{joint:p,end:m,reachError:Math.abs(o-a)}}const qy={slim:{w:.13,h:.16},barrel:{w:.2,h:.2},"deep-chest":{w:.15,h:.2},flat:{w:.24,h:.12},annulated:{w:.1,h:.1},segmented:{w:.15,h:.1}},Yy={pillar:{seg:[.5,.5],tilt:0,ext:.94},plantigrade:{seg:[.5,.46],tilt:0,ext:.92},digitigrade:{seg:[.36,.38,.26],tilt:.38,ext:.9},unguligrade:{seg:[.3,.34,.36],tilt:.12,ext:.93},arthropod:{seg:[.45,.55],tilt:0,ext:.8}},jy={hoof:{h:.07,l:.1},paw:{h:.045,l:.14},claw:{h:.03,l:.24},pad:{h:.08,l:.16},hand:{h:.04,l:.26},spike:{h:.1,l:.03}};function ys(n,e){const t=e.parent>=0?n.bones[e.parent]:void 0,i=t?ti(t.restQuaternion):new dn,s=t?xn(t.restPosition):ft(),r=i.clone().invert(),o=e.position.clone().sub(s).applyQuaternion(r),a=r.multiply(e.quaternion.clone()).normalize(),l=n.bones.length;return n.bones.push({index:l,name:e.name,parent:e.parent,part:e.part,side:e.side??0,limb:e.limb??-1,length:e.length,driver:e.driver??"fk",offset:Is(o),restLocal:Qo(a),restPosition:Is(e.position),restQuaternion:Qo(e.quaternion.clone().normalize()),start:e.start,end:e.end??e.start}),l}const Dn=(n,e,t=0)=>({w:n,h:e,yc:t}),hf=n=>xn(n.restPosition).add(ft(n.length,0,0).applyQuaternion(ti(n.restQuaternion))),Bo=(n,e)=>xn(e).applyQuaternion(ti(n.restQuaternion)).add(xn(n.restPosition));function QS(n,e={}){const t=br(n).recipe,i=e.phenotype?Ey(e.phenotype):void 0,s=i?.dimensions;i&&wy(t);const r=tv(t),o=Zo(t),a=t.variability,l={bones:[]},c=t.layout,u=s?.bodyLength??t.bodyLength,f=c==="limbless"||c==="many-legged",p=c!=="limbless",m=c==="sprawled"||p&&t.legs==="arthropod",g=qy[t.torso],x=(f?.42:1)*t.girth*u;let d=s?s.torsoWidth/2:g.w*x,h=s?s.torsoHeight/2:g.h*x;const M=Math.cbrt(u*d*h),_=t.head,b=Ny[_],S=s?.headLength??t.headSize*b.headScale*M*(f?1:1.25),v=s?s.headWidth/(2*b.craniumWidth):S*b.craniumHeight,E=s?s.headWidth/2:v*b.craniumWidth,R=S*t.snoutLength*b.snout;let w=p?s?.legReach??t.legLength*u:0;c==="many-legged"&&t.legs!=="arthropod"&&(w=Math.min(w,.45*u));const T=Yy[t.legs],C=jy[t.feet],I=T.seg[2]??0,F=s?{...T,seg:[s.upperLegFraction*(1-I),(1-s.upperLegFraction)*(1-I),...I?[I]:[]]}:T,V=Me=>{if(F.seg.every((Xe,Ge)=>Me[Ge]===0))return F.seg;const Ie=F.seg.map((Xe,Ge)=>Xe*(1+Me[Ge])),Qe=F.seg.reduce((Xe,Ge)=>Xe+Ge,0),je=Ie.reduce((Xe,Ge)=>Xe+Ge,0);return Ie.map(Xe=>Xe*Qe/je)},W=V(o.segmentJitter.fore),D=V(o.segmentJitter.hind),B=(Me,Ie=!1)=>(Ie?W:D).map(Qe=>Qe*Me),G=F.tilt+(F.seg.length===3?.04*a*o.limb:0),Y=Me=>s?s.footWidth*.42:C.h*Me,N=Me=>s?.footLength??C.l*Me,te=(Me,Ie=!1)=>{const Qe=B(Me,Ie),je=Qe[0]+Qe[1],Xe=Qe[2]??0,Ge=m?0:G;if(m){const Lt=.55*je,gt=.8*je;return{height:Y(Me)+Xe+Math.sqrt(gt*gt-Lt*Lt),lateral:Lt}}const rt=Xe*Math.sin(Ge),Ct=F.ext*je,lt=s?Math.max(0,s.stanceWidth/2-.68*d*.85):0;return{height:Y(Me)+Xe*Math.cos(Ge)+Math.sqrt(Math.max(0,Ct*Ct-rt*rt-lt*lt)),lateral:0}},q=p?te(1,!0).height:0,fe=c==="many-legged"?t.legPairs:c==="limbless"?12:4,re=c==="many-legged"?u*.88:c==="limbless"?u*.8:u,ne=re/fe,K=s?.neckLength??(c==="limbless"?u*(.12+.1*t.neckLength):c==="many-legged"?Math.max(.25*ne,t.neckLength*.3*u):Math.max(.05*u,t.neckLength*.9*u)),he=c==="limbless"?2:qn(Math.round(1+t.neckLength*3.4),1,6),ae=t.tail==="none"?0:s?.tailLength??(t.tail==="stub"?u*(.08+.08*t.tailLength)*(f?.5:1):Math.max(.1*u,t.tailLength*u*(f?.4:1))*(t.tail==="feather-fan"?.25:1)),ge=t.tail==="none"?0:t.tail==="stub"||t.tail==="feather-fan"?2:t.tail==="tufted"?5:7,H=o.torso,de=o.condition,J=H.chest!==0||H.belly!==0||H.rump!==0||H.waist!==0||de!==0,me=(Me,Ie,Qe)=>Math.exp(-.5*((Me-Ie)/Qe)**2),U=Me=>{let Ie=1,Qe=1,je=0;if(t.torso==="segmented"||t.torso==="annulated"){const Xe=t.torso==="annulated"?.72:.82;Ie=Qe=di(Xe,1,Es(0,.2,Me))*di(.86,1,Es(1,.82,Me))}else{const Xe=.8+.2*Math.sin(Math.PI*qn(Me*1.08,0,1));if(Ie=Xe*(t.torso==="deep-chest"?di(.88,1.02,Me):1),Qe=Xe*(t.torso==="deep-chest"?.8+.4*Es(.3,.75,Me)-.12*Es(.9,1,Me):1),je=t.torso==="deep-chest"?-.14*h*Es(.35,.8,Me):t.torso==="barrel"?-.04*h:0,t.tail==="none"&&Me<.12&&(Ie*=di(.82,1,Me/.12),Qe*=di(.86,1,Me/.12)),c==="biped"&&t.arms!=="none"&&(Ie*=1+.22*Es(.55,.8,Me)*(1-.6*Es(.9,1,Me))),J){Qe*=1+.06*H.rump*me(Me,.1,.1),Ie*=1-.08*H.waist*me(Me,.3,.1);const Ge=Math.max(-.3,.1*H.chest*me(Me,.8,.08)+(.08*H.belly+.04*de)*me(Me,.5,.2))*h*Qe;return Dn(d*Ie,h*Qe+Ge/2,je-Ge/2)}}return Dn(d*Ie,h*Qe,je)};let ee=0;c==="biped"?ee=di(.21,1.36,t.posture):c==="quadruped"&&(ee=t.posture*.24);const P=Me=>{const Ie=U(.5/fe);return[.5*ne,(m?-.2:-.35)*Ie.h+Ie.yc,Me*.68*Ie.w]},ie=Me=>{const Ie=U(1-.65/fe);return[.35*ne,(m?-.18:-.3)*Ie.h+Ie.yc,Me*.68*Ie.w]},_e=(Me,Ie)=>{const Qe=U((Me+.5)/fe);return[.5*ne,-.25*Qe.h+Qe.yc,Ie*.8*Qe.w]},xe=Qi(la,ee);let Z=0,Re=w;const oe=ft(-re*.5*Math.cos(ee),0,0);if(!p)oe.y=U(.5).h-U(.5).yc;else{Z=te(w).height;const Me=c==="many-legged"?_e(0,1):P(1);oe.y=Z-xn(Me).applyQuaternion(xe).y,c==="biped"&&(oe.x=-.5*ne*Math.cos(ee))}if(p){const Me=h,Ie=()=>Math.max((m?.06:.15)*Z,.04*h),Qe=()=>{const Ge=c==="many-legged"?_e(0,1):P(1);oe.y=Z-xn(Ge).applyQuaternion(xe).y},je=()=>{let Ge=1/0;for(let rt=0;rt<=16;rt++){const Ct=rt/16,lt=U(Ct);Ge=Math.min(Ge,(oe.y+Ct*re*Math.sin(ee)-Ie())/Math.max(1e-6,(lt.h-lt.yc)*Math.cos(ee)))}return Ge},Xe=w;if(s&&je()<1){const Ge=lt=>(w=lt,Z=te(lt).height,Qe(),je()>=1);let rt=Xe,Ct=Xe;for(let lt=0;lt<24&&!Ge(Ct);lt++)Ct*=2;if(!Ge(Ct))throw new Error("Resolved torso cannot clear ground within the bounded leg fitter");for(let lt=0;lt<44;lt++){const Lt=(rt+Ct)/2;Ge(Lt)?Ct=Lt:rt=Lt}Ge(Ct)}for(let Ge=0;!s&&Ge<24;Ge++){const rt=je();if(rt>=1)break;!s&&h*rt>=Me*.6?h*=Math.min(rt,.995):(w*=1.2,Z=te(w).height),Qe()}w>Xe*1.001&&r.push({part:"Leg length",chosen:t.legLength.toFixed(2),effect:`Lengthened to ${(w/u).toFixed(2)} body lengths so the body clears the ground.`}),h<Me*.995&&r.push({part:"Torso depth",chosen:t.torso,effect:`Reduced to ${(h/Me*100).toFixed(0)}% so the belly clears the ground on these leg lengths.`})}const Ee=[],ze=ft(1,0,0).applyQuaternion(xe),Ve=Me=>{const Ie=U(Me);return Ie.h-Ie.yc+Dh};let it=oe.clone();p||(it.y=Ve(0));for(let Me=0;Me<fe;Me++){let Ie=ze.clone();if(!p){const Qe=Ve((Me+1)/fe)-it.y;Ie=ft(Math.sqrt(ne*ne-Qe*Qe),Qe,0).normalize()}Ee.push(ys(l,{name:`torso_${Me}`,parent:Me?Ee[Me-1]:-1,part:"torso",length:ne,position:it.clone(),quaternion:p?xe.clone():Fi(Ie,Fn),start:U(Me/fe),end:U((Me+1)/fe)})),it=it.clone().addScaledVector(Ie,ne)}const se=l.bones[Ee[fe-1]],A=hf(se),y=U(1),O=[];if(ge){const Me=U(0),Ie=Math.min(Me.w,Me.h),Qe=t.tail==="reptile"||t.tail==="club"?.78:t.tail==="tufted"?.22:t.tail==="feather-fan"?.5:.55,je=t.tail==="reptile"?.06:t.tail==="club"?.16:t.tail==="tufted"?.09:.3;let Xe=c==="biped"?t.posture>.6?-1:-.05-ee*.4:c==="quadruped"?t.tail==="tufted"?-1.05:-.35:-.08;f?Xe=-.02:Xe+=o.carriage.tail;const Ge=c==="biped"&&t.posture>.6?.18:t.tail==="tufted"?-.06:f?0:-.07;let rt=xn(l.bones[Ee[0]].restPosition),Ct=ae/ge;for(let lt=0;lt<ge;lt++){const Lt=Xe+Ge*lt,gt=ft(-Math.cos(Lt),Math.sin(Lt),0),Ft=Fi(gt,Fn),$t=Ie*di(lt===0?1:Qe,je,Math.pow(lt/ge,.85))/1,Gt=Ie*di(Qe,je,Math.pow((lt+1)/ge,.85)),Kn=lt===0?Dn(Me.w,Me.h,Me.yc):Dn($t*1.04,$t,0);O.push(ys(l,{name:`tail_${lt}`,parent:lt?O[lt-1]:Ee[0],part:"tail",length:Ct,position:rt.clone(),quaternion:Ft,start:Kn,end:Dn(Gt*1.04,Gt,0)})),rt.addScaledVector(gt,Ct),lt===0&&(Ct=ae/ge)}Ll(l,O,Sc(t,u,l.bones[O[O.length-1]]),.004*u)}const j=[],le=Math.min(E,v)*(f?.8:.62),X=Math.max(Math.min(y.w,y.h)*(f?1:.62),le);let Se,Te,Fe=Oy(_,c,t.posture);if(c==="limbless")Se=.32,Te=.18;else if(c==="many-legged")Se=.05,Te=.02;else{const Me=di(.12,1.25,qn(t.neckLength/1.3,0,1));Se=Math.max(ee,Me),Te=Math.max(.05,Me*.75),c==="biped"&&t.posture>.6&&(Se=Math.max(ee*.9,Me),Te=Math.max(.6,Me))}Se+=o.carriage.neck,Te+=o.carriage.neck,Fe+=o.carriage.headPitch,s&&(Se=Te=s.neckElevation);{let Me=A.clone();const Ie=K/he;for(let Qe=0;Qe<he;Qe++){const je=he===1?(Se+Te)/2:di(Se,Te,Qe/(he-1)),Xe=ft(Math.cos(je),Math.sin(je),0),Ge=Fi(Xe,Fn),rt=lt=>{if(!f){const gt=di(X,le,Math.pow(lt,.8));return Dn(gt*1.02,gt*1.05,0)}const Lt=Es(0,1,lt);return Dn(di(y.w,le*1.02,Lt),di(y.h,le*1.05,Lt),di(y.yc*.5,0,Lt))},Ct=Qe===0?Dn(y.w*(f?1:.85),y.h*(f?1:.85),y.yc*.5):rt(Qe/he);j.push(ys(l,{name:`neck_${Qe}`,parent:Qe?j[Qe-1]:Ee[fe-1],part:"neck",length:Ie,position:Me.clone(),quaternion:Ge,start:Ct,end:rt((Qe+1)/he)})),Me.addScaledVector(Xe,Ie)}}const at=hf(l.bones[j[j.length-1]]),Pe=ys(l,{name:"head",parent:j[j.length-1],part:"head",length:S,position:at,quaternion:Fi(ft(Math.cos(Fe),Math.sin(Fe),0),Fn),start:Dn(E,v),end:Dn(E*.5,v*.5)});c==="limbless"&&Ll(l,[...j,Pe]);const k=[],Ce=t.trunk==="trunk"?s?.trunkLength??t.trunkLength*ky*S:0;if(Ce>0){const Me=l.bones[Pe],Ie=6,Qe=Ce/Ie,je=sp(_,{headLength:S,craniumWidth:E,craniumHeight:v,snoutLength:R}),Xe=Fy*Math.min(je.w,je.h),Ge=Bo(Me,[je.x,je.y,0]),rt=gt=>By(Xe,gt/Ie),lt=Vy(Ie,Fe,gt=>{const Ft=Ge.clone();for(let $t=0;$t<Ie;$t++){Ft.addScaledVector(ft(Math.cos(gt[$t]),Math.sin(gt[$t]),0),Qe);const Gt=Math.max(rt($t),rt($t+1),$t+1<Ie?rt($t+1):hu*rt(Ie))*1.05;if(Ft.y<Gt)return!1}return!0});let Lt=Ge;for(let gt=0;gt<Ie;gt++){const Ft=ft(Math.cos(lt[gt]),Math.sin(lt[gt]),0),$t=rt(gt),Gt=rt(gt+1);k.push(ys(l,{name:`trunk_${gt}`,parent:gt?k[gt-1]:Pe,part:"trunk",length:Qe,position:Lt.clone(),quaternion:Fi(Ft,ft(-Ft.y,Ft.x,0)),start:Dn($t,$t),end:Dn(Gt,Gt)})),Lt=Lt.clone().addScaledVector(Ft,Qe)}Ll(l,k)}const ve=[],Ae=o.allometry.limbRobust*o.limbRadius,He=p?(t.legs==="arthropod"?.05*w:qn(.42*Math.min(d,h),.055*w,.16*w)*(t.legs==="pillar"?1.3:1))*Ae:0;let Le=!1;const pt=(Me,Ie,Qe,je,Xe,Ge,rt)=>{const Ct=Bo(l.bones[Qe],je),lt=Ge&&c!=="many-legged";let Lt=te(Xe,lt);for(let $=0;$<8;$++){const Ue=B(Xe,lt),qe=Ue[0]+Ue[1],tt=Ue[2]??0,Ke=m||lt?0:G,ct=tt*Math.sin(Ke),We=Ct.y-(Y(Xe)+tt*Math.cos(Ke)),ut=.95*qe;m&&(Lt={...Lt,lateral:Math.min(Lt.lateral,Math.sqrt(Math.max(0,ut*ut-We*We-ct*ct)))});const Pt=s?s.stanceWidth*.5-Math.abs(Ct.z):m?Lt.lateral:0;if(Math.hypot(We,ct,Pt)<=ut*1.0001)break;Xe*=Math.min(1.5,Math.hypot(We,ct)/ut*1.01),Lt=te(Xe,lt),Le=!0}const gt=B(Xe,lt),Ft=Y(Xe),$t=N(Xe),Gt=He*(Ge&&c==="quadruped"?.92:1),Kn=gt.length===3?[Gt,Gt*.6,Gt*.36,Gt*.3]:t.legs==="arthropod"?[Gt,Gt*.8,Gt*.5]:t.legs==="pillar"?[Gt,Gt*.86,Gt*.8]:[Gt,Gt*.66,Gt*.5];s&&(Kn[gt.length]=s.footWidth/(2*1.24));const es=$=>Kn[$],yr=Gt*uf(t,"leg"),Sr=ft(Ct.x,0,s?Ie*s.stanceWidth*.5:m?Ct.z+Ie*Lt.lateral:Ct.z),Os=m?ft(0,1,.35*Ie):ft(lt?-1:1,0,0),Er=m||lt?0:G,L={index:ve.length,kind:"leg",side:Ie,pair:Me,front:Ge,socketBone:Qe,socket:je,bones:[],segments:gt,pole:Is(Os),metaTilt:Er,footHeight:Ft,footLength:$t,footExtent:[.45*$t+1.6*es(gt.length)+.3*Ft,1.4*$t+1.6*es(gt.length)+1.6*Ft],rest:Is(Sr),phase:rt},Q=dp(L,Ct,Sr,new dn),pe=gt.length===3?["upper","lower","meta"]:["upper","lower"];let ce=Qe;for(let $=0;$<gt.length;$++){const Ue=ys(l,{name:`leg_${Me}_${Ie<0?"L":"R"}_${pe[$]}`,parent:ce,part:"leg",side:Ie,limb:L.index,length:gt[$],driver:"ik",position:Q.points[$],quaternion:Q.frames[$],start:$?Dn(Kn[$],Kn[$]):Dn(yr,yr),end:Dn(Kn[$+1],Kn[$+1])});L.bones.push(Ue),ce=Ue}L.bones.push(ys(l,{name:`leg_${Me}_${Ie<0?"L":"R"}_foot`,parent:ce,part:"foot",side:Ie,limb:L.index,length:$t,driver:"ik",position:Q.points[gt.length],quaternion:Q.frames[gt.length],start:Dn(Kn[gt.length],Ft)})),ve.push(L)},mt=Ky(t,w,Z,F,m,u,o);if(i&&(mt.stride=mt.duty*i.motion.strideLength,mt.speed=i.motion.walkSpeed,mt.period=i.motion.strideLength/mt.speed),c==="biped")for(const Me of[-1,1])pt(0,Me,Ee[0],P(Me),w,!1,Me<0?0:.5);else if(c==="quadruped"||c==="sprawled"){const Me=Bo(se,ie(1));if(Re=c==="quadruped"?qn(Me.y/q,w*.5,w*2):w,s&&c==="quadruped"){let je=0,Xe=Math.max(.001,w);for(let Ge=0;Ge<24&&te(Xe,!0).height<Me.y;Ge++)Xe*=2;if(te(Xe,!0).height<Me.y)throw new Error("Resolved shoulder cannot reach ground within the bounded leg fitter");for(let Ge=0;Ge<40;Ge++){const rt=(je+Xe)/2;te(rt,!0).height<Me.y?je=rt:Xe=rt}Re=(je+Xe)/2}c==="quadruped"&&Math.abs(Re-w)>.03*w&&r.push({part:"Front legs",chosen:t.legLength.toFixed(2),effect:`${Re>w?"Lengthened":"Shortened"} to ${(Re/u).toFixed(2)} body lengths so both pairs reach the ground with this shoulder height.`});const Ie=_==="flat-face"&&(t.arms==="grasping"||t.feet==="hand")&&t.horns==="none"&&t.wings==="none",Qe=c==="quadruped"?{hind:[0,.5],fore:Ie?[.25,.75]:[.75,.25]}:{hind:[.5,0],fore:[0,.5]};for(const je of[-1,1])pt(0,je,Ee[0],P(je),w,!1,Qe.hind[je<0?0:1]);for(const je of[-1,1])pt(1,je,Ee[fe-1],ie(je),Re,!0,Qe.fore[je<0?0:1])}else if(c==="many-legged"){const Me=.62/Math.max(3,t.legPairs);for(let Ie=0;Ie<fe;Ie++)for(const Qe of[-1,1])pt(Ie,Qe,Ee[Ie],_e(Ie,Qe),w,Ie>=fe/2,((Ie*Me+(Qe>0?.5:0))%1+1)%1)}const Rt=t.arms==="none"?0:t.armLength*u*(t.arms==="small"?.55:1)*(f?.45:1),ke=Rt?qn(.3*Math.min(d,h),.045*Rt,.11*Rt)*(t.arms==="small"?.8:1)*Ae:0;if(Rt>0){const Me=l.bones[Ee[fe-1]],Ie=U((fe-1+.62)/fe),Qe=je=>[Me.length*.62,(c==="biped"?.08:-.05)*Ie.h+Ie.yc,je*.9*Ie.w];for(const je of[-1,1]){const Xe=[Rt*.45,Rt*.4,Rt*.09,Rt*.08],Ge=Bo(Me,Qe(je)),rt={index:ve.length,kind:"arm",side:je,pair:0,front:!0,socketBone:Me.index,socket:Qe(je),bones:[],segments:Xe,pole:[-1,-.2,.3*je],metaTilt:0,footHeight:0,footLength:0,footExtent:[0,0],rest:[0,0,0],phase:je<0?.5:0};rt.rest=Is(e2(t,rt,Ge));const Ct=Uh(rt,Ge,xn(rt.rest),new dn,0,.25),lt=["upper","fore","hand","finger"],Lt=[ke*uf(t,"arm"),ke*.7,ke*.62,ke*.4,ke*.3];let gt=Me.index;for(let Ft=0;Ft<4;Ft++){const $t=ys(l,{name:`arm_${je<0?"L":"R"}_${lt[Ft]}`,parent:gt,part:Ft<2?"arm":Ft===2?"hand":"finger",side:je,limb:rt.index,length:Xe[Ft],driver:"ik",position:Ct.points[Ft],quaternion:Ct.frames[Ft],start:Dn(Lt[Ft],Lt[Ft]),end:Dn(Lt[Ft+1],Lt[Ft+1])});rt.bones.push($t),gt=$t}ve.push(rt)}}const Ye=t.wings==="none"?0:s?s.wingSpan/2:Math.min(t.wingSpan,y0(t))*u*(f?.45:.5);if(Ye>0){const Me=c==="many-legged"||c==="limbless"?Ee[Math.max(0,Math.floor(fe*.7))]:Ee[fe-1],Ie=l.bones[Me],Qe=c==="many-legged"||c==="limbless"?U(.75):y,je=t.armor==="dome",Xe=rt=>[Ie.length*(c==="biped"?.62:.4),je?.25*Qe.h+Qe.yc:.7*Qe.h+Qe.yc,rt*(je?1.05:.6)*Qe.w],Ge=[.28,.34,.38].map(rt=>rt*Ye);for(const rt of[-1,1]){const Ct={index:ve.length,kind:"wing",side:rt,pair:0,front:!0,socketBone:Me,socket:Xe(rt),bones:[],segments:Ge,pole:[0,1,0],metaTilt:0,footHeight:0,footLength:0,footExtent:[0,0],rest:[0,0,0],phase:0};let lt=Bo(Ie,Xe(rt)),Lt=Me;const gt=[ft(-.18,.22,rt),ft(-.2,.04,rt),ft(-.42,-.04,rt)],Ft=Math.max(.012*Ye,Math.min(d,h)*.16);["humerus","forearm","hand"].forEach(($t,Gt)=>{const Kn=gt[Gt].normalize(),es=ys(l,{name:`wing_${rt<0?"L":"R"}_${$t}`,parent:Lt,part:"wing",side:rt,limb:Ct.index,length:Ge[Gt],position:lt.clone(),quaternion:Fi(Kn,Fn),start:Dn(Ft*(1-Gt*.28),Ft*(1-Gt*.28)),end:Dn(Ft*(.72-Gt*.24),Ft*(.72-Gt*.24))});Ct.bones.push(es),Lt=es,lt.addScaledVector(Kn,Ge[Gt])}),ve.push(Ct)}}if(Le&&r.push({part:"Leg length",chosen:t.legLength.toFixed(2),effect:"Some legs were lengthened so their feet reach the ground from this body height."}),l.bones.length>lf.maxBones)throw new Error(`Composer graph uses ${l.bones.length} bones; budget is ${lf.maxBones}.`);const xt={version:Hy,recipe:t,constraints:r,bones:l.bones,limbs:ve,...i?{phenotype:i}:{},chains:{torso:Ee,tail:O,neck:j,head:Pe,trunk:k},dims:{bodyLength:u,torsoWidth:d,torsoHeight:h,legReach:w,frontLegReach:Re,socketHeight:Z,headLength:S,craniumWidth:E,craniumHeight:v,snoutLength:R,neckLength:K,tailLength:ae,trunkLength:Ce,wingSemiSpan:Ye,armLength:Rt,legRadius:He,armRadius:ke,torsoPitch:ee},locomotion:mt,traits:o};if(p&&$y(xt),i&&xt.locomotion.stride>0&&(xt.locomotion.speed=i.motion.walkSpeed,xt.locomotion.period=xt.locomotion.stride/(xt.locomotion.duty*xt.locomotion.speed)),i){const Me=i.dimensions,Ie=xt.locomotion,Qe=[],je=(Xe,Ge,rt,Ct,lt)=>Qe.push({field:Xe,requested:Ge,built:rt,units:Ct,reason:lt});je("legReach",Me.legReach,w,"m","Minimum articulated reach for the unchanged torso belly clearance."),je("frontLegReach",Me.legReach,Re,"m","Forelimb reach fitted to the built shoulder height.");for(const Xe of ve.filter(Ge=>Ge.kind==="leg")){const Ge=Xe.segments.reduce((Ct,lt)=>Ct+lt,0),rt=Xe.segments[0]+Xe.segments[1];je(`limb.${Xe.index}.reach`,Me.legReach,Ge,"m","Actual segment sum after socket and lateral stance fitting."),je(`limb.${Xe.index}.upperLegFraction`,Me.upperLegFraction,Xe.segments[0]/rt,"ratio","Upper share of upper/lower pair, excluding any metapodial segment."),je(`limb.${Xe.index}.footLength`,Me.footLength,Xe.footLength,"m","Nominal foot profile length; surface extent is separately measured.")}je("cycleLength",i.motion.strideLength,Ie.stride/Ie.duty,"m","Full gait cycle; fitted stance sweep divided by duty."),je("stanceSweep",i.motion.strideLength*Ie.duty,Ie.stride,"m","Composer stride is the stance sweep, duty times full cycle length."),je("period",i.motion.strideLength/i.motion.walkSpeed,Ie.period,"s","Fitted full gait cycle divided by retained walking speed."),je("walkSpeed",i.motion.walkSpeed,Ie.speed,"m/s","Source walking speed, or zero for an immobile fitted gait."),xt.phenotypeFit={version:"composer-phenotype-fit-1",entries:Qe,deviations:Qe.filter(Xe=>Math.abs(Xe.built-Xe.requested)>1e-9*Math.max(1,Math.abs(Xe.requested))),derived:{snoutToHeadRatio:R/S,craniumHeightToWidthRatio:v/Me.headWidth,footHeightToWidthRatio:.42,neckBones:he}}}return xt}function $y(n){const e=n.locomotion,t=96,i=e.stride,s=n.limbs.filter(a=>a.kind==="leg"),r=n.traits.motion.phase,o=()=>{let a=0;const l=[];for(let c=0;c<t;c++)l.push((c+.37)/t*e.period);for(const c of s)for(const u of[1e-9,e.duty*(1-1e-9)])l.push(((u-c.phase-r)%1+1)%1*e.period);for(const c of l)for(const u of df(n,"walk",c).contacts)u.stance&&(a=Math.max(a,u.extension));for(const c of df(n,"neutral",0).contacts)a=Math.max(a,c.extension);return a};for(let a=0;a<24&&o()>Ih;a++)e.stride*=.85,e.bob*=.8,e.sway*=.75,e.speed=e.stride/(e.duty*e.period);o()>Ih?(e.stride=0,e.speed=0,n.constraints.push({part:"Walking",chosen:n.recipe.layout,effect:"These legs cannot step without overextending; the walk marks time in place."})):e.stride<i*.6&&n.constraints.push({part:"Walking",chosen:n.recipe.legs,effect:`Stride shortened to ${(e.stride/Math.max(1e-9,i)*100).toFixed(0)}% so planted feet stay within reach.`})}function Ky(n,e,t,i,s,r,o){const a=o.motion;if(n.layout==="limbless"){const M=n.torso==="annulated",_=qn(1.4*Math.sqrt(r),1.1,3.2)*a.periodScale;return{gait:M?"peristaltic-crawl":"serpentine-crawl",period:_,duty:1,stride:0,speed:(M?.08:.3)*r/_,lift:0,bob:0,sway:0}}const l=qn(1.25*Math.sqrt(Math.max(.01,t)),.6,2.2)*a.periodScale,c=(n.layout==="biped"?.6:n.layout==="quadruped"?.66:n.layout==="sprawled"?.7:.62)+a.dutyDelta,u=(i.seg[0]+i.seg[1])*e,f=s?.8*u:i.ext*u,p=Math.sqrt(Math.max(0,(Ih*u)**2-f*f)),m=Math.min(2*p*.92,.75*e*(n.layout==="many-legged"?.6:1)),g=Math.min(.12*e,.5*(u-f)+.06*e)*a.liftScale,x=n.layout==="biped"?"biped-walk":n.layout==="quadruped"?"quadruped-walk":n.layout==="sprawled"?"sprawling-walk":"metachronal-wave",d=(n.layout==="biped"?.018:n.layout==="quadruped"?.008:0)*t,h=n.layout==="sprawled"?n.armor==="dome"?.03:.12:n.layout==="many-legged"?.05:0;return{gait:x,period:l,duty:c,stride:m,speed:m/(c*l),lift:g,bob:d,sway:h}}function Ll(n,e,t=[],i=0){const s=o=>o.h-o.yc;for(let o=0;o<e.length;o++){const a=n.bones[e[o]],l=ti(a.restQuaternion),c=xn(a.restPosition),u=n.bones[e[o+1]],f=!u&&a.part==="trunk"?hu*a.end.h:0,p=ft(1,0,0).applyQuaternion(l),m=Math.max(s(a.start),s(a.end),u?s(u.start):0,f)*1.05;let g=c.clone().addScaledVector(p,a.length);if(g.y<m){const x=hp(p,c.y,a.length,m),d=new dn().setFromUnitVectors(p,x);for(let h=o;h<e.length;h++){const M=n.bones[e[h]],_=xn(M.restPosition).sub(c).applyQuaternion(d).add(c);M.restPosition=Is(_),M.restQuaternion=Qo(d.clone().multiply(ti(M.restQuaternion)).normalize())}g=c.clone().addScaledVector(x,a.length)}}const r=n.bones[e[e.length-1]];r&&t.length&&(r.restQuaternion=Qo(lu(xn(r.restPosition),ti(r.restQuaternion),r.length,t,i)));for(const o of e){const a=n.bones[o],l=n.bones[a.parent],c=ti(l.restQuaternion).invert();a.offset=Is(xn(a.restPosition).sub(xn(l.restPosition)).applyQuaternion(c)),a.restLocal=Qo(c.multiply(ti(a.restQuaternion)).normalize())}}function Sc(n,e,t){const i=t.end.h;if(n.tail==="tufted")return[[i*2,0,Math.max(t.length*.9,i*4),i*2.6,i*2.6]];if(n.tail==="club"){const s=Math.max(i*2.4,e*.05);return[[s*.6,0,s*1.1,s*.8,s*1.3],[s*.6,-s*1.2,s*.55,s*.45,s*.5],[s*.6,s*1.2,s*.55,s*.45,s*.5]]}if(n.tail==="feather-fan"){const s=ap(n,e);return[[s*.5,0,s*.53,s*.06,s*.7]]}return[]}const ap=(n,e)=>Math.max(n.tailLength*e*.8,.12*e);function Pl(n,e,t,i){const s=ft(1,0,0).applyQuaternion(e),r=ft(0,1,0).applyQuaternion(e),o=ft(0,0,1).applyQuaternion(e);return i.reduce((a,[l,c,u,f,p])=>Math.min(a,n.y+s.y*(t+l)+o.y*c-Math.hypot(u*s.y,f*r.y,p*o.y)),1/0)}function lu(n,e,t,i,s){if(!i.length||Pl(n,e,t,i)>=s)return e;const r=ft(1,0,0).applyQuaternion(e),o=ft().crossVectors(r,Fn);if(o.lengthSq()<1e-12)return e;o.normalize();const a=u=>Qi(o,u).multiply(e).normalize();let l=0,c=r.angleTo(Fn);if(Pl(n,a(c),t,i)<s)return a(c);for(let u=0;u<40;u++){const f=(l+c)/2;Pl(n,a(f),t,i)>=s?c=f:l=f}return a(c)}function uf(n,e){return e==="arm"?1.4:n.legs==="arthropod"?1:n.legs==="pillar"?1.15:1.45}const hu=1.2,Zy=[.45,.5,.45];function Qy(n,e){const t=e.side,i=ft(-1,-.18,.1*t).normalize(),s=ft(0,-1,.45*t);s.addScaledVector(i,-s.dot(i)).normalize();const r=s.multiplyScalar(t),o=ft().crossVectors(r,i),a=new dn().setFromRotationMatrix(new Ht().makeBasis(i,o,r));return ti(n.bones[e.bones[0]].restLocal).invert().multiply(a)}function cp(n,e,t){let i=n?e*(.36+.14*Math.sin(Math.PI*Math.min(1,t*1.15)))*(1-.8*Es(.8,1,t)):e*.58*Math.pow(1-t,.9)*(.78+.22*Math.abs(Math.cos(Math.PI*3*t)));return n&&(i*=1-.08*Math.abs(Math.sin(Math.PI*9*t))),Math.max(i,e*.03)}const lp=(n,e)=>e*(n?.018:.008);function Jy(n,e,t,i,s){const r=e.bones.map(h=>n.bones[h]),o=r.reduce((h,M)=>h+M.length,0),a=n.recipe.wings==="feathered",l=lp(a,o),c=t[r[0].index].p.clone(),u=h=>{const M=[];let _=0;for(const b of r){const{p:S,q:v}=t[b.index],E=ft(1,0,0).applyQuaternion(v),R=ft(0,1,0).applyQuaternion(v),w=ft(0,0,1).applyQuaternion(v),T=Math.max(b.start.h,b.end.h);for(let C=0;C<=4;C++){const I=b.length*C/4,F=cp(a,o,(_+I)/o)*i[b.index],V=S.clone().addScaledVector(E,I),W=Math.abs(R.y),D=V.clone().addScaledVector(w,e.side*F);M.push(V.addScaledVector(Fn,-Math.hypot(T*W,T*Math.abs(w.y))),D.addScaledVector(Fn,-(l+.06*F)*W))}_+=b.length}return M.map(b=>b.sub(c).applyQuaternion(h).add(c))},f=h=>u(h).reduce((M,_)=>_.y<M.y?_:M);if(f(new dn).y>=s)return;const p=ft(1,0,0).applyQuaternion(t[e.socketBone].q).setY(0);if(p.lengthSq()<1e-12)return;const m=p.normalize().multiplyScalar(-e.side);let g=0,x=Math.PI*.75;for(let h=0;h<40;h++){const M=(g+x)/2;f(Qi(m,M)).y>=s?x=M:g=M}const d=Qi(m,x);for(const h of r){const M=t[h.index];M.p.sub(c).applyQuaternion(d).add(c),M.q.premultiply(d).normalize()}}function hp(n,e,t,i){const s=qn((i-e)/t,-1,1),r=ft(n.x,0,n.z),o=r.length(),a=Math.sqrt(Math.max(0,1-s*s));return o>1e-9?r.multiplyScalar(a/o).setY(s):ft(0,s>=0?1:-1,0)}function up(n,e,t,i,s){const r=i?xn(i).normalize():Fn.clone(),o=s?xn(s):ft(1,0,0).applyQuaternion(t);i?o.addScaledVector(r,-o.dot(r)):o.y=0,o.normalize();const a=e.clone().addScaledVector(r,n.footHeight),l=n.segments;let c=a;return l.length===3&&(c=a.clone().addScaledVector(r,l[2]*Math.cos(n.metaTilt)).addScaledVector(o,-l[2]*Math.sin(n.metaTilt))),{up:r,fwd:o,ankle:a,hock:c}}function dp(n,e,t,i,s=0,r,o){const{up:a,fwd:l,ankle:c,hock:u}=up(n,t,i,r,o),f=n.segments,p=xn(n.pole).applyQuaternion(i),{joint:m,end:g,reachError:x}=op(e,u,f[0],f[1],p),d=[e.clone(),m,g];f.length===3&&d.push(g.clone().add(c.clone().sub(u)));const h=ft().crossVectors(d[d.length-1].clone().sub(e),p);h.lengthSq()<1e-12&&h.set(0,0,1),h.normalize();const M=[];for(let S=0;S<f.length;S++){const v=d[S+1].clone().sub(d[S]);M.push(Fi(v,ft().crossVectors(h,v).normalize()))}let _=l.clone();n.side&&Math.abs(n.pole[2])>.1&&_.applyAxisAngle(Fn,-n.side*.35);const b=Fi(_,a);return s&&b.multiply(Qi(la,s)),M.push(b),d.push(d[d.length-1].clone()),{points:d.slice(0,f.length+1),frames:M,reachError:x,extension:e.distanceTo(u)/(f[0]+f[1])}}const Dl=Object.freeze([-.2,-.35,.75]),Il=Object.freeze([-.2,.9,.5]);function e2(n,e,t){const i=e.segments[0]+e.segments[1];let s;n.layout==="biped"&&n.arms==="grasping"?s=t.clone().add(ft(.12*i,-.86*i,e.side*.12*i)):n.layout==="limbless"||n.layout==="many-legged"?s=t.clone().add(ft(Dl[0]*i,Dl[1]*i,e.side*Dl[2]*i)):s=t.clone().add(ft(.5*i,-.42*i,e.side*.1*i));const r=e.segments[2]+e.segments[3]+.02*i;return s.y<r&&(s.y=r),s}const t2=2.4;function n2(n,e,t){const[,,i,s]=e.bones.map(l=>n.bones[l]),r=1.5*Math.max(i.start.h,i.end.h,s.start.h),o=ft(1,0,0).applyQuaternion(t.frames[3]),a=t.points[3].clone().addScaledVector(o,s.length*t2);return Math.min(t.points[2].y,t.points[3].y,a.y)-r}function Uh(n,e,t,i,s,r,o=0){const a=n.segments,l=xn(n.pole).applyQuaternion(i).addScaledVector(Fn,o),c=t.clone().sub(e),u=(a[0]+a[1])*.985,f=c.length()>u?e.clone().addScaledVector(c.normalize(),u):t.clone(),{joint:p,end:m,reachError:g}=op(e,f,a[0],a[1],l),x=ft().crossVectors(m.clone().sub(e),l);x.lengthSq()<1e-12&&x.set(0,0,1),x.normalize();const d=[],h=[e.clone(),p,m];for(let v=0;v<2;v++){const E=h[v+1].clone().sub(h[v]);d.push(Fi(E,ft().crossVectors(x,E).normalize()))}const M=d[1].clone().multiply(Qi(la,-s)),_=ft(1,0,0).applyQuaternion(M),b=m.clone().addScaledVector(_,a[2]),S=M.clone().multiply(Qi(la,-r));return{points:[e,p,m,b],frames:[d[0],d[1],M,S],reachError:g}}const yt=Math.PI*2;function df(n,e,t,i={}){if(i.trunkMotion!==void 0&&i.trunkMotion!=="legacy"&&i.trunkMotion!=="wave-1")throw new Error("Unknown Composer trunk motion");const s=i.environment;if(s){for(const U of["cycle","clock","stride","speed","cycleLength","walkWeight","idleWeight","rootHeight"])if(s[U]!==void 0&&!Number.isFinite(s[U]))throw new Error(`Invalid Composer environment ${U}`);if(s.clock!==void 0&&(s.clock<0||s.clock>1e6))throw new Error("Composer runtime clock must be bounded to one million seconds");if((s.stride??0)<0||(s.speed??0)<0)throw new Error("Composer path stride/speed must be nonnegative");if((s.cycleLength??0)<0||[s.walkWeight,s.idleWeight].some(U=>U!==void 0&&(U<0||U>1)))throw new Error("Invalid Composer motion blend/cycle length");if(s.contact&&!s.ground)throw new Error("Composer terrain contacts require a ground diagnostic sampler");if(s.supportHeight!==void 0&&s.supportHeight!=="reachable-1")throw new Error("Invalid Composer support-height policy");if(s.rootRotation&&(!s.rootRotation.every(Number.isFinite)||Math.abs(Math.hypot(...s.rootRotation)-1)>1e-6))throw new Error("Invalid Composer environment rotation")}const r=s?.clock??qn(Number.isFinite(t)?t:0,0,120),o=n.bones.length,a=n.recipe,l=n.locomotion,c=new Float64Array(o*3),u=new Float64Array(o*4),f=new Float64Array(o).fill(1),p=new Float64Array(o).fill(1),m=new Array(o),g=new Array(o),x=n.traits.motion,d=s?.cycle??r/l.period+x.phase,h=s?.stride??l.stride,M=s?.speed??l.speed,_=s?.walkWeight??(e==="walk"?1:0),b=s?.idleWeight??(e==="idle"?1:0),S=e==="walk"||_>0,v=e==="idle"||b>0,E=e==="display",R=(U,ee)=>{g[U]=g[U]?g[U].multiply(ee):ee},w=U=>Qi(la,U),T=U=>Qi(Xy,U),C=U=>Qi(Wy,U),{torso:I,tail:F,neck:V,head:W,trunk:D}=n.chains,B=a.layout==="limbless";let G=0;const Y=n.bones[I[0]],N=xn(Y.offset),te=ti(Y.restLocal);if(S&&!B){G=s?0:l.speed*r;const U=Math.cos(yt*d*2);a.layout==="biped"?(N.y+=-l.bob*U*_,te.multiply(C(.035*Math.sin(yt*d)*_)).multiply(T(.04*Math.sin(yt*d)*_))):a.layout==="quadruped"&&(N.y+=-l.bob*U*_,te.multiply(C(.015*Math.sin(yt*d)*_))),l.sway&&I.forEach((P,ie)=>{ie&&R(P,T(l.sway*Math.sin(yt*d-ie*.9)*_))});const ee=a.head==="beak"&&a.layout==="biped"?.16:.05;V.forEach((P,ie)=>R(P,w((ie%2?-1:1)*ee*Math.sin(yt*d*2)/Math.max(1,V.length*.6)*_))),R(W,w(-.5*ee*Math.sin(yt*d*2)*_)),F.forEach((P,ie)=>R(P,T(.07*Math.sin(yt*d-.7*(ie+1))*_)))}if(v||E){const U=3.4*qn(Math.pow(n.dims.bodyLength,.25),.6,1.8),ee=1+.012*Math.sin(yt*(r/U+x.breathPhase))*(E?1:b);for(const Z of I)f[Z]=ee;const P=x.lookPhase,ie=v?.22*Math.sin(yt*(r/7.3+P))*b:.12*Math.sin(yt*(r/4.1+P)),_e=v?.07*Math.sin(yt*(r/5.2+P))*b:-.12-.05*Math.sin(yt*(r/2.7+P)),xe=Math.max(1,V.length);V.forEach(Z=>{const Re=Fn.clone().applyQuaternion(ti(n.bones[Z].restQuaternion).invert());R(Z,Qi(Re,ie/xe).multiply(w((E?.1:0)+_e/xe)))}),R(W,w(E?.18:_e*.5)),F.forEach((Z,Re)=>R(Z,T((v?.1*b:.16)*Math.sin(yt*(r/(v?3.1:1.9)+P)-.6*Re)).multiply(w(E&&Re<3?.12:0))))}const q=()=>I.reduce((U,ee)=>Math.min(U,m[ee].p.y-n.bones[ee].start.h),1/0);if(D.length&&e!=="neutral"){const U=x.lookPhase;if(i.trunkMotion==="wave-1"){const ee=[.08,.45,.85,1.25,1.6,1.85],P=[.12,.35,.55,.65,.65,.65];D.forEach((ie,_e)=>{const xe=.45*_e,Z=_e?1.45:1,oe=E?.38+.12*Math.sin(yt*(r/2.4+U)-xe):(_e&&!E?.035:0)+Z*(s?_*.05*Math.sin(yt*d-xe)+b*.08*Math.sin(yt*(r/4.6+U)-xe):S?.05*Math.sin(yt*d-xe):.08*Math.sin(yt*(r/4.6+U)-xe)),Ee=Z*(s?_*.12*Math.sin(yt*d+1-xe)+b*.1*Math.sin(yt*(r/3.3+U)-xe):S?.12*Math.sin(yt*d+1-xe):.1*Math.sin(yt*(r/3.3+U)-xe));R(ie,w(oe*ee[_e]).multiply(T(Ee*P[_e])))})}else{const ee=E?.38+.12*Math.sin(yt*(r/2.4+U)):s?_*.05*Math.sin(yt*d)+b*.08*Math.sin(yt*(r/4.6+U)):S?.05*Math.sin(yt*d):.08*Math.sin(yt*(r/4.6+U)),P=s?_*.12*Math.sin(yt*d+1)+b*.1*Math.sin(yt*(r/3.3+U)):S?.12*Math.sin(yt*d+1):.1*Math.sin(yt*(r/3.3+U));D.forEach((ie,_e)=>R(ie,w(ee*(.4+_e*.25)).multiply(T(P*(_e?.4:1)))))}}const fe=n.limbs.filter(U=>U.kind==="wing");for(const U of fe){const ee=e==="neutral"?0:E?.1+.1*Math.sin(yt*r/3):1,P=E?.38*Math.sin(yt*r/1.6):S?.04*Math.sin(yt*d*2):0,[ie,_e,xe]=U.bones;R(ie,new dn().slerpQuaternions(new dn,Qy(n,U),ee).multiply(w(P))),R(_e,w(-(Math.PI-.22)*ee)),R(xe,w((Math.PI-.3)*ee+(E?.4*P:0))),U.bones.forEach((Z,Re)=>{p[Z]=1-Zy[Re]*ee})}if(s){if(s.rootRotation){const U=ti(s.rootRotation);N.applyQuaternion(U),te.premultiply(U)}N.y+=s.rootHeight??0}const re=U=>{const ee=n.bones[U];let P,ie;if(ee.parent<0)P=N.clone(),ie=te.clone();else{const _e=m[ee.parent];P=xn(ee.offset).applyQuaternion(_e.q).add(_e.p),ie=_e.q.clone().multiply(ti(ee.restLocal))}if(g[U]&&ie.multiply(g[U]),ie.normalize(),(ee.part==="tail"||ee.part==="trunk"||(ee.part==="neck"||ee.part==="head")&&B)&&e!=="neutral"){const _e=ze=>ze.h-ze.yc,xe=B&&ee.part==="neck"&&U===V[V.length-1],Z=ft(1,0,0).applyQuaternion(ie),Re=P.clone().addScaledVector(Z,ee.length),oe=ee.part==="trunk"&&U===D[D.length-1]?hu*ee.end.h:0,Ee=Math.max(_e(ee.start),_e(ee.end),xe?_e(n.bones[W].start):0,oe)*1.06+(s?.ground?.(Re.x,Re.z)??0);Re.y<Ee&&(ie=new dn().setFromUnitVectors(Z,hp(Z,P.y,ee.length,Ee)).multiply(ie).normalize()),U===F[F.length-1]&&(ie=lu(P,ie,ee.length,Sc(a,n.dims.bodyLength,ee),.004*n.dims.bodyLength))}m[U]={p:P,q:ie}};if(B&&e!=="neutral"){const U=V.length&&g[V[0]]?2*Math.acos(Math.min(1,Math.abs(g[V[0]].w))):0;G=i2(n,e,r,m,f,U);for(let ee=0;ee<o;ee++){const P=n.bones[ee].part;n.bones[ee].driver==="fk"&&P!=="torso"&&P!=="tail"&&re(ee)}}else for(let U=0;U<o;U++)n.bones[U].driver==="fk"&&re(U);const ne=[];let K=0;const he=new dn,ae=[];for(const U of n.limbs){if(U.kind!=="leg")continue;const ee=xn(U.rest);let P=!0,ie=0;const _e=((d+U.phase)%1+1)%1,xe=ee.clone();if(S)if(_e<l.duty){const oe=_e/l.duty;xe.x=ee.x+h*(.5-oe)}else{const oe=(_e-l.duty)/(1-l.duty),Ee=oe*oe*oe,ze=s?.cycleLength!==void 0?(1-l.duty)*s.cycleLength:M*(1-l.duty)*l.period,Ve=Ee*(10+oe*(6*oe-15));xe.x=ee.x-h*.5+(h+ze)*Ve-ze*oe,xe.y=l.lift*16*oe*oe*(1-oe)*(1-oe),P=!1,ie=a.feet==="spike"?0:-.35*Math.sin(yt*oe)*Math.sin(Math.PI*oe)*(oe<.5?1:.4);const it=ie<0?U.footExtent[1]:U.footExtent[0];ie=Math.sign(ie)*Math.min(Math.abs(ie),Math.asin(Math.min(1,xe.y/Math.max(1e-9,it))))}let Z,Re;if(s?.contact){const oe=s.contact(U,_e,P,Is(xe));if(!oe.position.every(Number.isFinite)||oe.normal&&(!oe.normal.every(Number.isFinite)||Math.hypot(...oe.normal)<1e-6))throw new Error("Invalid Composer terrain contact");if(xe.fromArray(oe.position),Z=oe.normal,oe.forward&&(!oe.forward.every(Number.isFinite)||Math.hypot(...oe.forward)<1e-6))throw new Error("Invalid Composer foot heading");if(Re=oe.forward,oe.pitch!==void 0){if(!Number.isFinite(oe.pitch))throw new Error("Invalid Composer foot pitch");ie=oe.pitch}oe.stance!==void 0&&(P=oe.stance)}else s?.ground&&(xe.y+=s.ground(xe.x,xe.z));ae.push({limb:U,contact:xe,stance:P,footPitch:ie,groundNormal:Z,groundForward:Re})}let ge;if(s?.supportHeight==="reachable-1"&&ae.length){let U=[[-1/0,1/0]];for(const P of ae){const{limb:ie,contact:_e,groundNormal:xe,groundForward:Z}=P,Re=m[ie.socketBone],oe=xn(ie.socket).applyQuaternion(Re.q).add(Re.p),{hock:Ee}=up(ie,_e,he,xe,Z),ze=(oe.x-Ee.x)**2+(oe.z-Ee.z)**2,Ve=Ee.y-oe.y,it=(ie.segments[0]+ie.segments[1]-1e-6)**2-ze,se=(Math.abs(ie.segments[0]-ie.segments[1])+1e-6)**2-ze,A=Math.sqrt(Math.max(0,it)),y=Math.sqrt(Math.max(0,se)),O=it<0?[]:se>0?[[Ve-A,Ve-y],[Ve+y,Ve+A]]:[[Ve-A,Ve+A]];U=U.flatMap(([j,le])=>O.map(([X,Se])=>[Math.max(j,X),Math.min(le,Se)]).filter(([X,Se])=>X<=Se))}let ee=0;if(U.length&&(ee=U.map(([P,ie])=>qn(0,P,ie)).reduce((P,ie)=>Math.abs(ie)<Math.abs(P)?ie:P,1/0)),ge={version:"composer-support-height-1",requested:s.rootHeight??0,applied:(s.rootHeight??0)+ee,delta:ee,feasible:U.length>0,intervals:U},ee){N.y+=ee;for(let P=0;P<o;P++)n.bones[P].driver==="fk"&&re(P)}}for(const U of fe)Jy(n,U,m,p,.004*n.dims.bodyLength);for(const{limb:U,contact:ee,stance:P,footPitch:ie,groundNormal:_e,groundForward:xe}of ae){const Z=m[U.socketBone],Re=xn(U.socket).applyQuaternion(Z.q).add(Z.p),oe=dp(U,Re,ee,he,ie,_e,xe);K=Math.max(K,oe.reachError),U.bones.forEach((Ve,it)=>{m[Ve]={p:oe.points[Math.min(it,oe.points.length-1)],q:oe.frames[it]}});const Ee=U.bones[U.bones.length-1];m[Ee].p=oe.points[oe.points.length-1].clone();const ze=m[Ee].p.clone().addScaledVector(_e?xn(_e).normalize():Fn,-U.footHeight);ne.push({limb:U.index,side:U.side,pair:U.pair,stance:P,contact:Is(ze),world:[ze.x+G,ze.y,ze.z],reachError:oe.reachError,extension:oe.extension??0})}for(const U of n.limbs){if(U.kind!=="arm")continue;const ee=m[U.socketBone],P=xn(U.socket).applyQuaternion(ee.q).add(ee.p),ie=n.bones[U.socketBone],xe=xn(U.rest).sub(xn(ie.restPosition)).applyQuaternion(ti(ie.restQuaternion).invert()).applyQuaternion(ee.q).add(ee.p),Z=U.segments[0]+U.segments[1];let Re=.25,oe=.15;if(S&&a.layout==="biped"){const y=a.arms==="small"?0:qn((a.posture-.4)/.2,0,1);y>0&&(xe.x+=y*.22*Z*Math.cos(yt*(d+U.phase)))}v&&(Re=.35+.25*Math.sin(yt*r/2.8+U.side)),E&&(xe.add(ft(Il[0]*Z,Il[1]*Z+.1*Z*Math.sin(yt*r/1.7+U.side),U.side*Il[2]*Z)),Re=.9+.5*Math.sin(yt*r/1.3),oe=-.3);const Ee=U.segments[2]+U.segments[3]+.02*Z;xe.y<Ee&&(xe.y=Ee);const ze=a.hands==="pincer"?Math.max(0,Re)*.6:Re,Ve=.004*n.dims.bodyLength,it=n.bones[U.bones[0]].end.h*1.3+Ve,se=()=>{let y=Uh(U,P,xe,he,oe,ze);for(const O of[.5,1,2,4,16]){if(y.points[1].y>=it)break;y=Uh(U,P,xe,he,oe,ze,O)}return y};let A=se();for(let y=0;y<3;y++){const O=Ve-n2(n,U,A);if(O<=0)break;xe.y+=O,A=se()}K=Math.max(K,A.reachError),U.bones.forEach((y,O)=>{m[y]={p:A.points[O],q:A.frames[O]}})}let H=0,de=1/0,J=0,me=1/0;for(let U=0;U<o;U++){const ee=m[U];c.set([ee.p.x,ee.p.y,ee.p.z],U*3),u.set([ee.q.x,ee.q.y,ee.q.z,ee.q.w],U*4)}for(const U of n.limbs)for(let ee=0;ee+1<U.bones.length&&ee<U.segments.length&&!(U.kind==="arm"&&ee>=2);ee++){const P=m[U.bones[ee]].p,ie=m[U.bones[ee+1]].p;H=Math.max(H,Math.abs(P.distanceTo(ie)-U.segments[ee]))}for(const U of ne){const ee=s?.ground?.(U.contact[0],U.contact[2])??0,P=U.contact[1]-ee;U.stance?J=Math.max(J,Math.max(0,-P),Math.abs(P)):me=Math.min(me,P)}return de=B?Math.min(...I.map(U=>m[U].p.y-n.bones[U].start.h*f[U]+n.bones[U].start.yc)):q(),{motion:e,time:r,positions:c,quaternions:u,radialScale:f,chordScale:p,travel:G,contacts:ne,diagnostics:{maxBoneLengthError:H,maxReachError:K,maxStancePenetration:J,minSwingClearance:Number.isFinite(me)?me:0,minBodyClearance:de,jointCount:o,...ge?{supportHeight:ge}:{}}}}function i2(n,e,t,i,s,r=0){const o=n.locomotion,{torso:a,tail:l}=n.chains,c=o.gait==="peristaltic-crawl",u=n.dims.bodyLength,f=(c?.9:.62)*u,p=e==="walk"?c?.12:.55:e==="display"?.32:.16,m=e==="walk"?o.speed*t:0,g=e==="walk"?0:.18*Math.sin(yt*t/6),x=N=>p*Math.sin(yt*(N/f+g)),d=[...[...l].reverse(),...a],h=[];c&&a.forEach((N,te)=>{s[N]=1+(e==="walk"?.13:.04)*Math.sin(yt*t/o.period-yt*te/5)});const M=(N,te)=>{const q=n.bones[N],fe=te?q.start:q.end;return fe.h*s[N]-fe.yc};let _=0;const b=N=>M(N,n.bones[N].part!=="tail"),S=N=>M(N,n.bones[N].part==="tail"),v=d.map((N,te)=>te?Math.max(S(d[te-1]),b(N)):b(N)),E=n.chains.neck[0],R=E===void 0?0:n.bones[E].start.h-n.bones[E].start.yc,w=n.bones[d[d.length-1]];v.push(Math.max(S(w.index),R)+.1*w.length*Math.sin(Math.min(Math.PI/2,r))+w.end.h*(1-Math.cos(Math.min(Math.PI/2,r)))*.5);const T=l.length?Sc(n.recipe,u,n.bones[l[l.length-1]]):[];T.length&&(v[0]=Math.max(v[0],...T.map(([,,,N,te])=>Math.max(N,.2*te))));const C=N=>.5*n.bones[d[N]].length,I=v.slice(),F=()=>{if(T.length){const N=n.bones[d[0]].length;v[0]=Math.max(v[0],v[1]);for(let te=0;te<4;te++){const q=qn((v[0]-v[1])/N,-.5,.5),fe=Math.sqrt(1-q*q),re=Math.min(...T.map(([ne,,K,he])=>v[0]+q*ne-Math.hypot(K*q,he*fe)));if(re>=.006*u)break;v[0]=v[0]+.006*u-re}}for(let N=0;N<d.length;N++)v[N+1]=Math.max(v[N+1],v[N]-C(N));for(let N=d.length-1;N>=0;N--)v[N]=Math.max(v[N],v[N+1]-C(N))};F();const V=[];{let N=0;for(const te of d){const q=n.bones[te].length;V.push(x(N+m+q*.5)),N+=q}}const W=v.map(()=>0);for(let N=0;N<3;N++){const te=re=>{const ne=Math.asin(qn((v[re+1]-v[re])/n.bones[d[re]].length,-.5,.5));return ft(Math.cos(V[re])*Math.cos(ne),Math.sin(ne),-Math.sin(V[re])*Math.cos(ne))},q=re=>{const ne=n.bones[d[re]],K=te(re);return Fi(ne.part==="tail"?K.negate():K,Fn).multiply(ti(ne.restQuaternion).invert())},fe=re=>{const ne=ti(n.bones[d[re-1]].restQuaternion),K=ne.clone().invert().multiply(q(re-1).invert().multiply(q(re))).multiply(ne);K.w<0&&K.set(-K.x,-K.y,-K.z,-K.w);const he=2*Math.acos(Math.min(1,K.w)),ae=Math.sqrt(Math.max(0,1-K.w*K.w)),ge=ae>1e-9?Math.min(Math.PI/2,Math.abs(he*K.z/ae)):0,H=ae>1e-9?Math.min(Math.PI/2,Math.abs(he*K.x/ae)):0,de=Math.min(n.bones[d[re]].length,n.bones[d[re-1]].length);return I[re]*(1-Math.cos(H))+.1*de*Math.sin(ge)};v.forEach((re,ne)=>{W[ne]=Math.max(W[ne],ne>0&&ne<d.length?fe(ne):0)}),W.forEach((re,ne)=>{v[ne]=I[ne]+re}),F()}let D=ft(0,v[0]+Dh,0);h.push(D.clone());const B=[];for(const[N,te]of d.entries()){const q=n.bones[te],fe=v[N+1]+Dh,re=qn(fe-D.y,-.5*q.length,.5*q.length),ne=x(_+m+q.length*.5),K=Math.sqrt(q.length*q.length-re*re),he=ft(Math.cos(ne)*K,re,-Math.sin(ne)*K).multiplyScalar(1/q.length);B.push(he),D=D.clone().addScaledVector(he,q.length),h.push(D),_+=q.length}if(d.forEach((N,te)=>{const q=n.bones[N].part==="tail";i[N]=q?{p:h[te+1].clone(),q:Fi(B[te].clone().negate(),Fn)}:{p:h[te].clone(),q:Fi(B[te],Fn)}}),l.length){const N=n.bones[l[l.length-1]],te=i[N.index];te.q=lu(te.p,te.q,N.length,Sc(n.recipe,u,N),.004*u)}const G=(N,te,q)=>N.reduce((fe,re)=>fe+(q?n.bones[re].restPosition[te]:i[re].p.getComponent(te)),0)/N.length,Y=ft(G(a,0,!0)-G(a,0,!1),0,G(a,2,!0)-G(a,2,!1));for(const N of d)i[N].p.add(Y);return m*s2(p)}function s2(n){let e=0;const t=64;for(let i=0;i<t;i++)e+=Math.cos(n*Math.sin(yt*(i+.5)/t));return e/t}function JS(n){return n.bones.filter(e=>e.parent>=0).map(e=>[e.parent,e.index])}function e3(n){const e=t=>n.limbs.filter(i=>i.kind===t).length;return{layout:n.recipe.layout,gait:n.locomotion.gait,bones:n.bones.length,legs:e("leg"),arms:e("arm"),wings:e("wing"),torsoSegments:n.chains.torso.length,neckBones:n.chains.neck.length,tailBones:n.chains.tail.length,trunkBones:n.chains.trunk.length,bodyLength:n.dims.bodyLength,height:n.dims.socketHeight}}const t3="fauna-composer-eye-2",r2=["pupil","iris-inner","iris","limbus","lid","outer-lid","orbit","socket","facet-a","facet-b","pseudopupil","eyespot","sclera","brow","nictitans","turret","ocellus","ocellus-rim","stalk","facet-edge","eyespot-rim","periocular"],It=Object.freeze(Object.fromEntries(r2.map((n,e)=>[n,e]))),wo=Object.freeze({segments:20,pupil:.34,pupilInnerScale:1.06,iris:.65,limbus:.92,horizontalPupil:{rx:.55,ry:.16,n:4},slitPupil:{rx:.08,ry:.46,point:.6},slitIrisFill:.95,slitIrisInner:.85,lid:{w:1,above:.72,below:.62},outerLid:{w:1.2,above:.95,below:.85},orbit:{w:1.55,above:1.35,below:1.25},clip:[.8,.84,.9,.98],recess:.2,eyeLift:.03,lidLift:.1,outerLidLift:.08,outerLidDrop:.06,orbitLift:.01,corneaRadius:1.4,rimSearch:1,closestSearch:2.5,socketDepth:.8}),ha=Object.freeze({cornea:1,lid:.4,compound:.35}),o2=Object.freeze({segments:12,stations:5,facet:.08}),a2=8,mi=(n,e)=>[n[0]-e[0],n[1]-e[1],n[2]-e[2]],Sn=(n,e)=>n[0]*e[0]+n[1]*e[1]+n[2]*e[2],Cn=(n,e)=>[n[1]*e[2]-n[2]*e[1],n[2]*e[0]-n[0]*e[2],n[0]*e[1]-n[1]*e[0]],Jo=(n,e)=>[n[0]*e,n[1]*e,n[2]*e],ei=(n,e,t)=>[n[0]+e[0]*t,n[1]+e[1]*t,n[2]+e[2]*t],nn=n=>{const e=Math.hypot(n[0],n[1],n[2]);return e>1e-15?[n[0]/e,n[1]/e,n[2]/e]:[0,0,0]};function ma(n,e,t){const i=[],[s,r,o]=e,[a,l,c]=t;for(let u=0,f=Math.floor(n.length/9);u<f;u++){const p=u*9,m=n[p],g=n[p+1],x=n[p+2],d=n[p+3]-m,h=n[p+4]-g,M=n[p+5]-x,_=n[p+6]-m,b=n[p+7]-g,S=n[p+8]-x,v=l*S-c*b,E=c*_-a*S,R=a*b-l*_,w=d*v+h*E+M*R;if(Math.abs(w)<1e-18)continue;const T=1/w,C=s-m,I=r-g,F=o-x,V=(C*v+I*E+F*R)*T;if(V<-1e-9||V>1+1e-9)continue;const W=I*M-F*h,D=F*d-C*M,B=C*h-I*d,G=(a*W+l*D+c*B)*T;if(G<-1e-9||V+G>1+1e-9)continue;const Y=(_*W+b*D+S*B)*T,N=nn([h*S-M*b,M*_-d*S,d*b-h*_]);i.push({t:Y,point:[s+a*Y,r+l*Y,o+c*Y],normal:N,tri:u,u:V,v:G})}return i.sort((u,f)=>u.t-f.t)}function $r(n,e,t){for(const i of ma(n,e,t))if(i.t>1e-9)return i;return null}function Ni(n,e,t,i=1/0){let s=null;for(const r of ma(n,e,t))Sn(r.normal,t)>0&&Math.abs(r.t)<=i&&(!s||Math.abs(r.t)<Math.abs(s.t))&&(s=r);return s}function fp(n,e){let t=null,i=1/0;for(let s=0,r=Math.floor(n.length/9);s<r;s++){const o=s*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,f]=Nh(a,l,c,e),p=[a[0]+(l[0]-a[0])*u+(c[0]-a[0])*f,a[1]+(l[1]-a[1])*u+(c[1]-a[1])*f,a[2]+(l[2]-a[2])*u+(c[2]-a[2])*f],m=(p[0]-e[0])**2+(p[1]-e[1])**2+(p[2]-e[2])**2;m<i&&(i=m,t={t:0,point:p,normal:nn(Cn(mi(l,a),mi(c,a))),tri:s,u,v:f})}return t}const c2=1e-9;function l2(n,e){const t=Math.floor(n.length/9),i=new Float64Array(t);let s=1/0;for(let r=0;r<t;r++){const o=r*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,f]=Nh(a,l,c,e),p=a[0]+(l[0]-a[0])*u+(c[0]-a[0])*f-e[0],m=a[1]+(l[1]-a[1])*u+(c[1]-a[1])*f-e[1],g=a[2]+(l[2]-a[2])*u+(c[2]-a[2])*f-e[2];i[r]=Math.sqrt(p*p+m*m+g*g),i[r]<s&&(s=i[r])}for(let r=0;r<t;r++){if(!(i[r]<=s+c2))continue;const o=r*9,a=[n[o],n[o+1],n[o+2]],l=[n[o+3],n[o+4],n[o+5]],c=[n[o+6],n[o+7],n[o+8]],[u,f]=Nh(a,l,c,e);return{t:0,point:[a[0]+(l[0]-a[0])*u+(c[0]-a[0])*f,a[1]+(l[1]-a[1])*u+(c[1]-a[1])*f,a[2]+(l[2]-a[2])*u+(c[2]-a[2])*f],normal:nn(Cn(mi(l,a),mi(c,a))),tri:r,u,v:f}}return null}function Nh(n,e,t,i){const s=mi(e,n),r=mi(t,n),o=mi(i,n),a=Sn(s,o),l=Sn(r,o);if(a<=0&&l<=0)return[0,0];const c=mi(i,e),u=Sn(s,c),f=Sn(r,c);if(u>=0&&f<=u)return[1,0];const p=a*f-u*l;if(p<=0&&a>=0&&u<=0)return[a/(a-u),0];const m=mi(i,t),g=Sn(s,m),x=Sn(r,m);if(x>=0&&g<=x)return[0,1];const d=g*l-a*x;if(d<=0&&l>=0&&x<=0)return[0,l/(l-x)];const h=u*x-g*f;if(h<=0&&f-u>=0&&g-x>=0){const _=(f-u)/(f-u+(g-x));return[1-_,_]}const M=1/(h+d+p);return[d*M,p*M]}function uu(n,e,t,i){let s=null;for(const r of ma(n,e,t))Sn(r.normal,t)>0&&Math.abs(r.t)<=i&&(!s||r.t>s.t)&&(s=r);return s}function ws(n,e,t){const i=n*Math.PI/180,s=e*Math.PI/180;return[Math.cos(s)*Math.cos(i),Math.sin(s),t*Math.cos(s)*Math.sin(i)]}function zc(n,e,t=[1,0,0]){const i=nn(n),s=c=>ei(c,i,-Sn(c,i));let r=Cn(e,i);Math.hypot(...r)<1e-6&&(r=s([1,0,0])),r=nn(r);const o=s(t),a=Math.hypot(...o);let l=r;if(a>.2){const c=Jo(o,1/a),u=Sn(c,r)<0?-1:1;l=nn(ei(Jo(c,.3),r,.7*u))}return Sn(Cn(i,l),e)<0&&(l=Jo(l,-1)),l}function qr(n,e,t,i){const s=Math.cos(n),r=Math.sin(n);return[e*s,(r>=0?t:i)*r*(1-.25*s*s)]}function ff(n,e){const t=Math.cos(e),i=Math.sin(e),s=wo;if(n==="horizontal"){const r=2/s.horizontalPupil.n;return[s.horizontalPupil.rx*Math.sign(t)*Math.abs(t)**r,s.horizontalPupil.ry*Math.sign(i)*Math.abs(i)**r]}return n==="vertical-slit"?[s.slitPupil.rx*t*Math.abs(t)**s.slitPupil.point,s.slitPupil.ry*i]:[s.pupil*t,s.pupil*i]}function pp(n){if(n.spec)return m2(n,n.spec);const e=wo,t=e.segments,i=n.er,s=nn(n.gaze),r=n.centre,o=n.barAxis?nn(ei(n.barAxis,s,-Sn(n.barAxis,s))):zc(s,n.up??[0,1,0]),a=Cn(s,o),l=[],c=[],u=[],f=[],p=[],m=[];let g=0;const x=(B,G,Y)=>[r[0]+(o[0]*B+a[0]*G+s[0]*Y)*i,r[1]+(o[1]*B+a[1]*G+s[1]*Y)*i,r[2]+(o[2]*B+a[2]*G+s[2]*Y)*i],d=(B,G,Y,N=null)=>(l.push(B[0],B[1],B[2]),c.push(It[G]),u.push(Y),p.push(N),l.length/3-1),h=e.corneaRadius*e.corneaRadius,M=Math.sqrt(h-e.limbus*e.limbus),_=(B,G)=>{const Y=Math.min(e.limbus,Math.hypot(B,G));return Math.sqrt(h-Y*Y)-M},b=(B,G)=>{const Y=Math.max(-1,Math.min(1,B/e.lid.w)),N=Math.sqrt(1-Y*Y);return(G?e.lid.above:e.lid.below)*N*(1-.25*Y*Y)},S=(B,G,Y)=>{const N=Y*b(B,G>=0);return Math.sign(G)*Math.min(Math.abs(G),N)},v=B=>2*Math.PI*B/t,E=(B,G)=>{if(n.surface){const Y=x(B,G,e.recess),N=uu(n.surface,Y,s,e.rimSearch*i);if(N)return[e.recess+N.t/i,N];const te=fp(n.surface,Y);if(te&&Math.hypot(...mi(te.point,Y))<=e.closestSearch*i){const q=Sn(mi(te.point,Y),s);return[e.recess+q/i,{...te,t:q}]}}return g+=n.surface?1:0,[e.recess,null]},R=n.type==="vertical-slit",w=[["pupil",B=>ff(n.type,B),e.clip[0]],["iris-inner",B=>{const[G,Y]=ff(n.type,B);return[G*e.pupilInnerScale,Y*e.pupilInnerScale]},e.clip[1]],["iris",B=>R?ea(qr(B,e.lid.w,e.lid.above,e.lid.below),e.slitIrisInner):[e.iris*Math.cos(B),e.iris*Math.sin(B)],e.clip[2]],["limbus",B=>R?ea(qr(B,e.lid.w,e.lid.above,e.lid.below),e.slitIrisFill):[e.limbus*Math.cos(B),e.limbus*Math.sin(B)],e.clip[3]]],T=[];let C=-1/0;const I=(B,G,Y)=>{const[N,te]=E(B,G);Y!=="limbus"&&(C=Math.max(C,N-_(B,G))),T.push({x:B,y:G,role:Y,hit:te})};I(0,0,"pupil");for(const[B,G,Y]of w)for(let N=0;N<t;N++){const[te,q]=G(v(N)),fe=S(te,q,Y);I(te,fe,B)}T.forEach(({x:B,y:G,role:Y,hit:N},te)=>{(te%t===1||te===0)&&m.push(l.length/3),d(x(B,G,C+e.eyeLift+_(B,G)),Y,ha.cornea,N)});const F=[];m.push(l.length/3);for(let B=0;B<t;B++){const[G,Y]=qr(v(B),e.lid.w,e.lid.above,e.lid.below),[N,te]=E(G,Y),q=N+e.lidLift;F.push(q),d(x(G,Y,q),"lid",ha.lid,te)}m.push(l.length/3);for(let B=0;B<t;B++){const[G,Y]=qr(v(B),e.outerLid.w,e.outerLid.above,e.outerLid.below),[N,te]=E(G,Y);d(x(G,Y,Math.max(N+e.outerLidLift,F[B]-e.outerLidDrop)),"outer-lid",0,te)}m.push(l.length/3);const V=[];for(let B=0;B<t;B++){const[G,Y]=qr(v(B),e.orbit.w,e.orbit.above,e.orbit.below),[N,te]=E(G,Y),q=x(G,Y,N+e.orbitLift);V.push(q),d(q,"orbit",0,te)}for(let B=0;B<t;B++)f.push(0,1+B,1+(B+1)%t);for(let B=1;B+1<m.length;B++){const G=m[B],Y=m[B+1];for(let N=0;N<t;N++){const te=(N+1)%t;f.push(G+N,Y+N,Y+te,G+N,Y+te,G+te)}}const W=l.length/3;m.push(W);for(const B of V)d(B,"socket",0);const D=d(x(0,0,-e.socketDepth),"socket",0);for(let B=0;B<t;B++)f.push(D,W+(B+1)%t,W+B);return{positions:l,roles:Uint8Array.from(c),gloss:u,index:f,surface:p,rimFallbacks:g,rings:m}}const ea=(n,e)=>[n[0]*e,n[1]*e];function h2(n){const{segments:e,stations:t}=o2,i=nn(n.gaze),s=nn(Cn(n.up,i)),r=Cn(i,s),[o,a,l]=n.er3,c=n.centre,u=[],f=[],p=[],m=[],g=[],x=(_,b)=>(u.push(_[0],_[1],_[2]),f.push(It[b]),p.push(ha.compound),u.length/3-1),d=(_,b,S)=>[c[0]+s[0]*_+r[0]*b+i[0]*S,c[1]+s[1]*_+r[1]*b+i[1]*S,c[2]+s[2]*_+r[2]*b+i[2]*S];g.push(x(d(0,0,l),"pseudopupil"));for(let _=1;_<=t;_++){g.push(u.length/3);const b=_/t*Math.PI/2,S=Math.sin(b),v=Math.cos(b);for(let E=0;E<e;E++){const R=2*Math.PI*E/e;x(d(o*S*Math.cos(R),a*S*Math.sin(R),l*v),(_+E)%2?"facet-b":"facet-a")}}const h=u.length/3;g.push(h),u.push(c[0],c[1],c[2]),f.push(It.socket),p.push(0);for(let _=0;_<e;_++)m.push(0,1+_,1+(_+1)%e);for(let _=1;_<t;_++){const b=1+(_-1)*e,S=1+_*e;for(let v=0;v<e;v++){const E=(v+1)%e;m.push(b+v,S+v,S+E,b+v,S+E,b+E)}}const M=1+(t-1)*e;for(let _=0;_<e;_++)m.push(h,M+(_+1)%e,M+_);return{positions:u,roles:Uint8Array.from(f),gloss:p,index:m,surface:f.map(()=>null),rimFallbacks:0,rings:g}}function u2(n){const e=nn(n.normal),t=nn(Cn(n.up,e)),i=Cn(e,t),s=a2,r=[...n.centre],o=[];for(let a=0;a<s;a++){const l=2*Math.PI*a/s,c=[n.centre[0]+(t[0]*Math.cos(l)+i[0]*Math.sin(l))*n.r,n.centre[1]+(t[1]*Math.cos(l)+i[1]*Math.sin(l))*n.r,n.centre[2]+(t[2]*Math.cos(l)+i[2]*Math.sin(l))*n.r],u=n.rimLift?n.rimLift(a,c):0;r.push(c[0]+e[0]*u,c[1]+e[1]*u,c[2]+e[2]*u)}for(let a=0;a<s;a++)o.push(0,1+a,1+(a+1)%s);return{positions:r,roles:new Uint8Array(s+1).fill(It.eyespot),gloss:new Array(s+1).fill(0),index:o,surface:new Array(s+1).fill(null),rimFallbacks:0,rings:[0,1]}}const Ec=Object.freeze({outerMargin:[.2,.23,.23],orbitMargin:[.55,.63,.63],shelf:{lift:.34,drop:.2,orbitLift:.16,from:.25,to:.7},raised:{raise:.35,cornea:1.15},crocodile:{raise:.3,palpebral:.15},disc:{w:1.95,above:2.3,below:1.85,lift:.06,outer:.45,plate:.04},turret:{lift:.55,aperture:.82,orbit:1.25,lean:.25,rimGloss:.35},sclera:{gap:.03,opening:.97},nictitatingDeg:40,spectacleLift:.02,spectacleOuterLift:.01,wrapOff:.15,airOff:.15,domeRiseMax:.2,pattern:{radial:.12,reticulated:.55,faint:.75},w:[[-.56,.2],[-.4,-.36],[-.2,-.36],[0,0],[.2,-.36],[.4,-.36],[.56,.2],[0,.14]],wOrigin:[0,.07]});function d2(n){const e=wo,t=Ec,i=n.pupilShape??{},s=n.lidShape??{},r=["round","horizontal","vertical-slit","slit-wide","beaded-slit","w","pinhole","dilated"].find(x=>x===n.pupil)??"round",o={kind:r,r:i.r??(r==="pinhole"?.09:r==="dilated"?.5:e.pupil),rx:i.rx??(r==="horizontal"?e.horizontalPupil.rx:r==="slit-wide"?.12:e.slitPupil.rx),ry:i.ry??(r==="horizontal"?e.horizontalPupil.ry:r==="slit-wide"||r==="beaded-slit"?.48:e.slitPupil.ry),n:i.n??e.horizontalPupil.n,point:i.point??e.slitPupil.point,bead:i.bead??.07,pinch:i.pinch??.022},a=r==="vertical-slit"||r==="slit-wide"||r==="beaded-slit",l=n.brow==="raised-orbit"||n.brow==="raised-orbit-shelf",c=a||l,f={shape:n.lid==="round"||n.lid==="spectacle"||n.lid==="turret"?"round":"almond",w:s.w??e.lid.w,above:s.above??e.lid.above,below:s.below??e.lid.below},p=n.sclera==="white",m=["none","shelf","raised-orbit","raised-orbit-shelf","disc"].find(x=>x===n.brow)??"none",g=n.lid==="turret"?{w:s.turretW??.8,lift:s.turretLift??t.turret.lift,aperture:t.turret.aperture}:null;return{pupil:o,iris:c?null:i.iris??e.iris,limbus:c?null:i.limbus??e.limbus,fill:[e.slitIrisInner,e.slitIrisFill],lid:f,outerMargin:m==="disc"?[t.disc.outer,t.disc.outer,t.disc.outer]:t.outerMargin,orbitMargin:t.orbitMargin,rollDeg:s.cornerUpDeg??0,brow:g?"turret":m,raise:n.brow==="raised-orbit"?t.raised.raise:n.brow==="raised-orbit-shelf"?t.crocodile.raise:0,shelfLift:m==="shelf"?t.shelf.lift:m==="raised-orbit-shelf"?t.crocodile.palpebral:0,shelfDrop:m==="shelf"?t.shelf.drop:0,shelfOrbitLift:m==="shelf"?t.shelf.orbitLift:0,disc:m==="disc"?{w:t.disc.w,above:t.disc.above,below:t.disc.below}:null,turret:g,sclera:p,spectacle:n.lid==="spectacle",corneaRadius:n.brow==="raised-orbit"?t.raised.cornea:e.corneaRadius,domeLimit:p?i.limbus??.52:null,pattern:["plain","radial","reticulated","reticulated-faint"].find(x=>x===n.irisPattern)??"plain",nictitating:n.extras==="nictitating"?"front":n.extras==="nictitating-lower"?"lower":"none"}}function f2(n,e,t,i){const s=Math.cos(e),r=Math.sin(e);switch(n.kind){case"horizontal":{const o=2/n.n;return[n.rx*Math.sign(s)*Math.abs(s)**o,n.ry*Math.sign(r)*Math.abs(r)**o]}case"vertical-slit":case"slit-wide":return[n.rx*s*Math.abs(s)**n.point,n.ry*r];case"beaded-slit":{const o=i/4,a=i/2-1,l=(t%i+i)%i;if(l===o)return[0,n.ry];if(l===3*o)return[0,-n.ry];const c=l>o&&l<3*o,u=c?l-o-1:(l-3*o-1+i)%i,f=(c?1:-1)*n.ry*(1-2*(u+1)/(a+1)),p=u%2===0?n.bead:n.pinch;return[c?-p:p,f]}case"w":return p2(e);default:return[n.r*s,n.r*r]}}function p2(n){const e=Ec.w,[t,i]=Ec.wOrigin,s=Math.cos(n),r=Math.sin(n);let o=1/0;for(let a=0;a<e.length;a++){const[l,c]=e[a],[u,f]=e[(a+1)%e.length],p=u-l,m=f-c,g=s*m-r*p;if(Math.abs(g)<1e-12)continue;const x=((l-t)*m-(c-i)*p)/g,d=((l-t)*r-(c-i)*s)/g;x>1e-9&&d>=-1e-9&&d<=1+1e-9&&x<o&&(o=x)}return[t+s*o,i+r*o]}const pf=(n,e,t)=>{const i=Math.max(0,Math.min(1,(t-n)/(e-n)));return i*i*(3-2*i)};function m2(n,e){const t=wo,i=Ec,s=t.segments,r=n.er,o=nn(n.gaze),a=n.centre;let l=n.barAxis?nn(ei(n.barAxis,o,-Sn(n.barAxis,o))):zc(o,n.up??[0,1,0]),c=Cn(o,l);const u=n.forward??[1,0,0],f=Sn(l,u)>=0?1:-1;if(e.rollDeg){const se=-f*e.rollDeg*Math.PI/180,A=Math.cos(se),y=Math.sin(se),O=ei(Jo(l,A),c,y),j=ei(Jo(c,A),l,-y);l=O,c=j}const p=[],m=[],g=[],x=[],d=[],h=[],M=[];let _=0;const b=(se,A,y)=>[a[0]+(l[0]*se+c[0]*A+o[0]*y)*r,a[1]+(l[1]*se+c[1]*A+o[1]*y)*r,a[2]+(l[2]*se+c[2]*A+o[2]*y)*r],S=(se,A,y,O=null,j=1)=>(p.push(se[0],se[1],se[2]),m.push(It[A]),g.push(y),d.push(O),M.push(j),p.length/3-1),v=e.lid,E=v.shape==="round",R=(se,A,y,O)=>E?[A*Math.cos(se),(Math.sin(se)>=0?y:O)*Math.sin(se)]:qr(se,A,y,O),w=(se,A)=>{const y=Math.max(-1,Math.min(1,se/v.w)),O=Math.sqrt(1-y*y);return(A?v.above:v.below)*O*(E?1:1-.25*y*y)},T=(se,A,y)=>{const O=y*w(se,A>=0);return Math.sign(A)*Math.min(Math.abs(A),O)},C=se=>2*Math.PI*se/s,I=(se,A)=>{if(!n.midline)return[se,A];const y=n.midline.n,O=(l[0]*se+c[0]*A)*y[0]+(l[1]*se+c[1]*A)*y[1]+(l[2]*se+c[2]*A)*y[2],j=Sn(a,y);if(O>=0||j+O*r>=n.midline.min)return[se,A];if(e.disc){const X=Sn(l,y),Se=Sn(c,y),Te=X*X+Se*Se;if(Te>1e-6){const Fe=((n.midline.min-j)/r-O)/Te;return[se+Fe*X,A+Fe*Se]}}const le=Math.max(0,(n.midline.min-j)/(O*r));return[se*le,A*le]},F=(se,A)=>{if(n.surface){const y=b(se,A,t.recess),O=uu(n.surface,y,o,t.rimSearch*r);if(O)return[t.recess+O.t/r,O,0];const j=l2(n.surface,y);if(j&&Math.hypot(...mi(j.point,y))<=t.closestSearch*r){const le=mi(j.point,y),X=Sn(le,o);return[t.recess+X/r,{...j,t:X},Math.hypot(...ei(le,o,-X))/r]}}return _+=n.surface?1:0,[t.recess,null,0]},V=(se,A,y,O)=>{const j=A?Math.min(1,Math.max(0,(y-.5*i.wrapOff)/(.5*i.wrapOff))):0;if(j<=0)return se;const le=ei(A.point,A.normal,O*r),X=j*j*(3-2*j);return[se[0]+(le[0]-se[0])*X,se[1]+(le[1]-se[1])*X,se[2]+(le[2]-se[2])*X]},W=(se,A)=>{if(!n.surface)return se;const y=fp(n.surface,se);if(!y)return se;const O=Math.hypot(...mi(y.point,se))/r-A,j=Math.min(1,Math.max(0,(O-i.airOff)/i.airOff));if(j<=0)return se;const le=ei(y.point,y.normal,A*r),X=j*j*(3-2*j);return[se[0]+(le[0]-se[0])*X,se[1]+(le[1]-se[1])*X,se[2]+(le[2]-se[2])*X]},D=e.domeLimit??e.limbus??t.limbus,B=e.corneaRadius*e.corneaRadius,G=Math.sqrt(B-D*D),Y=(se,A)=>{const y=Math.min(D,Math.hypot(se,A));return Math.sqrt(B-y*y)-G},N=e.pupil,te=(se,A)=>f2(N,se,A,s),q=se=>A=>[se*Math.cos(A),se*Math.sin(A)],fe=se=>A=>ea(R(A,v.w,v.above,v.below),se),re=(se,A)=>e.pattern==="radial"&&(se==="iris"||se==="iris-inner")?A%2?1-i.pattern.radial:1+i.pattern.radial:e.pattern==="reticulated"&&se==="iris"&&A%3===0?i.pattern.reticulated:e.pattern==="reticulated-faint"&&se==="iris"&&A%3===0?i.pattern.faint:1,ne=e.sclera?[["pupil",te,t.clip[0]],["iris-inner",(se,A)=>ea(te(se,A),t.pupilInnerScale),t.clip[1]],["iris",q(e.iris??.44),t.clip[2]],["sclera",q((e.iris??.44)+i.sclera.gap),t.clip[3]],["sclera",fe(i.sclera.opening),null]]:[["pupil",te,t.clip[0]],["iris-inner",(se,A)=>ea(te(se,A),t.pupilInnerScale),t.clip[1]],["iris",e.iris===null?fe(e.fill[0]):q(e.iris),t.clip[2]],["limbus",e.limbus===null?fe(e.fill[1]):q(e.limbus),t.clip[3]]],K=e.turret,he=K?F(0,0)[0]:0,ae=[];let ge=-1/0,H=-1/0;const de=(se,A,y,O)=>{const[j,le]=F(se,A);y!=="limbus"&&y!=="sclera"&&(ge=Math.max(ge,j-Y(se,A))),(y==="pupil"||y==="iris-inner")&&(H=Math.max(H,j-Y(se,A))),ae.push({x:se,y:A,role:y,hit:le,i:O})};de(0,0,"pupil",0);for(const[se,A,y]of ne)for(let O=0;O<s;O++){const[j,le]=A(C(O),O),X=y===null?le:T(j,le,y);de(j,X,se,O)}ge=Math.min(ge,H+i.domeRiseMax);const J=(se,A)=>K?he+K.aperture-.05+Y(se,A):ge+t.eyeLift+Y(se,A)+e.raise,[me,U]=K&&n.look?[Sn(n.look,l)*i.turret.lean,Sn(n.look,c)*i.turret.lean]:[0,0];ae.forEach(({x:se,y:A,role:y,hit:O,i:j},le)=>{(le%s===1||le===0)&&h.push(p.length/3),S(b(se+me,A+U,J(se,A)),y,ha.cornea,O,re(y,j))});const ee=Math.atan2(Sn(u,c),Sn(u,l)),P=i.nictitatingDeg*Math.PI/180,ie=se=>e.nictitating==="front"?Math.abs(Math.atan2(Math.sin(se-ee),Math.cos(se-ee)))<=P:e.nictitating==="lower"&&Math.sin(se)<-.2,_e=[];h.push(p.length/3);for(let se=0;se<s;se++){const A=C(se),[y,O]=I(...R(A,v.w,v.above,v.below)),[j,le,X]=F(y,O),Se=K?he+K.aperture:e.spectacle?Math.max(ge+t.eyeLift+Y(y,O)+e.raise,j+i.spectacleLift):e.disc?Math.max(j+t.lidLift,ge+t.eyeLift+i.disc.plate):j+t.lidLift+e.raise;_e.push(Se);const Te=ie(A),Fe=K||e.spectacle?b(y+me,O+U,Se):V(b(y+me,O+U,Se),le,X,Se-j);S(Fe,Te?"nictitans":"lid",K?i.turret.rimGloss:e.spectacle?1:Te?.7:ha.lid,le)}const[xe,Z,Re]=[v.w+e.outerMargin[0],v.above+e.outerMargin[1],v.below+e.outerMargin[2]];h.push(p.length/3);const oe=e.sclera,Ee=[];for(let se=0;se<s;se++){const A=C(se),y=pf(i.shelf.from,i.shelf.to,Math.sin(A));let[O,j]=K?[K.w*Math.cos(A),K.w*Math.sin(A)]:R(A,xe,Z,Re);e.shelfDrop&&(j-=e.shelfDrop*y),[O,j]=I(O,j);const[le,X,Se]=F(O,j),Te=K?le+K.lift:oe?le+t.orbitLift:e.spectacle?le+i.spectacleOuterLift:Math.max(le+t.outerLidLift+e.raise,_e[se]-t.outerLidDrop)+e.shelfLift*y,Fe=K?"turret":oe?"orbit":e.shelfLift&&y>.5?"brow":"outer-lid",at=K?b(O,j,Te):e.spectacle||e.disc?V(b(O,j,Te),X,Se,Te-le):W(V(b(O,j,Te),X,Se,Te-le),t.outerLidLift+e.raise+e.shelfLift*y);Ee.push(at),S(at,Fe,K?.15:0,X)}let ze=Ee;if(!oe){h.push(p.length/3),ze=[];for(let se=0;se<s;se++){const A=C(se),y=pf(i.shelf.from,i.shelf.to,Math.sin(A)),O=e.disc,[j,le]=I(...K?[i.turret.orbit*Math.cos(A),i.turret.orbit*Math.sin(A)]:O?R(A,O.w,O.above,O.below):R(A,v.w+e.orbitMargin[0],v.above+e.orbitMargin[1],v.below+e.orbitMargin[2])),[X,Se,Te]=F(j,le),Fe=(O?i.disc.lift:t.orbitLift)+e.shelfOrbitLift*y,at=V(b(j,le,X+Fe),Se,Te,Fe);ze.push(at),S(at,"orbit",0,Se)}}for(let se=0;se<s;se++)x.push(0,1+se,1+(se+1)%s);for(let se=1;se+1<h.length;se++){const A=h[se],y=h[se+1];for(let O=0;O<s;O++){const j=(O+1)%s;x.push(A+O,y+O,y+j,A+O,y+j,A+j)}}const Ve=p.length/3;h.push(Ve);for(const se of ze)S(se,"socket",0);const it=S(b(0,0,-t.socketDepth),"socket",0);for(let se=0;se<s;se++)x.push(it,Ve+(se+1)%s,Ve+se);return{positions:p,roles:Uint8Array.from(m),gloss:g,index:x,surface:d,rimFallbacks:_,rings:h,shade:M}}const ic=Object.freeze({segments:12,stations:3,lens:.07,gloss:{lens:.85,edge:.3,pupil:.6}});function mf(n){const e=n.segments??ic.segments,t=n.stations??ic.stations,i=ic.gloss,s=nn(n.gaze),r=nn(Cn(n.up,s)),o=Cn(s,r),[a,l,c]=n.er3,u=n.centre,f=[],p=[],m=[],g=[],x=[],d=(E,R,w)=>(f.push(E[0],E[1],E[2]),p.push(It[R]),m.push(w),f.length/3-1),h=(E,R,w=1)=>{const T=a*Math.sin(E)*Math.cos(R)*w,C=l*Math.sin(E)*Math.sin(R)*w,I=c*Math.cos(E)*w;return[u[0]+r[0]*T+o[0]*C+s[0]*I,u[1]+r[1]*T+o[1]*C+s[1]*I,u[2]+r[2]*T+o[2]*C+s[2]*I]},M=E=>E/t*Math.PI/2,_=E=>2*Math.PI*E/e;x.push(d(h(0,0),"pseudopupil",i.pupil));for(let E=1;E<=t;E++){x.push(f.length/3);for(let R=0;R<e;R++)d(h(M(E),_(R)),"facet-edge",i.edge)}const b=(E,R)=>1+(E-1)*e+(R%e+e)%e;x.push(f.length/3);const S=f.length/3;for(let E=1;E<t;E++)for(let R=0;R<e;R++)d(h((M(E)+M(E+1))/2,_(R+.5),1+ic.lens),(E+R)%2?"facet-b":"facet-a",i.lens);const v=d([...u],"socket",0);x.push(v);for(let E=0;E<e;E++)g.push(0,b(1,E),b(1,E+1));for(let E=1;E<t;E++)for(let R=0;R<e;R++){const w=S+(E-1)*e+R,T=b(E,R),C=b(E,R+1),I=b(E+1,R),F=b(E+1,R+1);g.push(w,T,I,w,I,F,w,F,C,w,C,T)}for(let E=0;E<e;E++)g.push(v,b(t,E+1),b(t,E));return{positions:f,roles:Uint8Array.from(p),gloss:m,index:g,surface:p.map(()=>null),rimFallbacks:0,rings:x}}const Oh=Object.freeze({flange:1.4});function Ul(n){const e=n.segments,t=n.stations,i=nn(n.normal);let s=Cn(n.up,i);Math.hypot(...s)<1e-6&&(s=Cn([1,0,0],i)),s=nn(s);const r=Cn(i,s),o=n.centre,a=[],l=[],c=[],u=[],f=[],p=(h,M,_)=>(a.push(h[0],h[1],h[2]),l.push(It[M]),c.push(_),a.length/3-1),m=(h,M,_)=>[o[0]+s[0]*h+r[0]*M+i[0]*_,o[1]+s[1]*h+r[1]*M+i[1]*_,o[2]+s[2]*h+r[2]*M+i[2]*_];f.push(p(m(0,0,n.height),"ocellus",1));for(let h=1;h<=t;h++){f.push(a.length/3);const M=h/t*Math.PI/2,_=n.r*Math.sin(M),b=n.height*Math.cos(M);for(let S=0;S<e;S++){const v=2*Math.PI*S/e;p(m(_*Math.cos(v),_*Math.sin(v),b),n.rim&&!n.flange&&h===t?"ocellus-rim":"ocellus",1)}}if(n.rim&&n.flange){f.push(a.length/3);for(let h=0;h<e;h++){const M=2*Math.PI*h/e;p(m(Oh.flange*n.r*Math.cos(M),Oh.flange*n.r*Math.sin(M),0),"ocellus-rim",.3)}}const g=n.rim&&n.flange?t+1:t,x=p(m(0,0,-.3*n.height),"socket",0);f.push(x);for(let h=0;h<e;h++)u.push(0,1+h,1+(h+1)%e);for(let h=1;h<g;h++){const M=1+(h-1)*e,_=1+h*e;for(let b=0;b<e;b++){const S=(b+1)%e;u.push(M+b,_+b,_+S,M+b,_+S,M+S)}}const d=1+(g-1)*e;for(let h=0;h<e;h++)u.push(x,d+(h+1)%e,d+h);return{positions:a,roles:Uint8Array.from(l),gloss:c,index:u,surface:l.map(()=>null),rimFallbacks:0,rings:f}}const g2=Object.freeze({segments:12,rings:[.7,.9,1,1.1],heights:[.04,.035,.02,.008,0],socketDepth:.6});function x2(n){const e=g2,t=e.segments,i=nn(n.normal);let s=Cn(n.up,i);Math.hypot(...s)<1e-6&&(s=Cn([1,0,0],i)),s=nn(s);const r=Cn(i,s),o=n.centre,a=[],l=[],c=[],u=[],f=[],p=(b,S,v)=>(a.push(b[0],b[1],b[2]),l.push(It[S]),c.push(v),a.length/3-1),m=(b,S,v)=>[o[0]+s[0]*b+r[0]*S+i[0]*v,o[1]+s[1]*b+r[1]*S+i[1]*v,o[2]+s[2]*b+r[2]*S+i[2]*v],g=b=>{const S=n.rimLift?n.rimLift(b):0;return ei(b,i,S)};f.push(p(g(m(0,0,e.heights[0]*n.r)),"eyespot",0));const x=["eyespot","eyespot","eyespot-rim","periocular"],d=[0,0,0,0],h=[];e.rings.forEach((b,S)=>{f.push(a.length/3);for(let v=0;v<t;v++){const E=2*Math.PI*v/t,R=g(m(b*n.r*Math.cos(E),b*n.r*Math.sin(E),e.heights[S+1]*n.r));S===e.rings.length-1&&h.push(R),p(R,x[S],d[S])}});for(let b=0;b<t;b++)u.push(0,1+b,1+(b+1)%t);for(let b=0;b+1<e.rings.length;b++){const S=1+b*t,v=1+(b+1)*t;for(let E=0;E<t;E++){const R=(E+1)%t;u.push(S+E,v+E,v+R,S+E,v+R,S+R)}}const M=a.length/3;f.push(M);for(const b of h)p(b,"socket",0);const _=p(m(0,0,-e.socketDepth*n.r),"socket",0);for(let b=0;b<t;b++)u.push(_,M+(b+1)%t,M+b);return{positions:a,roles:Uint8Array.from(l),gloss:c,index:u,surface:l.map(()=>null),rimFallbacks:0,rings:f}}function _2(n){const e=n.segments,t=n.rings,i=nn(n.dir);let s=Cn(n.up,i);Math.hypot(...s)<1e-6&&(s=Cn([1,0,0],i)),s=nn(s);const r=Cn(i,s),o=[],a=[],l=[],c=[],u=[],f=d=>(o.push(d[0],d[1],d[2]),a.push(It.stalk),l.push(0),o.length/3-1),p=ei(n.base,i,-(n.sink??.6)*n.r0);f(p);for(let d=0;d<t;d++){u.push(o.length/3);const h=d/(t-1),M=ei(p,i,h*(n.length+(n.sink??.6)*n.r0)),_=n.r0+(n.r1-n.r0)*h;for(let b=0;b<e;b++){const S=2*Math.PI*b/e;f(ei(ei(M,s,_*Math.cos(S)),r,_*Math.sin(S)))}}const m=ei(n.base,i,n.length),g=f(ei(m,i,.2*n.r1));for(let d=0;d<e;d++)c.push(0,1+(d+1)%e,1+d);for(let d=0;d+1<t;d++){const h=1+d*e,M=1+(d+1)*e;for(let _=0;_<e;_++){const b=(_+1)%e;c.push(h+_,M+b,M+_,h+_,h+b,M+b)}}const x=1+(t-1)*e;for(let d=0;d<e;d++)c.push(g,x+d,x+(d+1)%e);return{patch:{positions:o,roles:Uint8Array.from(a),gloss:l,index:c,surface:a.map(()=>null),rimFallbacks:0,rings:u},tip:m}}const b2="fauna-composer-skin-5",M2="fauna-composer-skin-6",v2="fauna-composer-coat-crisp-1",gf=Object.freeze(["spots","rosettes","reticulated","dapple","stripes","bands","brindle"]),y2=Object.freeze({torsoRadial:28,torsoRadialBanded:22,torsoRings:7,torsoRingsAnnulated:9,neckRings:6,tailRings:6,legRadial:16,legRadialArthropod:9,legRings:6,legRingsArthropod:3,armRadial:14,armRings:4,eyeRadial:20,eyeStations:7,rootRings:4}),S2=255,_t=(n=0,e=0,t=0)=>new ue(n,e,t),mn=(n,e,t)=>Math.max(e,Math.min(t,n)),At=(n,e,t)=>n+(e-n)*t,Yt=(n,e,t)=>{const i=mn((t-n)/(e-n),0,1);return i*i*(3-2*i)},Vo=(n,e,t)=>Math.exp(-.5*((n-e)/t)**2),st=(n,e,t)=>[At(n[0],e[0],t),At(n[1],e[1],t),At(n[2],e[2],t)],jt=(n,e)=>[n[0]*e,n[1]*e,n[2]*e],E2=n=>n>216/24389?116*Math.cbrt(n)-16:n*24389/27,w2=n=>n>8?((n+16)/116)**3:n*27/24389,T2=(n,e,t,i,s)=>{if(!(e>0))return n;if(t)return st(n,i,Ho.plumageMix*e);const r=Math.max(1e-6,.2126*s[0]+.7152*s[1]+.0722*s[2]),o=E2(r),a=Ho.floor*o,l=Math.max(0,1-(o-a)/Ho.lstar),c=jt(n,w2(Math.max(a,o-Ho.lstar*e))/r);return l>0?st(c,i,Ho.shortAccent*l*e):c},Ho={plumageMix:.55,lstar:16,floor:.4,shortAccent:.3},ds=Math.PI*2,Xt=Object.fromEntries(EM.map((n,e)=>[n,e])),xf=n=>[n.x,n.y,n.z];function A2(n,e,t){const i=new Uint8Array(t);for(const s of n)if(s.part==="eyes")for(let r=s.firstTriangle*3;r<(s.firstTriangle+s.triangles)*3;r++)i[e[r]]=1;return i}function R2(n,e,t,i,s,r){const o=new Vi;o.setAttribute("position",new Bi(n,3)),o.setIndex(new Bi(e,1)),o.computeVertexNormals();const a=o.getAttribute("normal").array;o.dispose();const l=n.length/3,c=new Uint32Array(n.buffer,n.byteOffset,l*3),u=new Uint32Array(i.buffer,i.byteOffset,l*4),f=new Map;for(let h=0;h<l;h++){if(r[h])continue;const M=`${c[3*h]},${c[3*h+1]},${c[3*h+2]},${t[4*h]},${t[4*h+1]},${t[4*h+2]},${t[4*h+3]},${u[4*h]},${u[4*h+1]},${u[4*h+2]},${u[4*h+3]}`,_=f.get(M);_?_.push(h):f.set(M,[h])}const p=new Int32Array(l).fill(-1),m=[];for(const h of f.values())if(h.length>1){for(const M of h)p[M]=m.length;m.push(h)}if(!m.length)return a;const g=new Float64Array(l*3),x=new Float64Array(l*3);for(let h=0;h<e.length/3;h++){const M=e[3*h],_=e[3*h+1],b=e[3*h+2];if(p[M]<0&&p[_]<0&&p[b]<0)continue;const S=n[3*b]-n[3*_],v=n[3*b+1]-n[3*_+1],E=n[3*b+2]-n[3*_+2],R=n[3*M]-n[3*_],w=n[3*M+1]-n[3*_+1],T=n[3*M+2]-n[3*_+2],C=v*T-E*w,I=E*R-S*T,F=S*w-v*R;for(const V of[M,_,b])p[V]<0||(x[3*V]+=C,x[3*V+1]+=I,x[3*V+2]+=F,s[h]||(g[3*V]+=C,g[3*V+1]+=I,g[3*V+2]+=F))}const d=(h,M)=>{let _=0,b=0,S=0;for(const v of M){const E=Math.hypot(h[3*v],h[3*v+1],h[3*v+2]);E>1e-30&&(_+=h[3*v]/E,b+=h[3*v+1]/E,S+=h[3*v+2]/E)}return[_,b,S,Math.hypot(_,b,S)]};for(const h of m){let[M,_,b,S]=d(g,h);if(S>1e-12||([M,_,b,S]=d(x,h)),!(S>1e-12)){const w=h[0];M=a[3*w],_=a[3*w+1],b=a[3*w+2],S=1}const v=Math.fround(M/S),E=Math.fround(_/S),R=Math.fround(b/S);for(const w of h)a[3*w]=v,a[3*w+1]=E,a[3*w+2]=R}return a}class C2{p=new Float64Array(3*4096);c=new Float32Array(3*4096);si=new Uint16Array(4*4096);sw=new Float32Array(4*4096);rg=new Uint8Array(4096);gl=new Float32Array(4096);ix=new Uint32Array(3*8192);hid=new Uint8Array(8192);hide=!1;l0=new Float32Array(3*4096);l1=new Float32Array(3*4096);l2=new Float32Array(3*4096);own=new Uint8Array(4096);cq=new Float64Array(6*4096);coat;lastColour=[0,0,0];nv=0;ni=0;region=S2;parts=[];current;begin(e,t){this.end(),this.lastW=void 0,this.current={part:e,label:t,firstTriangle:this.ni/3,triangles:0,bones:[]}}end(){this.current&&(this.current.triangles=this.ni/3-this.current.firstTriangle,this.current.triangles>0&&this.parts.push(this.current),this.current=void 0)}prepared=new WeakMap;lastW;lastPrep=[];grow(){const e=this.rg.length*2,t=(i,s)=>{const r=new i.constructor(s);return r.set(i),r};this.p=t(this.p,e*3),this.c=t(this.c,e*3),this.si=t(this.si,e*4),this.sw=t(this.sw,e*4),this.rg=t(this.rg,e),this.gl=t(this.gl,e),this.coat&&(this.l0=t(this.l0,e*3),this.l1=t(this.l1,e*3),this.l2=t(this.l2,e*3),this.own=t(this.own,e),this.cq=t(this.cq,e*6))}v(e,t,i,s=this.region){let r=i===this.lastW?this.lastPrep:this.prepared.get(i);if(!r){const a=i.filter(([,c])=>c>1e-4).sort((c,u)=>u[1]-c[1]).slice(0,4),l=a.reduce((c,[,u])=>c+u,0)||1;r=[];for(let c=0;c<4;c++)r.push(a[c]?.[0]??0,a[c]?a[c][1]/l:0,a[c]?1:0);this.prepared.set(i,r)}if(i!==this.lastW&&(this.lastW=i,this.lastPrep=r,this.current))for(let a=0;a<4;a++)r[a*3+2]&&!this.current.bones.includes(r[a*3])&&this.current.bones.push(r[a*3]);this.nv>=this.rg.length&&this.grow();const o=this.nv++;for(let a=0;a<4;a++)this.si[o*4+a]=r[a*3],this.sw[o*4+a]=r[a*3+1];if(this.p[o*3]=e.x,this.p[o*3+1]=e.y,this.p[o*3+2]=e.z,this.c[o*3]=mn(t[0],0,1),this.c[o*3+1]=mn(t[1],0,1),this.c[o*3+2]=mn(t[2],0,1),this.rg[o]=s,this.gl[o]=0,this.coat){for(let a=0;a<3;a++){const l=this.c[o*3+a];this.l0[o*3+a]=l,this.l1[o*3+a]=l,this.l2[o*3+a]=l}this.own[o]=0,this.cq.fill(NaN,o*6,o*6+6)}return o}vc(e,t,i,s=this.region){const r=this.coat;if(!r){const l=t();return this.lastColour=l,this.v(e,l,i,s)}r.mode=0,r.calls=0,r.ok=!1;const o=t();this.lastColour=o;const a=this.v(e,o,i,s);if(r.calls===1&&r.ok&&r.sampledAt(e)){const l=r.sample;this.cq[a*6]=l.x,this.cq[a*6+1]=l.y,this.cq[a*6+2]=l.z,this.cq[a*6+3]=l.dorsal,this.cq[a*6+4]=l.along,this.cq[a*6+5]=l.footprint,r.mode=1;const c=t();r.mode=2;const u=t();r.mode=3;const f=t();r.mode=0;for(let p=0;p<3;p++)this.l0[a*3+p]=c[p],this.l1[a*3+p]=u[p],this.l2[a*3+p]=f[p];this.own[a]=1}return a}copyLayers(e,t){if(this.coat)for(let i=0;i<3;i++)this.l0[t*3+i]=this.l0[e*3+i],this.l1[t*3+i]=this.l1[e*3+i],this.l2[t*3+i]=this.l2[e*3+i]}patch(e,t,i,s,r,o=this.region){const a=this.nv,l=_t();for(let c=0;c<t.length;c++){const u=this.v(l.set(e[c*3],e[c*3+1],e[c*3+2]),t[c],r,o);this.gl[u]=mn(i[c],0,1)}for(let c=0;c+2<s.length;c+=3)this.t(a+s[c],a+s[c+1],a+s[c+2]);return a}t(e,t,i){if(this.ni+3>this.ix.length){const s=new Uint32Array(this.ix.length*2);s.set(this.ix),this.ix=s;const r=new Uint8Array(this.ix.length/3);r.set(this.hid),this.hid=r}this.hid[this.ni/3]=this.hide?1:0,this.ix[this.ni++]=e,this.ix[this.ni++]=t,this.ix[this.ni++]=i}pos(e){return _t(this.p[e*3],this.p[e*3+1],this.p[e*3+2])}to(e,t,i,s){const r=this.pos(e);_t().crossVectors(this.pos(t).sub(r),this.pos(i).sub(r)).dot(s)>=0?this.t(e,t,i):this.t(e,i,t)}}const xo=n=>{const e=n.t.clone().normalize();let t=n.u.clone().addScaledVector(e,-n.u.dot(e));return t.lengthSq()<1e-10&&(t=Math.abs(e.y)<.9?_t(0,1,0):_t(1,0,0),t.addScaledVector(e,-t.dot(e))),t.normalize(),{t:e,u:t,v:_t().crossVectors(t,e)}};function ga(n,e,t,i,s=1,r=0){const{t:o,u:a,v:l}=e,c=2/(n.n??2),u=Math.cos(t),f=Math.sin(t),p=c===1?u:Math.sign(u)*Math.pow(Math.abs(u),c),m=c===1?f:Math.sign(f)*Math.pow(Math.abs(f),c);let g=n.rx,x=f<0?n.ryBelow??n.ry:n.ry;if(n.lobe){const[M,_]=n.lobe(t);g=Math.max(1e-4,g+M),f>0&&(x=Math.max(1e-4,x+_))}const d=p*g*s,h=m*x*s;if(i.set(n.c.x+o.x*r+l.x*d+a.x*h,n.c.y+o.y*r+l.y*d+a.y*h,n.c.z+o.z*r+l.z*d+a.z*h),n.squash){const[M,_]=n.squash,b=-_*((i.x-n.c.x)*M.x+(i.y-n.c.y)*M.y+(i.z-n.c.z)*M.z);i.x+=M.x*b,i.y+=M.y*b,i.z+=M.z*b}return i}function Fh(n,e){const t=n.c.distanceTo(e.c),i=n.t.angleTo(e.t),s=Math.max(n.rx,n.ry,n.ryBelow??n.ry,e.rx,e.ry,e.ryBelow??e.ry);return i*s>.9*t}function L2(n,e=!1){if(n.length<4||!n.slice(0,-1).some((o,a)=>Fh(o,n[a+1])))return;const t=n.map(o=>o.t.clone().normalize()),i=[0];for(let o=1;o<n.length;o++)i.push(i[o-1]+n[o-1].c.distanceTo(n[o].c));const s=n.map(o=>Math.max(o.rx,o.ry,o.ryBelow??o.ry)),r=new ue;for(const o of[.5,.8,1.2,1.8,2.5,3.5]){for(let a=0;a<n.length;a++){const l=Math.max(1e-6,o*s[a]);r.set(0,0,0);for(let u=0;u<n.length;u++){const f=(i[u]-i[a])/l;Math.abs(f)<3&&r.addScaledVector(t[u],Math.exp(-.5*f*f))}const c=e?Math.min(1,(i[i.length-1]-i[a])/(2*l)):1;n[a].t.copy(t[a]).lerp(r.normalize(),c).normalize()}if(!n.slice(0,-1).some((a,l)=>Fh(a,n[l+1])))return}}function P2(n,e,t){const i=[];for(let l=0;l+1<n.length;l++)t(l)&&i.push(l);const s=new Map,r=l=>{let c=s.get(l);if(!c){const u=n[l],f=xo(u);c=Array.from({length:e},(p,m)=>ga(u,f,ds*m/e,_t())),s.set(l,c)}return c},o=new Float64Array(i.length*e*6);let a=0;for(const l of i){const c=r(l),u=r(l+1);for(let f=0;f<e;f++){const p=c[f],m=c[(f+1)%e],g=u[f],x=u[(f+1)%e];o[a++]=p.distanceTo(m),o[a++]=m.distanceTo(g),o[a++]=g.distanceTo(p),o[a++]=m.distanceTo(x),o[a++]=x.distanceTo(g),o[a++]=g.distanceTo(m)}}return o}function vn(n,e,t,i=.6,s=.6,r=0){if(e.length<2)return;const o=[],a=xo,l=_t(),c=(M,_=1,b=0,S,v,E)=>{const R=a(M),w=[];for(let T=0;T<t;T++){const C=ds*T/t;if(ga(M,R,C,l,_,b),S){const I=n.v(l,S[T],M.w,M.region);E&&n.copyLayers(E[T],I),w.push(I);continue}w.push(n.vc(l,()=>M.color(C,l),M.w,M.region)),v?.push(n.lastColour)}return w},u=(M,_,b,S,v)=>{const E=[],w=Math.max(M.rx,M.ry)*b;for(let F=1;F<=3;F++){const V=F/4*Math.PI/2;E.push(c(M,Math.cos(V),_*Math.sin(V)*w,S,void 0,v))}const{t:T}=a(M),C=M.c.clone().addScaledVector(T,_*w),I=n.v(C,S[Math.floor(t*3/4)],M.w,M.region);return n.copyLayers(v[Math.floor(t*3/4)],I),{list:E,apex:I}},f=[],p=[],m=[];let g=-1;const x=e.map((M,_)=>c(M,1,0,void 0,_===0?f:_===e.length-1?p:void 0));if(i>0){const M=u(e[0],-1,i,f,x[0]);m.push(...M.list.reverse()),g=M.apex}o.push(...m,...x);const d=n.hide;if(g>=0&&(n.hide=d||(r&1)!==0,_f(n,g,o[0],!0),n.hide=d),s>0){const M=u(e[e.length-1],1,s,p,x[x.length-1]);o.push(...M.list),n.hide=d||(r&2)!==0,_f(n,M.apex,o[o.length-1],!1),n.hide=d}const h=m.length+x.length-1;for(let M=0;M+1<o.length;M++){n.hide=d||M<m.length&&(r&1)!==0||M>=h&&(r&2)!==0;for(let _=0;_<t;_++){const b=o[M][_],S=o[M][(_+1)%t],v=o[M+1][_],E=o[M+1][(_+1)%t];n.t(b,S,v),n.t(S,E,v)}}n.hide=d}function D2(n,e,t,i,s){const r=(p,m)=>{const g=xo(p),x=_t(),d=[];for(let h=0;h<m;h++){const M=ds*h/m;ga(p,g,M,x),d.push(n.vc(x,()=>p.color(M,x),p.w,p.region))}return d},o=r(e,t),a=r(i,s),l=e.c.clone().add(i.c).multiplyScalar(.5),c=(p,m,g)=>n.pos(p).add(n.pos(m)).add(n.pos(g)).multiplyScalar(1/3).sub(l);let u=0,f=0;for(;u<t||f<s;){const p=o[u%t],m=a[f%s];if(f>=s||u<t&&(u+1)/t<=(f+1)/s){const g=o[(u+1)%t];n.to(p,g,m,c(p,g,m)),u++}else{const g=a[(f+1)%s];n.to(p,g,m,c(p,g,m)),f++}}}function Bc(n,e,t,i,s=1){const r=xo(e),o=_t(),a=[],l=_t(),c=[];for(let m=0;m<t;m++){const g=ds*m/t;ga(e,r,g,o),c.push(o.clone()),l.add(o)}l.multiplyScalar(1/t);for(let m=0;m<t;m++){const g=ds*m/t,x=s===1?c[m]:l.clone().lerp(c[m],s);a.push(n.vc(x,()=>e.color(g,x),e.w,e.region))}const u=n.vc(l,()=>e.color(-Math.PI/2,l),e.w,e.region),f=r.t.clone().multiplyScalar(i),p=n.hide;s<1&&(n.hide=!0);for(let m=0;m<t;m++)n.to(u,a[m],a[(m+1)%t],f);n.hide=p}function _f(n,e,t,i){for(let s=0;s<t.length;s++){const r=t[s],o=t[(s+1)%t.length];i?n.t(o,r,e):n.t(r,o,e)}}function An(n,e,t,i,s,r,o=.5,a=.5,l=1,c){if(e.length<2)return;const u=[];let f=c?.clone()??_t(0,1,0);for(let p=0;p<e.length;p++){const m=e[Math.min(e.length-1,p+1)].clone().sub(e[Math.max(0,p-1)]).normalize();f.addScaledVector(m,-f.dot(m)),f.lengthSq()<1e-8&&(f=Math.abs(m.y)<.9?_t(0,1,0):_t(1,0,0),f.addScaledVector(m,-f.dot(m))),f.normalize();const g=p;u.push({c:e[p],t:m,u:f.clone(),rx:Math.max(1e-4,t[p]),ry:Math.max(1e-4,t[p]*l),w:i[p],color:(x,d)=>s(g,x,d)})}vn(n,u,r,o,a)}function Nn(n,e,t,i,s,r,o=10,a=6){const[l,c]=t,u=[];for(let f=0;f<=a;f++){const p=f/a,m=At(-.92,.92,p)*Math.PI/2,g=Math.cos(m);u.push({c:e.clone().addScaledVector(l,Math.sin(m)*i[0]),t:l,u:c,rx:i[2]*g,ry:i[1]*g,w:s,color:(x,d)=>r(x,p,d)})}vn(n,u,o,.32,.32)}function mp(n,e,t,i,s,r,o,a){const l=_t().crossVectors(t,i).normalize(),c=_t(),u=(x,d,h)=>e.clone().addScaledVector(t,x).addScaledVector(i,d).addScaledVector(l,h*r*.5),f=(x,d)=>typeof o=="function"?o(x,d):o,p=(x,d)=>typeof a=="function"?a(x,d):a,m=s.map(([x,d])=>n.v(u(x,d,1),p(x,d),f(x,d))),g=s.map(([x,d])=>n.v(u(x,d,-1),p(x,d),f(x,d)));s.forEach(([x,d])=>c.add(u(x,d,0))),c.multiplyScalar(1/s.length);for(let x=1;x+1<s.length;x++)n.to(m[0],m[x],m[x+1],l),n.to(g[0],g[x],g[x+1],l.clone().negate());for(let x=0;x<s.length;x++){const d=(x+1)%s.length,h=n.pos(m[x]).add(n.pos(m[d])).multiplyScalar(.5).sub(c);n.to(m[x],g[x],m[d],h),n.to(m[d],g[x],g[d],h)}}function I2(n,e,t,i){const s=(x,d)=>Math.max(1e-6,Math.sqrt(x.distanceTo(d))),o=s(n,e),a=o+s(e,t),l=a+s(t,i),c=_t(),u=_t(),f=_t(),p=_t(),m=_t(),g=(x,d)=>(c.copy(n).lerp(e,(x-0)/(o-0)),u.copy(e).lerp(t,(x-o)/(a-o)),f.copy(t).lerp(i,(x-a)/(l-a)),p.copy(c).lerp(u,(x-0)/(a-0)),m.copy(u).lerp(f,(x-o)/(l-o)),d.copy(p).lerp(m,(x-o)/(a-o)));return x=>{const d=o+(a-o)*x,h=(a-o)*.001,M=g(d,_t()),_=g(d+h,_t()).sub(g(d-h,_t()));return _.lengthSq()<1e-20&&_.copy(t).sub(e),{c:M,t:_.normalize()}}}const U2=12*Math.PI/180;function N2(n,e,t,i,s){const r=D=>D.k+D.f,o=32*i,a=D=>{const B=Math.min(i-1,Math.floor(D));return e(B,D-B)},l=D=>{const B=Math.min(i-1,Math.floor(D));return Math.max(1e-6,t(B,D-B))},c=[],u=[],f=[],p=[];let m=a(0),g=l(0);for(let D=0;D<=o;D++){const B=i*D/o,G=a(B),Y=l(B);c.push(B),u.push(D?u[D-1]+G.c.distanceTo(m.c):0),f.push(D?f[D-1]+G.t.angleTo(m.t):0),p.push(D?p[D-1]+Math.abs(Math.log(Y/g)):0),m=G,g=Y}const x=D=>{const B=Math.min(o-1,Math.floor(D/i*o)),G=D/i*o-B;return At(u[B],u[B+1],G)},d=n.findIndex(D=>x(r(D))>=s);if(d<0||n.length-1-d<2)return n;const h=r(n[d]),M=i,_=n.length-1-d,b=(x(M)-x(h))/_,S=Math.max(0,c.findIndex(D=>D>=h)),v=[0],E=[0];for(let D=1;D<=o;D++)v.push(D>S?(u[D]-u[D-1])/Math.max(1e-9,b)+(f[D]-f[D-1])/W2:0),E.push(D>S?(p[D]-p[D-1])/X2:0);let R=v.reduce((D,B)=>D+B,0)/_,w=v;for(let D=0;D<6;D++)w=v.map((B,G)=>Math.max(B,R*E[G])),R=w.reduce((B,G)=>B+G,0)/_;const T=[0];for(let D=1;D<=o;D++)T.push(T[D-1]+w[D]);const C=D=>{const B=Math.min(o-1,Math.floor(D/i*o)),G=D/i*o-B;return At(T[B],T[B+1],G)},I=C(h),F=C(M),V=n.slice(0,d+1);let W=0;for(let D=1;D<_;D++){const B=I+(F-I)*D/_;for(;W<o-1&&T[W+1]<B;)W++;const G=Math.max(h,c[W]+(c[W+1]-c[W])*(B-T[W])/Math.max(1e-12,T[W+1]-T[W])),Y=Math.min(i-1,Math.floor(G)),N=G-Y;V.push({...n[d],k:Y,f:N,kind:"bone"})}return V.push(n[n.length-1]),V}function bf(n,e,t){let i=n,s=i.map(r=>e(r).clone().normalize());for(let r=0;r<3;r++){const o=[i[0]],a=[s[0]];let l=!1;for(let c=1;c<i.length;c++){const u=i[c-1],f=i[c];if(s[c-1].angleTo(s[c])>U2){const p=(u.k+u.f+f.k+f.f)/2,m=Math.min(t-1,Math.floor(p)),g=p-m,x={...u,k:m,f:g,kind:g<.12||g>.88?"joint":"bone"};o.push(x),a.push(e(x).clone().normalize()),l=!0}o.push(f),a.push(s[c])}if(i=o,s=a,!l)break}return i}function O2(n,e,t,i){const s=.22*e;if(n==="muzzle"||n==="jaws"){const r=n==="jaws"?.82:1;return{x:s,w:.982*t,h:.973*i*r,yc:-.0133*i}}return n==="beak"?{x:s,w:t,h:i,yc:.02*i}:n==="flat-face"?{x:s,w:t,h:i,yc:.04*i}:n==="blunt"?{x:s,w:.985*t,h:.985*i,yc:0}:{x:s,w:.943*t,h:.931*i,yc:0}}const F2=new Set(["stripes","bands","brindle"]),k2=new Set(["limb-upper","limb-lower","foot"]),qo=(n,e,t,i=t)=>{const s=Math.sin(n),r=Math.cos(n),o=s<0?i:t,a=Math.hypot(r*o,s*e);return a>1e-12?s*e/a:s},z2=(n,e,t,i=t)=>{const s=Math.sin(n),r=Math.cos(n),o=s<0?i:t,a=Math.hypot(r*o,s*e);return a>1e-12?r*o/a:r},Yo=(n,e,t)=>Rh(e,t,7,n)/4294967296;function n3(n,e={}){if(e.presentation!==void 0&&e.presentation!=="skin-5"&&e.presentation!=="realism-1")throw new Error("Unknown Composer skin presentation");const t=e.presentation==="realism-1",i=new C2,s=n.recipe,r=n.dims,o=n.bones,a=e.traits??Zo(s),l=a.neutral?0:mn(s.variability,0,1.5),c=oa(`${s.colorSeed}/${s.palette}`),u=z=>new dn(...z.restQuaternion),f=z=>_t(...z.restPosition),p=(z,ye,be=0,De=0)=>_t(ye,be,De).applyQuaternion(u(z)).add(f(z)),m=(z,ye,be,De)=>_t(ye,be,De).applyQuaternion(u(z)).normalize(),g=r.bodyLength,x=Math.max(g,.2),d=z=>[[z,1]],h=e.debug?[]:void 0;let M=0,_=!1;const b=y2,S=cu(`composer-skin-ind-v1/${a.coat.driftKey}`),v=[];for(let z=0;z<12;z++)v.push(S());const E=z=>Math.floor(z*4294967296)>>>0,R=E(v[0]),w=l*(.05+.07*v[1]),T=l*(v[2]-.5)*.24,C=1+l*(v[3]-.5)*.3,I=l*.45*v[4],F=.12+.3*v[5],V=1+l*(v[9]-.5)*.34,W={traits:a,jv:l,osteoSeed:E(v[6]),plateSeed:E(v[7]),featherSeed:E(v[8])};let D=n.phenotype?structuredClone(n.phenotype.coat):R0(C0(s.palette,s.colorSeed,{pattern:s.pattern,marks:s.marks,scale:s.patternScale,contrast:s.patternContrast,countershade:s.countershade,juvenileSpots:a.coat.juvenileSpots}),A0(a.coat.driftKey,s.variability));l>0&&(D={...D,bellyLine:mn(D.bellyLine+T,-1,1),countershade:mn(D.countershade*C,0,1)});const B=D.scale,G=(1+l*(v[10]-.5)*.3)**2.2,Y=(1+l*(v[11]-.5)*.2)**2.2,N={...D.colours,skin:jt(D.colours.skin,G),keratin:jt(D.colours.keratin,G),eye:jt(D.colours.eye,Y)},te=a.sex==="male"&&s.dimorphism>0,q=te?s.dimorphism*Yt(.55,.95,a.maturity):0,fe=[.155,.117,.08],{torso:re,tail:ne,neck:K,head:he,trunk:ae}=n.chains,ge=o[re[0]],H=o[re[re.length-1]],de=p(ge,0,ge.start.yc),J=p(H,H.length,H.end.yc),me=de.clone().add(J).multiplyScalar(.5),U=J.clone().sub(de);U.z=0,U.lengthSq()<1e-12&&U.set(1,0,0),U.normalize();const ee=n.phenotype?.coatFrame.phase??0,P=n.phenotype?.coatFrame.lateral??1,ie=n.phenotype?.coatStage,_e={x:0,y:0,z:0,halfH:r.torsoHeight/x,halfW:r.torsoWidth/x,cell:.024},xe=new Float64Array(3),Z={x:0,y:0,z:0,dorsal:0,region:"torso",along:0,footprint:0},Re=Math.max(r.legReach,r.frontLegReach,.001),oe=D.pattern==="bands"?{...D,pattern:"plain"}:null,Ee=gf.includes(D.pattern)?D.pattern:null,ze={mode:0,calls:0,ok:!1,sample:Z,sampledAt:z=>{const ye=z.x-me.x,be=z.y-me.y;return Z.x===(ye*U.x+be*U.y)/x+ee&&Z.y===(be*U.x-ye*U.y)/x&&Z.z===z.z/x*P}};Ee&&(i.coat=ze);const Ve=(z,ye,be,De,et=0)=>{const Ne=z.x-me.x,Ze=z.y-me.y;Z.x=(Ne*U.x+Ze*U.y)/x+ee,Z.y=(Ze*U.x-Ne*U.y)/x,Z.z=z.z/x*P,Z.dorsal=mn(ye,-1,1),Z.region=be,Z.along=mn(De,0,1),Z.footprint=et,ie&&(_e.x=Z.x-ee,_e.y=Z.y,_e.z=z.z/x);const dt=ze.mode;dt===0?(ie?wl(D,ie,Z,_e,xe):Ri(D,Z,xe,0),ze.calls++,ze.ok=be!=="eye"&&be!=="horn"&&be!=="armor"&&!(F2.has(D.pattern)&&k2.has(be))):ie?wl(D,ie,Z,_e,xe,dt===1?0:1,dt===3?1:0):Ph(D,Z,xe,0,dt===1?0:1,dt===3?1:0);let Je=[xe[0],xe[1],xe[2]];if(oe&&(be==="limb-upper"||be==="limb-lower"||be==="foot")&&(ie?wl(oe,ie,Z,_e,xe):Ri(oe,Z,xe,0),Je=st([xe[0],xe[1],xe[2]],Je,.4)),be==="eye"||be==="horn"||be==="armor")return Je;let Dt=V;return w>0&&(Dt*=1+w*2*(gv(Z.x*4.5,Z.y*4.5,Z.z*4.5,R)-.5)),te&&(Dt*=1-.06*s.dimorphism*Yt(-.2,.7,ye)),Dt!==1&&(Je=jt(Je,Math.pow(Dt,2.2))),q>0&&(Je=T2(Je,q*Yt(-.85,.15,ye),s.palette==="plumage",N.accent,N.base)),s.palette==="plumage"&&be==="neck"&&(Je=st(Je,N.accent,.25)),I>0&&(be==="limb-lower"||be==="foot"||be==="limb-upper")&&s.layout!=="limbless"&&(Je=st(Je,fe,I*Yt(F*Re,.02*Re,z.y))),Je},it=(z,ye)=>{const be=[];z.forEach(({bone:Be,reversed:nt},wt)=>{const Ut=nt?Be.end:Be.start,bt=nt?Be.start:Be.end;if(wt===0)be.push(Ut);else{const Tt=be[be.length-1];be[be.length-1]={w:(Tt.w+Ut.w)/2,h:(Tt.h+Ut.h)/2,yc:(Tt.yc+Ut.yc)/2}}be.push(bt)});const De=(Be,nt)=>{const wt=be[Math.max(0,Be-1)],Ut=be[Be],bt=be[Be+1],Tt=be[Math.min(be.length-1,Be+2)],zt=(is,xi,Zn,zs)=>.5*(2*xi+(-is+Zn)*nt+(2*is-5*xi+4*Zn-zs)*nt*nt+(-is+3*xi-3*Zn+zs)*nt*nt*nt),an=Math.max(1e-4,zt(wt.w,Ut.w,bt.w,Tt.w)),jn=zt(wt.yc,Ut.yc,bt.yc,Tt.yc),ks=At(Ut.yc-Ut.h,bt.yc-bt.h,nt);return{w:an,h:Math.max(1e-4,Math.min(zt(wt.h,Ut.h,bt.h,Tt.h),jn-ks)),yc:jn}},et=[],Ne=[];z.forEach(({bone:Be,reversed:nt},wt)=>{const Ut=m(Be,0,1,0),bt=p(Be,nt?Be.length:0),Tt=p(Be,nt?0:Be.length);wt===0?(et.push(bt),Ne.push(Ut)):(et[wt].add(bt).multiplyScalar(.5),Ne[wt]=Ne[wt].clone().add(Ut).normalize()),et.push(Tt),Ne.push(Ut)}),et.forEach((Be,nt)=>Be.addScaledVector(Ne[nt],be[nt].yc));const Ze=[...et,...ye.extra??[]],dt=[Ze[0].clone().multiplyScalar(2).sub(Ze[1]),...Ze,Ze[Ze.length-1].clone().multiplyScalar(2).sub(Ze[Ze.length-2])],Je=Ze.slice(0,-1).map((Be,nt)=>I2(dt[nt],dt[nt+1],dt[nt+2],dt[nt+3])),Dt=Be=>Ze[Be+1].clone().sub(Ze[Be]).normalize(),qt=Je.map(()=>!1),vt=new Set;for(let Be=0;Be<z.length;Be++){const nt=Ze[Be],wt=Dt(Be),Ut=Ze[Be+1].distanceTo(nt),bt=Math.max(1e-4,Math.min((be[Be].w+be[Be].h)/2,(be[Be+1].w+be[Be+1].h)/2));for(let Tt=1;Tt<8;Tt++){const{c:zt,t:an}=Je[Be](Tt/8),jn=zt.clone().sub(nt);if(jn.addScaledVector(wt,-jn.dot(wt)).length()>Math.max(.5*bt,.12*Ut)||an.dot(wt)<.3){qt[Be]=!0;break}}qt[Be]&&(Be>0&&vt.add(Be),Be+1<Ze.length-1&&vt.add(Be+1))}M+=vt.size;const on=(Be,nt)=>{if(!qt[Be])return Je[Be](nt);const wt=Dt(Be),Ut=wt.clone();return Be>0&&vt.has(Be)&&nt<.12&&Ut.lerp(Dt(Be-1),.5-nt/.24),Be+1<Je.length&&vt.has(Be+1)&&nt>.88&&Ut.lerp(Dt(Be+1),(nt-.88)/.24),{c:Ze[Be].clone().lerp(Ze[Be+1],nt),t:Ut.normalize()}};let cn=[];z.forEach(({bone:Be},nt)=>{const wt=ye.ringsFor(Be);let Ut=[];for(let Tt=0;Tt<wt;Tt++)Ut.push(Tt/wt);nt===z.length-1&&Ut.push(1);const bt=new Set;if(nt>0&&bt.add(.12),(nt<z.length-1||ye.extra)&&bt.add(.88),Ut=Ut.filter(Tt=>![...bt].some(zt=>Math.abs(Tt-zt)<.04)),Ut=[...Ut,...bt].sort((Tt,zt)=>Tt-zt),nt===0&&ye.rootF!==void 0){const Tt=ye.rootF,zt=.5/wt;Ut=[Tt,...Ut.filter(an=>an>Tt+zt)]}for(const Tt of Ut)cn.push({k:nt,f:Tt,kind:nt===0&&Tt===ye.rootF?"root":bt.has(Tt)?"joint":"bone"})}),cn=bf(cn,Be=>on(Be.k,Be.f).t,z.length),ye.respaceFrom!==void 0&&(cn=N2(cn,on,(Be,nt)=>{const wt=De(Be,nt);return .5*(wt.w+wt.h)},z.length,ye.respaceFrom));const ni=[],ii=[];return z.forEach(({bone:Be},nt)=>{const wt=z[nt-1]?.bone,Ut=z[nt+1]?.bone;for(const{f:bt,kind:Tt}of cn.filter(zt=>zt.k===nt)){const zt=De(nt,bt),an=ye.ripple?ye.ripple(Be,bt):1,{c:jn,t:ks}=on(nt,bt),is=m(Be,0,1,0);let xi;if(bt<.5&&wt){const ci=.5*(1-Yt(0,.5,bt));xi=[[wt.index,ci],[Be.index,1-ci]]}else if(bt>.5&&Ut){const ci=.5*Yt(.5,1,bt);xi=[[Ut.index,ci],[Be.index,1-ci]]}else if(bt>.5&&!Ut&&ye.endBone!==void 0){const ci=Yt(.5,1,bt);xi=[[ye.endBone,ci],[Be.index,1-ci]]}else xi=[[Be.index,1]];nt===0&&ni.length===0&&ye.startWeights&&(xi=ye.startWeights);const Zn={c:jn,t:ks,u:is,rx:zt.w*an,ry:zt.h*an,w:xi,color:()=>[0,0,0]},zs={kind:Tt,bone:Be,k:nt,f:bt,sec:zt,fp:0,along:0,region:"torso"};ye.dress(Zn,zs);const sr=At(be[nt].yc-be[nt].h,be[nt+1].yc-be[nt+1].h,bt),To=jn.clone().sub(f(Be)).dot(is);let Bs=Zn.ryBelow??Zn.ry;if(To-Bs<sr){Bs=To-sr;const ci=.35*Zn.ry;Bs<ci&&(jn.addScaledVector(is,ci-Bs),Bs=ci)}Zn.ryBelow=Math.max(1e-4,Bs),ye.after?.(Zn,zs),ni.push(Zn),ii.push(zs)}}),{rings:ni,metas:ii,sections:be,evalSeg:on}},se=(z,ye,be)=>{z.forEach((De,et)=>{const Ne=ds*.5*(De.rx+.5*(De.ry+(De.ryBelow??De.ry)))/be,Ze=et>0?z[et-1].c.distanceTo(De.c):1/0,dt=et+1<z.length?z[et+1].c.distanceTo(De.c):1/0,Je=Math.min(Ze,dt);ye[et].fp=Math.max(Ne,Number.isFinite(Je)?Je:Ne)/x})},A=(z,ye,be)=>{h&&ye.forEach((De,et)=>{const Ne=be[et];h.push({chain:z,kind:Ne.kind,bone:Ne.bone.index,part:Ne.bone.part,f:Ne.f,centre:xf(De.c),tangent:xf(De.t.clone().normalize()),rx:De.rx,ry:De.ry,ryBelow:De.ryBelow??De.ry,weights:De.w.map(([Ze,dt])=>[Ze,dt]),region:Ne.region})})},y=s.torso==="segmented",O=s.torso==="annulated",j=(z,ye)=>z.part!=="torso"?1:y?1-.14*Math.pow(Math.cos(Math.PI*ye),8):O?1-.05*Math.pow(Math.cos(Math.PI*3*ye),6):1,le=(z,ye)=>z.part!=="torso"?0:y?.55*Math.pow(Math.cos(Math.PI*ye),6):O?.25*Math.pow(Math.cos(Math.PI*3*ye),4):0,X=[...[...ne].reverse().map(z=>({bone:o[z],reversed:!0})),...re.map(z=>({bone:o[z],reversed:!1})),...K.map(z=>({bone:o[z],reversed:!1}))],Se=re.map(z=>o[z]),Te=Se.reduce((z,ye)=>z+ye.length,0),Fe=z=>{const ye=new Map;let be=0;for(const De of z)ye.set(De,be),be+=o[De].length;return ye},at=z=>z.reduce((ye,be)=>ye+o[be].length,0),Pe=Fe(re),k=Fe(ne),Ce=Fe(K),ve=at(ne),Ae=at(K),He=z=>((Pe.get(z.socketBone)??0)+z.socket[0])/Math.max(Te,1e-9),Le=n.limbs.filter(z=>z.kind!=="wing"),pt=z=>z.length?z.reduce((ye,be)=>ye+He(be),0)/z.length:void 0,mt=pt(Le.filter(z=>!z.front)),Rt=pt(Le.filter(z=>z.front)),ke=Le.length>0&&(s.layout==="quadruped"||s.layout==="biped"||s.layout==="sprawled")&&!y&&!O,xt=.35*(Le.length?Math.min(...Le.map(z=>2*Math.abs(z.socket[2]))):0),Me=(z,ye)=>be=>{const De=Math.cos(be),et=Math.sin(be),Ne=De*De,Ze=Yt(-.25,.35,et),dt=Yt(.25,-.45,et),Je=.06*ye.h*(1+.05*a.torso.withers)*Vo(z,.85,.09)*Math.max(0,et)**2;let Dt=0;Rt!==void 0&&(Dt+=.08*ye.w*Vo(z,Rt,.07)*Ne*Ze),mt!==void 0&&(Dt+=.1*ye.w*Vo(z,mt,.08)*Ne*Ze),Dt-=.06*ye.w*Vo(z,.25,.1)*Ne*dt,te&&(Dt+=.08*s.dimorphism*ye.w*Yt(.72,.86,z)*Ne*Ze);const qt=Yt(0,.06,z)*Yt(1,.9,z);return[mn(Dt,-xt,xt)*qt,Je*qt]},Ie=(z,ye)=>((Pe.get(z.index)??0)+ye*z.length)/Math.max(Te,1e-9),Qe=(z,ye)=>{if(z.part==="tail"){const be=((k.get(z.index)??0)+(1-ye)*z.length)/Math.max(ve,1e-9);return be>.85?["tail-tip",(be-.85)/.15]:["tail",be/.85]}return z.part==="neck"?["neck",((Ce.get(z.index)??0)+ye*z.length)/Math.max(Ae,1e-9)]:["torso",Ie(z,ye)]},je=o[he],Xe=r.headLength,Ge=O2(Dc(s.head),Xe,r.craniumWidth,r.craniumHeight),rt=p(je,Ge.x,Ge.yc),Ct=p(je,.5*Xe,Ge.yc),lt=y||O?b.torsoRadialBanded:b.torsoRadial,Lt=V2(s,r,Ve,lt,x);i.begin("torso",y?"segmented trunk":O?"annulated body":"torso");const gt=it(X,{ripple:j,extra:[rt,Ct],ringsFor:z=>z.part==="torso"?O?b.torsoRingsAnnulated:b.torsoRings:z.part==="neck"?b.neckRings:b.tailRings,dress:(z,ye)=>{const{bone:be,f:De,sec:et}=ye,[Ne,Ze]=Qe(be,De);if(ye.region=Ne,ye.along=Ze,z.region=Xt[Ne],be.part==="torso"){const Je=Ie(be,De);z.n=2+.3*Yt(0,.15,Je)*Yt(1,.85,Je),ke&&(z.lobe=Me(Je,et))}const dt=le(be,De);z.color=(Je,Dt)=>{const qt=Ve(Dt,qo(Je,z.rx,z.ry,z.ryBelow),Ne,Ze,ye.fp);return dt?st(qt,N.accent,dt):qt}}}),Ft=X[X.length-1].bone,$t=gt.sections[gt.sections.length-1],Gt=(z,ye)=>(z+ye)/2,Kn=Gt(Ge.w,Ge.h)/Math.max(1e-6,Gt($t.w,$t.h)),es=mn(Math.ceil(2*Math.abs(Math.log(Kn))/Math.log(1.12)),2,9),yr=z=>1-(1-z)*(1-z),Sr=z=>z<=.1*Xe?.35*z/(.1*Xe):Math.min(.7,.35+.35*(z-.1*Xe)/(.12*Xe)),Os=[],Er=[],L=m(je,1,0,0),Q=gt.rings[gt.rings.length-1],pe=bf([{k:0,f:0,kind:"blend"},...Array.from({length:es},(z,ye)=>({k:0,f:(ye+1)/es,kind:"blend"}))],z=>z.f===0?Q.t:z.f===1?L:gt.evalSeg(X.length,z.f).t,1).slice(1).map(z=>z.f);for(const z of pe){const ye=Ge.x*z,be=z===1,{c:De,t:et}=gt.evalSeg(X.length,z),Ne=yr(z),Ze=$t.w*(Ge.w/$t.w)**Ne,dt=$t.h*(Ge.h/$t.h)**Ne,Je=Sr(ye),Dt=be?m(je,0,1,0):m(Ft,0,1,0).lerp(m(je,0,1,0),z).normalize(),qt={c:be?rt.clone():De,t:be?m(je,1,0,0):et,u:Dt,rx:be?Ge.w:Ze,ry:be?Ge.h:dt,w:[[Ft.index,1-Je],[je.index,Je]],color:()=>[0,0,0]},vt=z<.5?"neck":Lt.region(ye),on=z<.5?1:Lt.along(ye),cn={kind:"blend",bone:je,k:X.length,f:z,sec:{w:Ze,h:dt,yc:0},fp:0,along:on,region:vt};qt.region=Xt[vt],be?qt.color=Lt.col(ye,Ge.w,Ge.h):qt.color=(ni,ii)=>{const Be=qo(ni,qt.rx,qt.ry),nt=1-.12*Math.sin(Math.PI*z)*Yt(.1,-.7,Be);return jt(Ve(ii,Be,vt,on,cn.fp),nt)},Os.push(qt),Er.push(cn)}const ce=[...gt.rings,...Os],$=[...gt.metas,...Er];L2(ce,!0);const Ue=gt.rings.length-1;if(ce.slice(Ue,-1).some((z,ye)=>Fh(z,ce[Ue+ye+1]))){_=!0;const z=ce[Ue].t.clone().normalize(),ye=ce[ce.length-1].t.clone().normalize(),be=[0];for(let Ze=Ue+1;Ze<ce.length;Ze++)be.push(be[be.length-1]+ce[Ze].c.distanceTo(ce[Ze-1].c));const De=be[be.length-1]||1,et=new dn().setFromUnitVectors(z,ye),Ne=new dn;for(let Ze=Ue+1;Ze<ce.length-1;Ze++)ce[Ze].t=z.clone().applyQuaternion(Ne.clone().slerp(et,Yt(0,1,be[Ze-Ue]/De)))}se(ce,$,lt);const qe=P2(ce,lt,z=>$[z].region==="torso"&&$[z+1].region==="torso");qe.sort();const tt=qe.length?qe[qe.length>>1]:0;ie&&(_e.cell=tt/x);const Ke=go[D.pattern];if(Ke>0&&D.pattern!=="roan"&&tt>0){const z=x/(4.32*Ke*tt);D.scale>z&&(D={...D,scale:z})}ie&&(Object.freeze(D),oe&&Object.freeze(oe)),vn(i,ce,lt,ne.length?.25:.85,.25,2),A("axial",ce,$),i.end();const ct={eyeMul:Y,speciesBodyLength:B2(s,a),fallbacks:0,eyes:[],colours:{eye:[...N.eye],iris:null,lidFactor:.35}},We=H2(i,n,je,N,p,m,Lt,Ge,Os[Os.length-1].w,W,Ve,ct);if(ae.length){i.begin("trunk","trunk"),i.region=Xt.muzzle;const z=ae.map(et=>({bone:o[et],reversed:!1})),ye=We?Mf*Math.max(We.rx,We.ry):0,be=it(z,{ringsFor:()=>4,respaceFrom:ye,startWeights:[[he,.7],[ae[0],.3]],dress:(et,Ne)=>{Ne.region="muzzle",Ne.along=1,et.region=Xt.muzzle;const Ze=vf[0]*Math.pow(Math.sin(Math.PI*vf[1]*Ne.f),6);et.color=(dt,Je)=>st(Ve(Je,qo(dt,et.rx,et.ry,et.ryBelow),"muzzle",1,Ne.fp),N.accent,Ze)}});let De=be.rings;if(se(be.rings,be.metas,Zr),We){De=[We,...be.rings.slice(1)];const et=Mf*Math.max(We.rx,We.ry);let Ne=1,Ze=0;for(;Ne<De.length-2&&(Ze+=De[Ne].c.distanceTo(De[Ne-1].c))<et;)Ne++;if(Ze<et){Ze=0;for(let Dt=1;Dt<De.length;Dt++){Ze+=De[Dt].c.distanceTo(De[Dt-1].c);const qt=1-Yt(0,et,Ze),vt=De[Dt];if(qt<=0)break;vt.c=vt.c.clone().lerp(We.c.clone().addScaledVector(We.t.clone().normalize(),Ze),qt*qt),vt.t=vt.t.clone().normalize().lerp(We.t.clone().normalize(),qt).normalize(),vt.u=vt.u.clone().lerp(We.u,qt).normalize();const on=vt.ryBelow??vt.ry;vt.rx=At(vt.rx,We.rx,qt),vt.ry=At(vt.ry,We.ry,qt),vt.ryBelow=At(on,We.ryBelow??We.ry,qt)}}else if(Ne>1){const Dt=We.c,qt=We.t.clone().normalize(),vt=De[Ne].c,on=De[Ne].t.clone().normalize(),cn=Dt.distanceTo(vt),ni=(bt,Tt)=>{const zt=bt*bt,an=zt*bt;return Tt.copy(Dt).multiplyScalar(2*an-3*zt+1).addScaledVector(qt,G2*cn*(an-2*zt+bt)).addScaledVector(vt,-2*an+3*zt).addScaledVector(on,cn*(an-zt))},ii=64,Be=[0],nt=_t(),wt=ni(0,_t());for(let bt=1;bt<=ii;bt++)ni(bt/ii,nt),Be.push(Be[bt-1]+nt.distanceTo(wt)),wt.copy(nt);const Ut=bt=>{const Tt=bt*Be[ii];let zt=1;for(;zt<ii&&Be[zt]<Tt;)zt++;return(zt-1+(Tt-Be[zt-1])/Math.max(1e-12,Be[zt]-Be[zt-1]))/ii};for(let bt=1;bt<Ne;bt++){const Tt=bt/Ne,zt=Ut(Tt),an=De[bt],jn=1-Yt(0,1,Tt);an.c=ni(zt,_t()),an.t=ni(Math.min(1,zt+.001),_t()).sub(ni(Math.max(0,zt-.001),_t())).normalize(),an.u=an.u.clone().lerp(We.u,jn).normalize();const ks=an.ryBelow??an.ry;an.rx=At(an.rx,We.rx,jn),an.ry=At(an.ry,We.ry,jn),an.ryBelow=At(ks,We.ryBelow??We.ry,jn)}}const dt=q2*Math.max(We.rx,We.ry);let Je=0;for(let Dt=0;Je<De.length-3&&Dt<dt;Je++)Dt+=De[Je+1].c.distanceTo(De[Je].c);Bc(i,We,lt,-1,xp),Je>0&&vn(i,De.slice(0,Je+1),lt,0,0),D2(i,De[Je],lt,De[Je+1],Zr),vn(i,De.slice(Je+1),Zr,0,0)}else vn(i,De,Zr,.2,0);A("trunk",De,be.metas),$2(i,De[De.length-1],o[ae[ae.length-1]],N,p,m,(et,Ne)=>Ve(et,Ne,"muzzle",1)),i.end()}if(ne.length){const z=o[ne[ne.length-1]],ye=p(z,z.length),be=m(z,1,0,0),De=m(z,0,1,0),et=m(z,0,0,1);if(i.begin("tail-tip",s.tail),i.region=Xt["tail-tip"],s.tail==="tufted"&&Nn(i,ye.clone().addScaledVector(be,z.end.h*2),[be,De,et],[Math.max(z.length*.9,z.end.h*4),z.end.h*2.6,z.end.h*2.6],d(z.index),(Ne,Ze,dt)=>st(st(Ve(dt,Math.sin(Ne),"tail-tip",1),N.accent,.75),N.keratin,.4+.2*Math.sin(Ne*5+Ze*9)),10,6),s.tail==="club"){const Ne=Math.max(z.end.h*2.4,g*.05);Nn(i,ye.clone().addScaledVector(be,Ne*.6),[be,De,et],[Ne*1.1,Ne*.8,Ne*1.3],d(z.index),()=>N.horn,12,7);for(const Ze of[-1,1])Nn(i,ye.clone().addScaledVector(be,Ne*.6).addScaledVector(et,Ze*Ne*1.2),[be,De,et],[Ne*.55,Ne*.45,Ne*.5],d(z.index),()=>N.horn,8,4)}if(s.tail==="feather-fan"){const Ne=ap(s,g),Ze=Math.max(5,9+a.countScale.feather);for(let dt=0;dt<Ze;dt++){const Je=At(-.75,.75,dt/(Ze-1)),Dt=be.clone().multiplyScalar(Math.cos(Je)).addScaledVector(et,Math.sin(Je)).normalize(),qt=_t().crossVectors(De,Dt).normalize(),vt=Ne*(1-.18*Math.abs(Je))*(1+.24*W.jv*(Yo(W.featherSeed,dt,0)-.5)),on=Ne*.11;mp(i,ye.clone().addScaledVector(De,.004*dt*Ne/Ze),Dt,qt,[[-.02*vt,0],[.3*vt,-on*.5],[.85*vt,-on*.55],[vt,0],[.85*vt,on*.55],[.3*vt,on*.5]],Ne*.012,d(z.index),cn=>st(N.accent,N.keratin,Yt(.7,1,cn/vt)*.7))}}i.end()}const ut=(z,ye)=>{const be=X.findIndex(Ne=>Ne.bone.index===z.index),De=be>0?X[be-1].bone:void 0,et=be>=0?X[be+1]?.bone:void 0;if(ye<.5&&De){const Ne=.5*(1-Yt(0,.5,ye));return[[De.index,Ne],[z.index,1-Ne]]}if(ye>.5&&et){const Ne=.5*Yt(.5,1,ye);return[[et.index,Ne],[z.index,1-Ne]]}return[[z.index,1]]},Pt=ce.map(xo),Kt=_t(),_n=(z,ye,be)=>{Kt.copy(be).sub(z.c);const De=Kt.dot(ye.v),et=Kt.dot(ye.u),Ne=z.n??2,Ze=et<0?z.ryBelow??z.ry:z.ry;return(Math.abs(De/z.rx)**Ne+Math.abs(et/Ze)**Ne)**(1/Ne)},fn=ce.slice(0,-1).map((z,ye)=>{const be=ce[ye+1];return{c:z.c.clone().add(be.c).multiplyScalar(.5),r2:(.5*z.c.distanceTo(be.c)+2.5*Math.max(z.rx,z.ry,z.ryBelow??z.ry,be.rx,be.ry,be.ryBelow??be.ry))**2}}),sn=fn.map((z,ye)=>ye),Ln=(z,ye=sn)=>{let be=1/0;for(const De of ye){if(z.distanceToSquared(fn[De].c)>fn[De].r2)continue;const et=ce[De],Ne=ce[De+1],Ze=Kt.copy(z).sub(et.c).dot(Pt[De].t),dt=Kt.copy(z).sub(Ne.c).dot(Pt[De+1].t);if(Ze<0||dt>0)continue;const Je=Ze/Math.max(1e-12,Ze-dt);be=Math.min(be,(1-Je)*_n(et,Pt[De],z)+Je*_n(Ne,Pt[De+1],z))}return be},ht=_t(),Hi=(z,ye,be=1/0)=>{const De=xo(z),et=1.5*Math.max(z.rx,z.ry,z.ryBelow??z.ry),Ne=sn.filter(dt=>{const Je=Math.sqrt(fn[dt].r2)+et;return z.c.distanceToSquared(fn[dt].c)<=Je*Je});let Ze=0;for(let dt=0;dt<ye&&Ze<=be;dt++)Ze=Math.max(Ze,Ln(ga(z,De,ds*dt/ye,ht),Ne));return Ze},Wt=(z,ye,be,De)=>{const et=be==="leg"&&s.legs==="arthropod",Ne=be==="arm"?b.armRadial:et?b.legRadialArthropod:b.legRadial,Ze=be==="arm"?b.armRings:et?b.legRingsArthropod:b.legRings,dt=ye[0],Je=o[z.socketBone],Dt=be==="leg"?o[z.bones[z.bones.length-1]]:void 0,qt=ye.slice(1).reduce((ot,Bt)=>ot+Bt.length,0),vt=new Map;{let ot=0;for(const Bt of ye.slice(1))vt.set(Bt.index,ot),ot+=Bt.length}const on=f(dt),cn=m(dt,1,0,0),ni=u(Je).invert(),ii=f(Je),Be=mn(on.clone().sub(ii).dot(m(Je,1,0,0)),0,Je.length),nt=Be/Math.max(Je.length,1e-9),wt={w:At(Je.start.w,Je.end.w,nt),h:At(Je.start.h,Je.end.h,nt),yc:At(Je.start.yc,Je.end.yc,nt)},Ut=ot=>ot.clone().sub(ii).applyQuaternion(ni),bt=ot=>{const Bt=Ut(on.clone().addScaledVector(cn,ot)),Jt=(Bt.y-wt.yc)/wt.h,en=Bt.z/wt.w;return Jt*Jt+en*en<1};let Tt=0;if(bt(0)){let Bt=0,Jt=dt.length;for(let en=1;en<=32;en++){const ln=dt.length*en/32;if(!bt(ln)){Jt=ln;break}Bt=ln}for(let en=0;en<24;en++){const ln=(Bt+Jt)/2;bt(ln)?Bt=ln:Jt=ln}Tt=Jt}const zt=Ut(on.clone().addScaledVector(cn,Tt)),an=_t(0,(zt.y-wt.yc)/(wt.h*wt.h),zt.z/(wt.w*wt.w)).applyQuaternion(u(Je)).normalize(),jn=ot=>{const Bt=Ut(ot),Jt=(Bt.y-wt.yc)/(wt.h*wt.h),en=Bt.z/(wt.w*wt.w),ln=Math.hypot(Jt,en);return ln>1e-12?Jt/ln:0},ks=mn(Tt/dt.length,0,.9),is=dt.start,xi=dt.end,Zn=Math.max(1e-4,At((is.w+is.h)/2,(xi.w+xi.h)/2,ks)),zs=Math.max(.35,Math.abs(cn.dot(an))),sr=Tt-.3*Zn/zs,To=Math.max(sr+.6*Zn,Tt+.1*Zn),Bs=mn(To/dt.length,.01,.45),ci=Math.abs(z.socket[2])*.9,vp=wt.w*1.05-Math.abs(Ut(on).z),yp=.35*Math.max(2*Math.abs(z.socket[2]),1e-6),Sp=be==="leg"&&(s.legs==="unguligrade"||s.legs==="digitigrade"),fu=new WeakMap,pu=(ot,Bt,Jt,en,ln,Tn,_i)=>{let En=fu.get(ot);if(!En){const Vc=ot.t.clone().normalize(),Mu=ot.u.clone().addScaledVector(Vc,-ot.u.dot(Vc)).normalize();En={u:Mu,v:_t().crossVectors(Mu,Vc)},fu.set(ot,En)}const hi=z2(Tn,ot.rx,ot.ry,ot.ryBelow),si=qo(Tn,ot.rx,ot.ry,ot.ryBelow),Vn=En.v.z*hi+En.u.z*si,Li=En.v.y*hi+En.u.y*si,ms=-z.side*Vn;let bi=mn(.35-.9*ms+.5*Li,-1,1);ln>0&&(bi=At(bi,jn(_i),ln));const bu=Ve(_i,bi,Bt,Jt,en);return et&&s.palette==="ink"?st(bu,N.accent,.85):bu},_a=it(ye.map(ot=>({bone:ot,reversed:!1})),{ringsFor:()=>Ze,endBone:Dt?.index,rootF:Bs,dress:(ot,Bt)=>{const{bone:Jt,f:en,sec:ln}=Bt,Tn=ye.indexOf(Jt),_i=Tn===0?"limb-upper":"limb-lower",En=Tn===0?en:((vt.get(Jt.index)??0)+en*Jt.length)/Math.max(qt,1e-9);Bt.region=_i,Bt.along=En,ot.region=Xt[_i];let hi=1;et||(Tn===0&&(hi+=.45*(1-Yt(.25,.75,en))),Tn===1&&(hi+=.12*Vo(en,.45,.15)),Tn>=1&&(hi+=(s.legs==="pillar"?.04:.12)*(1-Yt(.03,.14,en))));let si=Math.min(ln.w*(1+.8*(hi-1)),ln.w+yp);const Vn=ln.h*hi;Tn===0&&(si=Math.min(si,Math.max(ln.w,vp))),Tn===0&&Math.abs(m(Jt,0,0,1).z)>.7&&Math.abs(m(Jt,1,0,0).y)>.6&&(si=Math.min(si,Math.max(ci,.55*ln.w))),ot.rx=si,ot.ry=Vn,ot.ryBelow=Vn;const Li=Tn===0?1-Yt(0,.3,en):0;ot.color=(ms,bi)=>pu(ot,_i,En,Bt.fp,Li,ms,bi)},after:(ot,Bt)=>{Sp&&ye.indexOf(Bt.bone)>=1&&(ot.rx=(ot.ry+(ot.ryBelow??ot.ry))/(2*1.3))}}),li=_a.rings[0],Ep=_a.metas[0],mu=an.clone().addScaledVector(li.t,-an.dot(li.t)),ba=mu.lengthSq()>.01?mu.normalize():void 0,wp=ut(Je,nt),gu=[],xu=[],Tp=[[0,1,.18],[1/3,.7,.12],[2/3,.35,.06]],Ap=(ot,Bt)=>{const Jt={c:on.clone().addScaledVector(cn,ot),t:cn.clone(),u:li.u.clone(),rx:li.rx*Bt,ry:li.ry*Bt,ryBelow:(li.ryBelow??li.ry)*Bt,w:[],color:()=>[0,0,0]};return ba&&(Jt.squash=[ba,.4]),Jt};let wr=sr,Ma=1.15;if(Number.isFinite(Ln(on.clone().addScaledVector(cn,sr)))){const ot=(Jt,en)=>Hi(Ap(Jt,en),Ne,.96)<=.96;let Bt=0;for(;Bt<8&&!ot(wr,Ma);)Bt++,wr=sr-Bt*.15*Zn;if(!ot(wr,Ma)){let Jt=.3,en=1.15;for(let ln=0;ln<8;ln++){const Tn=(Jt+en)/2;ot(wr,Tn)?Jt=Tn:en=Tn}Ma=Jt}}for(const[ot,Bt,Jt]of Tp){const en=ot===0?Ma:At(1.15,1,ot),ln=on.clone().addScaledVector(cn,wr).lerp(li.c,ot),Tn=cn.clone().lerp(li.t,ot).normalize(),_i=[...wp.map(([si,Vn])=>[si,Vn*Bt]),[dt.index,1-Bt]],En={c:ln,t:Tn,u:li.u.clone(),rx:li.rx*en,ry:li.ry*en,ryBelow:(li.ryBelow??li.ry)*en,w:_i,region:Xt["limb-upper"],color:()=>[0,0,0]};ba&&(En.squash=[ba,.4*(1-ot)]);const hi={kind:"root",bone:dt,k:0,f:At(wr,To,ot)/dt.length,sec:Ep.sec,fp:0,along:0,region:"limb-upper"};En.color=(si,Vn)=>jt(pu(En,"limb-upper",0,hi.fp,1,si,Vn),1-Jt*(.5+.5*Yt(.2,-.6,jn(Vn)))),gu.push(En),xu.push(hi)}const Tr=[...gu,..._a.rings],_u=[...xu,..._a.metas],Rp=m(Je,0,0,1);for(const ot of Tr){const Bt=Ln(ot.c);if(!(Bt<1)||Hi(ot,Ne,.97)<=.97)continue;const Jt=Ut(ot.c).z,en=Rp.clone().multiplyScalar(-Math.sign(Jt)||0),ln=ot.c.clone(),Tn=ot.rx,_i=(Vn,Li)=>(ot.c.copy(ln).addScaledVector(en,Vn),ot.rx=Tn*Li,Hi(ot,Ne,.97)<=.97);let En=.8*Math.abs(Jt),hi=1;if(_i(En,1)){let Vn=0,Li=En;for(let ms=0;ms<8;ms++){const bi=(Vn+Li)/2;_i(bi,1)?Li=bi:Vn=bi}En=Li}else if(_i(En,.5)){let Vn=.5,Li=1;for(let ms=0;ms<8;ms++){const bi=(Vn+Li)/2;_i(En,bi)?Vn=bi:Li=bi}hi=Vn}else{ot.c.copy(ln),ot.rx=Tn;continue}const si=Bt<.9?1:(1-Bt)/.1;ot.c.copy(ln).addScaledVector(en,En*si),ot.rx=Tn*At(1,hi,si)}se(Tr,_u,Ne);const Cp=t&&be==="leg"&&["pad","hoof","claw"].includes(s.feet);return vn(i,Tr,Ne,.1,Cp?0:be==="arm"?.3:.4),A(De,Tr,_u),{ring:Tr[Tr.length-1],radial:Ne}};for(const z of n.limbs){const ye=o[z.socketBone],be=`${z.side<0?"L":"R"}`;if(z.kind==="leg"){const De=`leg ${z.pair+1}${be}`;i.begin("leg",De),i.region=Xt["limb-upper"];const et=i.nv,Ne=o[z.bones[z.bones.length-1]],Ze=Wt(z,z.bones.slice(0,z.segments.length).map(Dt=>o[Dt]),"leg",De);i.end(),i.begin("foot",`${s.feet} ${z.pair+1}${be}`),i.region=Xt.foot;const dt=i.nv,Je=Dt=>Ve(Dt,0,"foot",1);if(t&&(s.feet==="pad"||s.feet==="hoof"||s.feet==="claw")?pS(i,s.feet,Ne,z.footHeight,z.footLength,z.side,Ze,N,p,m,Je,n.phenotype?.dimensions):mS(i,s.feet,Ne,o[z.bones[z.bones.length-2]],z.footHeight,z.footLength,z.side,N,p,m,Je),n.phenotype&&s.feet==="paw"){const Dt=f(Ne),qt=m(Ne,0,0,1),vt=_t();let on=1/0,cn=-1/0;for(let Be=dt;Be<i.nv;Be++){const nt=vt.fromArray(i.p,Be*3).sub(Dt).dot(qt);on=Math.min(on,nt),cn=Math.max(cn,nt)}const ni=n.phenotype.dimensions.footWidth/(cn-on),ii=(on+cn)/2;for(let Be=dt;Be<i.nv;Be++){vt.fromArray(i.p,Be*3);const nt=vt.clone().sub(Dt).dot(qt);vt.addScaledVector(qt,(nt-ii)*ni-nt),i.p.set([vt.x,vt.y,vt.z],Be*3)}}i.end(),fS(i,et,Ne,z.footHeight,z.footExtent)}else z.kind==="arm"?(i.begin("arm",`arm ${be}`),i.region=Xt["limb-upper"],Wt(z,z.bones.slice(0,2).map(De=>o[De]),"arm",`arm ${be}`),i.end(),i.begin("hand",`${s.hands} ${be}`),i.region=Xt.foot,gS(i,s.hands,o[z.bones[1]],o[z.bones[2]],o[z.bones[3]],z.side,N,p,m,De=>Ve(De,0,"foot",1)),i.end()):(i.begin("wing",`${s.wings} wing ${be}`),i.region=Xt.wing,xS(i,n,z.bones.map(De=>o[De]),ye,z.side,N,p,m,(De,et)=>Ve(De,.6,"wing",et)),i.end())}s.armor!=="none"&&(i.begin("armor",s.armor),i.region=Xt.armor,_S(i,n,N,p,m,c,W),i.end()),i.end();const Yn=new Float32Array(i.p.subarray(0,i.nv*3)),Ci=i.c.slice(0,i.nv*3),ts=i.si.slice(0,i.nv*4),fs=i.sw.slice(0,i.nv*4),Qt=i.ix.slice(0,i.ni),wn=i.rg.slice(0,i.nv),ns=i.gl.slice(0,i.nv),pn={...D,scale:B},Fs=Ee?{version:v2,pattern:Ee,code:gf.indexOf(Ee)+1,genome:pn,seed:Lv(pn.seed)>>>0,cellsPerBody:go[Ee]*pn.scale,threshold:pn.threshold,warp:pn.warp,bellyLine:pn.bellyLine,frame:{origin:[me.x,me.y],forward:[U.x,U.y],scale:x,...n.phenotype?{phase:ee,lateral:P}:{}}}:null;let ps=null;if(Ee){const z=new Float32Array(i.nv*4);for(let ye=0;ye<i.nv;ye++){if(i.own[ye]){for(let et=0;et<4;et++)z[ye*4+et]=i.cq[ye*6+et];continue}const be=i.p[ye*3]-me.x,De=i.p[ye*3+1]-me.y;z[ye*4]=(be*U.x+De*U.y)/x+ee,z[ye*4+1]=(De*U.x-be*U.y)/x,z[ye*4+2]=i.p[ye*3+2]/x*P,z[ye*4+3]=0}ps={c0:i.l0.slice(0,i.nv*3),c1:i.l1.slice(0,i.nv*3),c2:i.l2.slice(0,i.nv*3),sample:z}}const xa=R2(Yn,Qt,ts,fs,i.hid.subarray(0,i.ni/3),A2(i.parts,Qt,i.nv)),du={version:t?M2:b2,positions:Yn,normals:xa,colors:Ci,skinIndex:ts,skinWeight:fs,index:Qt,regions:wn,gloss:ns,eyeFallbacks:ct.fallbacks,parts:i.parts,vertexCount:Yn.length/3,triangleCount:Qt.length/3,coatScale:{pattern:D.pattern,requested:B,effective:D.scale},coatCrisp:Fs,coatLayers:ps};return e.debug&&(du.debug={rings:h,splineFallbacks:M,coat:{pattern:D.pattern,requestedScale:B,effectiveScale:D.scale,cellsPerBody:Ke,meanCellDiameter:Ke>0?x/(Ke*D.scale):1/0,torsoEdgeEstimate:tt},traitsNeutral:a.neutral,coatVertex:Ee?{own:i.own.slice(0,i.nv),sample:i.cq.slice(0,i.nv*6)}:null,hiddenTriangles:i.hid.slice(0,i.ni/3),blendUnfolded:_,eyes:ct.eyes,eyeColours:{eye:ct.colours.eye,iris:ct.colours.iris,lidFactor:ct.colours.lidFactor,compound:ct.colours.compound??null}}),du}function B2(n,e){if(e.neutral)return n.bodyLength;const t=n.variability,i=n.dimorphism,s=n.maturity,r=(1+.045*t*e.size)*(e.sex==="male"?1+.1*i:1)*(.45+.55*s);return Math.round(n.bodyLength/r*100)/100}const wc=[.008,.008,.01],bn=n=>.2126*n[0]+.7152*n[1]+.0722*n[2],Kr=Object.freeze({min:.03,overSkin:2,tint:[.36,.13,.05]}),gp=Object.freeze({overPupil:10,overLid:1.8,maxIrisGain:4,lid:.35,outerLid:.7});function V2(n,e,t,i,s){const r=Dc(n.head),o=e.headLength,a=e.snoutLength,l=r==="muzzle"||r==="jaws"?.4*o:1/0,c=m=>m>=l?"muzzle":"head",u=r==="flat-face"?o+a:.4*o+a,f=m=>m>=l?mn((m-l)/Math.max(a,.001),0,1):mn(m/u,0,1);return{region:c,along:f,col:(m,g,x)=>{const d=c(m),h=f(m),M=ds*.5*(g+x)/i/s;return(_,b)=>t(b,qo(_,g,x),d,h,M)},radial:i}}function H2(n,e,t,i,s,r,o,a,l,c,u,f){const p=e.recipe,m=e.dims,g=m.headLength,x=m.craniumWidth,d=m.craniumHeight,h=m.snoutLength,M=c.traits,_=Dc(p.head),b=tu(p);let S=null;const v=r(t,1,0,0),E=r(t,0,1,0),R=r(t,0,0,1),w=[[t.index,1]],T=o.radial,C=(N,te,q,fe,re)=>({c:s(t,N,fe),t:v,u:E,rx:te,ry:q,w,color:re??o.col(N,te,q),region:Xt[o.region(N)]}),I=()=>({...C(a.x,a.w,a.h,a.yc),w:l}),F=n.parts.length,V=jt(i.skin,.22),W=st(i.skin,[0,0,0],.7);n.begin("head",p.head),n.region=Xt.head;let D=.4*g+h,B=-.2*d,G=.5*d;const Y=e.phenotype?e.phenotype.dimensions.earLength/(g*(p.head==="proboscis"?kh.length:.34)):M.earScale;if(p.head==="proboscis"){const N=sp("proboscis",{headLength:g,craniumWidth:x,craniumHeight:d,snoutLength:h}),te=e.chains.trunk[0],q=N.x-.4*g,fe=te!==void 0?[[t.index,.7],[te,.3]]:w,re=[I(),C(.36*g,.92*x,.9*d,-.04*d)],ne=4;for(let K=1;K<=ne;K++){const he=K/ne,ae=1-(1-he)**4,ge=C(.4*g+q*he,At(.84*x,N.w,ae),At(.86*d,N.h,ae),At(-.06*d,N.y,ae));K===ne&&(ge.w=fe),re.push(ge)}vn(n,re,T,.2,te!==void 0?0:.45,1),te!==void 0&&(S=re[re.length-1],Bc(n,S,T,1,xp)),D=N.x,B=N.y,G=N.h,n.begin("head",`${p.head} ears`),n.region=Xt.ear;for(const K of Y>0?[-1,1]:[]){const he=kh.flare*Math.PI/180,ae=v.clone().multiplyScalar(Math.cos(he)).addScaledVector(R,-K*Math.sin(he)).normalize(),ge=R.clone().multiplyScalar(K*Math.cos(he)).addScaledVector(v,Math.sin(he)).normalize(),H=s(t,.02*g,.4*d,K*.9*x).addScaledVector(ae,.06*g*Y).addScaledVector(E,-.1*g*Y).addScaledVector(ge,-.02*g*Y);Y2(n,H,ae.clone().negate(),E,ge,g*Y,w,(de,J)=>st(u(J,.4,"ear",de),i.skin,.2))}n.begin("mouth","lower lip"),n.region=Xt.muzzle,Nn(n,s(t,N.x-.05*g,N.y-N.h+.02*d,0),[v,E,R],[.12*g,.08*d,.28*x],w,()=>st(i.skin,[0,0,0],.45),8,4)}else if(_==="muzzle"||_==="jaws"){const N=_==="jaws",te=N?.82:1,q=[I(),C(.36*g,.92*x,.88*d*te,-.06*d)],fe=4;for(let ne=1;ne<=fe;ne++){const K=ne/fe,he=.4*g+h*K,ae=At(.8,N?.5:.48,K)*x,ge=At(.82,N?.36:.52,K)*d,H=o.col(he,ae,ge),de=(J,me)=>{const U=H(J,me);return Math.abs(Math.sin(J)+(N?.25:.35))<(N?.07:.05)&&Math.abs(Math.cos(J))>.5?i.keratin:N?U:K>.75?st(U,i.skin,.6):U};q.push(C(he,ae,ge,At(-.08,N?-.12:-.24,K)*d,de))}const re=n.ni/3;if(vn(n,q,T,.2,N?.55:.45,1),B=(N?-.12:-.24)*d,G=(N?.36:.52)*d,n.region=Xt.muzzle,!N){const ne=Fl(n,t,re,n.ni/3);n.begin("head",`${p.head} nostrils`),n.region=Xt.muzzle;for(const K of[-1,1]){const he=B+.15*d,ae=K*.18*x,ge=$r(ne,[D,he,ae],[1,0,0]),H=(ge?ge.point[0]:D+.035*g)-.03*g+K2*g;Nn(n,s(t,H,he,ae),[v,E,R],[.03*g,.06*d,.06*x],w,()=>V,6,3)}}if(N)for(const ne of[-1,1])for(let K=0;K<6;K++){const he=.15+.13*K,ae=.4*g+h*he,ge=At(.8,.5,he)*x*.93,H=At(-.08,-.12,he)*d-At(.82,.36,he)*d*.25;An(n,[s(t,ae,H,ne*ge),s(t,ae+.01*g,H-.07*d,ne*ge*.97)],[.028*d,.004*d],[w,w],()=>[.92,.9,.82],5,.2,.1)}if(!N){const ne=b.built==="ossicones"||b.built==="paired";n.begin("head",`${p.head} ears`),n.region=Xt.ear;for(const K of Y>0?[-1,1]:[]){const he=ne?s(t,-.06*g,.55*d,K*.62*x):s(t,.04*g,.75*d,K*.55*x),ae=ne?E.clone().multiplyScalar(.45).addScaledVector(R,K*.85).addScaledVector(v,-.25).normalize():E.clone().multiplyScalar(.8).addScaledVector(R,K*.6).addScaledVector(v,-.25).normalize();Nn(n,he.clone().addScaledVector(ae,.16*g*Y),[ae,v.clone().negate(),R],[.18*g*Y,.03*g*Y,.09*g*Y],w,(ge,H,de)=>st(u(de,.4,"ear",H),i.skin,.25),8,4)}}}else if(_==="beak"){vn(n,[I(),C(.4*g,.62*x,.66*d,.02*d)],T,.2,.3,1);const N=Math.max(h,.15*g),te=6,q=[],fe=[];for(let re=0;re<=te;re++){const ne=re/te,K=.36*g+N*ne,he=N<.35*g?Yt(.6,1,ne)*.18:0;q.push(C(K,At(.55,.06,Math.pow(ne,.8))*x,At(.42,.05,Math.pow(ne,.9))*d,(.08-.12*ne-he)*d,()=>i.keratin)),ne<=.85&&fe.push(C(K,At(.45,.08,ne/.85)*x,At(.22,.04,ne/.85)*d,(-.3-.02*ne)*d,()=>st(i.keratin,[0,0,0],.25)))}n.region=Xt.muzzle;for(const re of[...q,...fe])re.region=Xt.muzzle;vn(n,q,12,.2,.3),vn(n,fe,10,.2,.3),D=.36*g+N,B=-.05*d,G=.1*d}else if(_==="flat-face"){const N=K=>(he,ae)=>Math.sin(he)<.2?i.skin:K(he,ae);vn(n,[I(),C(.4*g,.86*x,.86*d,-.02*d,N(o.col(.4*g,.86*x,.86*d))),C(.48*g,.55*x,.5*d,-.1*d,()=>i.skin)],T,.2,.45,1);const te=Math.max(.05*g,h*.6),q=K=>Math.abs(Math.sin(K)+.38)<.07?jt(i.keratin,.5):i.skin,fe=n.ni/3;vn(n,[C(.36*g,.55*x,.45*d,-.4*d,q),C(.36*g+te,.42*x,.34*d,-.42*d,q)].map(K=>({...K,region:Xt.muzzle})),14,.3,.6);const re=Fl(n,t,fe,n.ni/3),ne=$r(re,[.36*g,-.2*d,0],[1,0,0]);n.region=Xt.muzzle,Nn(n,s(t,(ne?ne.point[0]:.36*g+te)-.02*g,-.2*d,0),[v,E,R],[.05*g,.05*d,.12*x],w,()=>jt(i.skin,.6),10,3),n.region=Xt.head,n.begin("head",`${p.head} brow`),Nn(n,s(t,.42*g,.32*d,0),[v,E,R],[.08*g,.09*d,.9*x],w,()=>st(i.base,i.keratin,.3),12,4),n.begin("head",`${p.head} ears`),n.region=Xt.ear;for(const K of[-1,1])Nn(n,s(t,.12*g,0,K*.96*x),[v,E,R],[.08*g*Y,.2*d*Y,.05*x*Y],w,()=>i.skin,8,4);D=.36*g+te,B=-.42*d,G=.34*d}else if(_==="blunt"){const N=.6*g+h*.3,te=o.col(N,.75*x,.75*d),q=n.ni/3;vn(n,[I(),C(N,.75*x,.75*d,0,(ae,ge)=>st(te(ae,ge),i.skin,.5))],T,.2,.75,1);const fe=Fl(n,t,q,n.ni/3);n.begin("mouth","mouth disc"),n.region=Xt.muzzle;const re=4,ne=20,K=Z2*g,he=(ae,ge)=>{if(bc(p)===1&&M.neutral){const U=$r(fe,[N,ae,ge],[1,0,0]);if(!U)return s(t,N+.72*x+K,ae,ge);const ee=U.normal[0]<0?-1:1;return s(t,U.point[0]+ee*U.normal[0]*K,U.point[1]+ee*U.normal[1]*K,U.point[2]+ee*U.normal[2]*K)}Math.abs(ge)<1e-12*g&&(ge=0);const H=ma(fe,[N,ae,ge],[1,0,0]).filter(U=>U.t>1e-9),de=H[0],J=de?H.filter(U=>Math.abs(U.t-de.t)<=1e-9).sort((U,ee)=>U.tri-ee.tri)[0]:null;if(!J)return s(t,N+.72*x+K,ae,ge);const me=J.normal[0]<0?-1:1;return s(t,J.point[0]+me*J.normal[0]*K,J.point[1]+me*J.normal[1]*K,ge===0?0:J.point[2]+me*J.normal[2]*K)};if(bc(p)===1){const ae=n.v(he(0,0),W,w),ge=[];for(let H=1;H<=re;H++){const de=H/re,J=[];for(let me=0;me<ne;me++){const U=ds*me/ne;J.push(n.v(he(Math.sin(U)*.32*d*de,Math.cos(U)*.32*x*de),W,w))}ge.push(J)}for(let H=0;H<ne;H++)n.to(ae,ge[0][H],ge[0][(H+1)%ne],v);for(let H=0;H+1<re;H++)for(let de=0;de<ne;de++){const J=ge[H][de],me=ge[H][(de+1)%ne],U=ge[H+1][de],ee=ge[H+1][(de+1)%ne];n.to(J,U,me,v),n.to(me,U,ee,v)}}else{const ae=_p,ge=ae.halfWidth*x,H=ae.columns,de=[],J=(ie,_e)=>st(te(Math.asin(mn(ie/(.75*d),-1,1)),_e),i.skin,.5),me=(ie,_e,xe,Z)=>{const Re=he(ie,_e);return n.v(Re,eS(J(ie,Re),xe,Z),w)},U=me(ae.y*d,-ge,0,0),ee=me(ae.y*d,ge,0,0);for(let ie=1;ie<H;ie++){const _e=2*ie/H-1,xe=Math.sqrt(1-_e*_e),Z=_e*ge,Re=(ae.y-ae.droop*xe)*d,oe=ae.halfHeight*d*xe;de.push(ae.rows.map((Ee,ze)=>me(Re+Ee*oe,Z,ze,xe)))}const P=ae.rows.length;for(let ie=0;ie+1<P;ie++){n.to(U,de[0][ie],de[0][ie+1],v),n.to(ee,de[H-2][ie],de[H-2][ie+1],v);for(let _e=0;_e+1<H-1;_e++){const xe=de[_e][ie],Z=de[_e][ie+1],Re=de[_e+1][ie],oe=de[_e+1][ie+1];n.to(xe,Re,Z,v),n.to(Z,Re,oe,v)}}}D=.6*g+h*.3+.7*x,B=0,G=.5*d}else{vn(n,[I(),C(.3*g,x,d,0),C(.75*g,.8*x,.75*d,-.1*d)],T,.2,.5,1);const N=Math.max(.25*g,h*1.1);for(const te of[-1,1]){const q=[0,.35,.7,1].map(re=>s(t,.72*g+N*re,-.25*d,te*At(.55,.05,re*re)*x));n.region=Xt.muzzle,An(n,q,[.16*x,.12*x,.08*x,.01*x],q.map(()=>w),()=>i.keratin,7,.3,.1,.7);const fe=[0,.25,.5,.75,1].map(re=>s(t,.6*g+1.5*g*re,.45*d+.8*g*re*(1-.4*re),te*(.4*x+.55*g*re)));n.region=Xt.ear,An(n,fe,[.07,.06,.05,.04,.02].map(re=>re*x*M.earScale),fe.map(()=>w),re=>re%2?i.accent:i.keratin,5,.2,.2)}D=.72*g+N,B=-.25*d,G=.3*d}if(n.end(),nS(n,e,t,i,s,o,c,u,f,F),b.built!=="none"){const N=b.built==="crest"&&p.head==="beak",te=b.built==="crest"?J2(n,t,F,N?"blend":"all"):null,q=N?-.5*d:.3*d,fe=(J,me)=>{const U=te&&$r(te,[J,2*d,0],[0,-1,0]);return U&&U.point[1]>=q&&U.point[1]<=1.2*d?U.point[1]:me};n.begin("horn",N?"casque":b.built),n.region=Xt.horn;const re=Math.hypot(.05*g,.25*d,.3*x)+Math.hypot(.12*g,.3*d,.3*x)+Math.hypot(.03*g,.5*d,.05*x)+Math.hypot(.1*g,.35*d,.2*x),ne=e.phenotype&&b.built==="paired"?e.phenotype.dimensions.hornLength/re:M.hornScale,K=M.hornCurl,he=M.hornAsym,ae=.5+.5*ne,ge=(J,me,U)=>st(u(U,1,"horn",J/me),i.keratin,.35+.65*J/me),H=(J,me,U,ee)=>ee===0?J:J.map((P,ie)=>ie===0?P:P.clone().sub(me).applyAxisAngle(U,ee*ie/(J.length-1)).add(me)),de=(J,me)=>me===1?J:J.map((U,ee)=>ee===0?U:U.clone().sub(J[0]).multiplyScalar(me).add(J[0]));if(b.built==="nasal"){const J=.4*g+h*.65,me=(_==="muzzle"?-.24*d*.65:B)+G*.9+.05*d,U=.5*g*ne,ee=s(t,J,me,0),P=H([0,.33,.66,1].map(Z=>s(t,J+U*(.12*Z-.25*Z*Z),me+U*Z,0)),ee,R,-K);An(n,[s(t,J,me-.12*d,0),...P],[.15*g,.14*g,.1*g,.05*g,.008*g].map(Z=>Z*ae),[w,w,w,w,w],(Z,Re,oe)=>ge(Z,4,oe),10,.2,.15);const ie=J-.25*g,_e=me+.08*d,xe=ne*(1+he);An(n,[s(t,ie,_e-.1*d,0),s(t,ie+.02*g*xe,_e+.12*g*xe,0),s(t,ie-.02*g*xe,_e+.22*g*xe,0)],[.09*g,.06*g,.008*g].map(Z=>Z*(.5+.5*xe)),[w,w,w],(Z,Re,oe)=>ge(Z,2,oe),8,.2,.15)}else if(b.built==="paired")for(const J of[-1,1]){const me=ne*(1+J*he),U=[_t(.05,.7,.55),_t(0,.95,.85),_t(-.12,1.25,1.15),_t(-.15,1.75,1.2),_t(-.05,2.1,1)].map(P=>s(t,(P.x+Nl[0])*g,(P.y+Nl[1])*d,J*(P.z+Nl[2])*x)),ee=H(de(U,me),U[0],R,-K*J);An(n,ee,[.1*g,.08*g,.06*g,.035*g,.006*g].map(P=>P*(.5+.5*me)),ee.map(()=>w),(P,ie,_e)=>ge(P,4,_e),9,.2,.15)}else if(b.built==="ossicones")for(const J of[-1,1]){const me=ne*(1+J*he),U=s(t,.02*g,.8*d,J*.35*x),[,ee]=H(de([U,s(t,-.03*g,.8*d+.32*g,J*.42*x)],me),U,R,-K);An(n,[U,ee],[.055*g,.045*g].map(P=>P*(.5+.5*me)),[w,w],(P,ie,_e)=>st(u(_e,Math.sin(ie),"head",.2),i.accent,.3),9,.2,.2),Nn(n,ee,[v,E,R],[.06*g,.06*g,.06*g].map(P=>P*(.5+.5*me)),w,()=>i.keratin,8,4)}else if(N){const J=Math.max(h,.15*g),me=.26*g,U=.36*g+.6*J,ee=Math.max(.5*d,.25*g)*ne*.32,P=.04*d,ie=st(i.horn,i.accent,.25),_e=[.45,1,.8,.3],xe=[.24,.3,.26,.14],Z=[];_e.forEach((Re,oe)=>{const Ee=At(me,U,oe/3),ze=fe(Ee,.5*d)-P,Ve=(ee*Re+P)/2;Z.push({c:s(t,Ee,ze+Ve,0),t:v,u:E,rx:xe[oe]*x,ry:Ve,w,color:()=>ie,region:Xt.horn})}),vn(n,Z,8,.3,.3)}else if(b.built==="crest"){const J=Math.max(.5*d,.25*g)*ne,U=[[-.12,.15],[.05,.9],[.22,1],[.42,.45],[.5,.15]].map(([ee,P])=>{const ie=ee*g,_e=fe(ie,.72*d)-yf*g,xe=(J*P+yf*g)/2;return{c:s(t,ie,_e+xe,0),t:v,u:E,rx:Q2*x,ry:xe,w,color:Z=>st(i.accent,i.plate,.6*mn(.5+.5*Math.sin(Z),0,1)*P),region:Xt.horn}});vn(n,U,8,.3,.3)}n.end()}return S}const Mf=1.2,G2=1.3,W2=2*Math.PI/180,X2=Math.log(1.08),q2=.5,Zr=16,xp=.96,vf=[.08,6],kh=Object.freeze({flare:22,length:.44,top:.15,lobe:.3,root:.05,rim:.012,bow:.035,segments:12,stations:10});function Y2(n,e,t,i,s,r,o,a){const l=kh,c=[],u=(f,p)=>Math.pow(Math.max(0,Math.sin(Math.PI*f)),p);for(let f=0;f<=l.stations;f++){const p=f/l.stations,m=u(Math.min(1,.08+.92*p),.6),g=(.035+l.top*u(Math.min(1,p*1.15),.7))*Math.max(0,1-Math.pow(p,6)),x=-(.035+l.lobe*u(Math.pow(p,.75),.8))*Math.max(0,1-Math.pow(p,6)),d=Math.max(.004,(g-x)/2),h=l.rim+(l.root-l.rim)*Math.pow(1-p,3),M=e.clone().addScaledVector(t,l.length*p*r).addScaledVector(i,(g+x)/2*r).addScaledVector(s,l.bow*m*r);c.push({c:M,t,u:i,rx:Math.min(h,d)*r,ry:d*r,w:o,color:(_,b)=>a(p,b)})}vn(n,c,l.segments,.3,.3)}const j2=Object.freeze({bulb:[[.16,1.05],[.3,1.1],[.42,1.04],[.51,.9]],flare:1.1,faceAt:.56,face:.62,nostril:.22,nostrilTall:1.35,nostrilZ:.3,nostrilY:.02,finger:[.38,.8,.36,.26,.3],lipTone:[.66,.52,.48],lipMix:0,faceDark:.35});function $2(n,e,t,i,s,r,o){const a=j2,l=Math.max(e.rx,e.ry),c=r(t,1,0,0),u=r(t,0,1,0),f=r(t,0,0,1),p=[[t.index,1]],m=s(t,t.length),g=(T,C)=>st(o(C,Math.sin(T)),a.lipTone,a.lipMix),x=st(st(i.skin,[.62,.48,.45],.3),[0,0,0],a.faceDark),d=(T,C,I)=>({c:m.clone().addScaledVector(c,T*l),t:c,u,rx:C*l,ry:C*l,w:p,color:I}),M=[{...e,w:p},...a.bulb.map(([T,C])=>d(T,C,(I,F)=>st(o(F,Math.sin(I)),a.lipTone,a.lipMix*Math.min(1,T/a.bulb[1][0])))),d(a.faceAt,a.face,()=>x)];vn(n,M,Zr,0,0),Bc(n,M[M.length-1],Zr,1);const _=jt(i.skin,.1),b=m.clone().addScaledVector(c,a.faceAt*l);for(const T of[-1,1]){const C=b.clone().addScaledVector(f,T*a.nostrilZ*l).addScaledVector(u,a.nostrilY*l),I=[];for(let W=0;W<8;W++){const D=ds*W/8;I.push(n.v(C.clone().addScaledVector(u,Math.cos(D)*a.nostril*a.nostrilTall*l).addScaledVector(f,Math.sin(D)*a.nostril*l).addScaledVector(c,.012*l),_,p))}const F=n.v(C.clone().addScaledVector(c,.012*l),_,p),V=n.v(C.clone().addScaledVector(c,-.02*l),_,p);for(let W=0;W<8;W++)n.to(F,I[W],I[(W+1)%8],c),n.to(V,I[W],I[(W+1)%8],c.clone().negate())}const[S,v,E,R,w]=a.finger;Nn(n,m.clone().addScaledVector(c,S*l).addScaledVector(u,v*l),[c,u,f],[E*l,R*l,w*l],p,(T,C,I)=>g(T,I),10,5)}const K2=.012,Z2=.0035,Nl=[.11,.1,-.07],Q2=.09,yf=.01;function J2(n,e,t,i){const s=new dn(...e.restQuaternion).invert(),r=_t(...e.restPosition),o=_t(),a=[],l=c=>{for(let u=0;u<4;u++)if(n.si[c*4+u]===e.index&&n.sw[c*4+u]>0)return!0;return!1};return n.parts.forEach((c,u)=>{const f=u>=t;if(!(f?c.part!=="head"||c.label.endsWith("ears"):c.part!=="torso")){for(let p=c.firstTriangle*3;p<(c.firstTriangle+c.triangles)*3;p+=3)if(!(!f&&i==="blend"&&!l(n.ix[p])&&!l(n.ix[p+1])&&!l(n.ix[p+2])))for(let m=0;m<3;m++){const g=n.ix[p+m];o.set(n.p[g*3],n.p[g*3+1],n.p[g*3+2]).sub(r).applyQuaternion(s),a.push(o.x,o.y,o.z)}}}),new Float64Array(a)}const _p=Object.freeze({halfWidth:.3,y:-.04,droop:.06,halfHeight:.07,columns:12,rows:[1,.45,0,-.45,-1],slit:[.55,.16,.15],toSlit:.6,lip:[.85,.42,.4],toLip:.55,floor:.85,lipFloor:1});function eS(n,e,t){const i=_p,s=e===0||e===i.rows.length-1,r=i.rows[e]===0;if(s)return n;const o=r?st(n,i.slit,i.toSlit*Math.sqrt(t)):st(n,i.lip,i.toLip*t),a=(r?i.floor:1+(i.lipFloor-1)*t)*bn(n),l=bn(o);return l<a&&l>0?jt(o,a/l):o}function bp(n,e,t,i){return n==="beak"?[.2*e,.3*t,.86*i]:n==="flat-face"?[.43*e,.06*t,.42*i]:n==="jaws"?[.24*e,.52*t,.72*i]:[.3*e,.38*t,.8*i]}const ta=5,tS=35;function nS(n,e,t,i,s,r,o,a,l,c){const u=e.recipe,f=e.dims,p=f.headLength,m=f.craniumWidth,g=f.craniumHeight,x=f.snoutLength,d=o.traits,h=Dc(u.head),M=Mc({...u,bodyLength:l.speciesBodyLength}),_=d.eyeScale*d.allometry.eyeRel,b=new dn(...t.restQuaternion),S=b.clone().invert(),v=_t(...t.restPosition),E=_t(),R=[],w=[],T=q=>{for(let fe=0;fe<4;fe++)if(n.si[q*4+fe]===t.index&&n.sw[q*4+fe]>0)return!0;return!1};for(const q of n.parts){const fe=n.parts.indexOf(q)>=c;if(!(fe?q.part!=="head"||q.label.endsWith("ears"):q.part!=="torso")){for(let re=q.firstTriangle*3;re<(q.firstTriangle+q.triangles)*3;re+=3)if(!(!fe&&!T(n.ix[re])&&!T(n.ix[re+1])&&!T(n.ix[re+2])))for(let ne=0;ne<3;ne++){const K=n.ix[re+ne];E.set(n.p[K*3],n.p[K*3+1],n.p[K*3+2]).sub(v).applyQuaternion(S),R.push(E.x,E.y,E.z),w.push(K)}}}const C=new Float64Array(R),I=(q,fe,re)=>s(t,q,fe,re),F=_t(0,1,0).applyQuaternion(S),V=[F.x,F.y,F.z],W=q=>{const fe=q.tri*3,re=1-q.u-q.v,ne=w[fe]*3,K=w[fe+1]*3,he=w[fe+2]*3;return[0,1,2].map(ae=>re*n.c[ne+ae]+q.u*n.c[K+ae]+q.v*n.c[he+ae])};let D=null;const B=(q,fe)=>{if(!D){D=new Map;for(let ae=0;ae+8<C.length;ae+=9){const ge=C[ae+3]-C[ae],H=C[ae+4]-C[ae+1],de=C[ae+5]-C[ae+2],J=C[ae+6]-C[ae],me=C[ae+7]-C[ae+1],U=C[ae+8]-C[ae+2],ee=[H*U-de*me,de*J-ge*U,ge*me-H*J];for(let P=0;P<3;P++){const ie=w[ae/3+P],_e=D.get(ie)??[0,0,0];D.set(ie,[_e[0]+ee[0],_e[1]+ee[1],_e[2]+ee[2]])}}for(const[ae,ge]of D)D.set(ae,nn(ge))}const re=q.tri*3,ne=[1-q.u-q.v,q.u,q.v],K=q.point;let he=0;for(let ae=0;ae<3;ae++){const ge=D.get(w[re+ae]),H=(re+ae)*3,de=(K[0]-C[H])*ge[0]+(K[1]-C[H+1])*ge[1]+(K[2]-C[H+2])*ge[2];he+=ne[ae]*-de*(ge[0]*fe[0]+ge[1]*fe[1]+ge[2]*fe[2])}return Math.max(0,he)},G=[[t.index,1]],Y=(q,fe,re,ne,K,he,ae,ge)=>{const H=[];for(let J=0;J<q.positions.length;J+=3){const me=I(q.positions[J],q.positions[J+1],q.positions[J+2]);H.push(me.x,me.y,me.z)}const de=n.patch(H,fe,q.gloss,q.index,G,Xt.eye);l.eyes.push({side:re,type:ne,er:K,centre:[...he],gaze:[...ae],surface:ge?[...ge]:null,firstVertex:de,vertexCount:fe.length,rings:q.rings.map(J=>de+J),triangles:q.index.length/3,rimFallbacks:q.rimFallbacks})},N=M.rules===1&&po(M.kind),te=N?M.built:M.kind;if(n.begin("eyes",te==="compound"?"compound eyes":te==="eyespot"?"eyespots":`${te} eyes`),n.region=Xt.eye,!N){uS({s:n,r:u,H:p,cW:m,cH:g,sn:x,skull:h,eyes:M,sizeK:_,tr:d,pal:i,hc:r,coatAt:a,ctx:l,headTris:C,worldUp:V,surfaceColour:W,smoothOffset:B,toModel:I,emit:Y}),n.end();return}if(M.built==="compound")for(const q of[-1,1]){const fe=[.07*p*_,.18*g*_,.12*m*_],re=ws(M.gazeYawDeg,ta,q),ne=[.45*p,.35*g,q*.82*m],K=Ni(C,ne,re);K||l.fallbacks++;const he=K?Gn(K.point,re,-.35*fe[2]):ne,ae=h2({er3:fe,centre:he,gaze:re,up:[0,1,0]}),ge=K?W(K):i.base,H=Math.max(Kr.min,Kr.overSkin*bn(ge));let de=i.eye;bn(de)<H&&(de=st(de,Kr.tint,Math.min(1,(H-bn(de))/Math.max(1e-6,bn(Kr.tint)-bn(de))))),l.colours.compound=de;const J=jt(de,.3),me=[...ae.roles].map(U=>U===It.pseudopupil?J:U===It["facet-a"]?jt(de,1.08):U===It["facet-b"]?jt(de,.92):de);Y(ae,me,q,"compound",Math.max(...fe),he,re,K?K.point:null)}else if(M.built==="eyespot"){const q=.6*p+x*.3,fe=.1*g*_,re=.002*p;for(const ne of[-1,1]){const K=ws(M.gazeYawDeg,tS,ne),he=[q,0,0],ae=$r(C,he,K);ae||l.fallbacks++;const ge=ae?ae.point:Gn(he,K,.7*m),H=u2({r:fe,centre:Gn(ge,K,re),normal:K,up:[0,1,0],rimLift:(de,J)=>{const me=Ni(C,J,K,3*fe);return me?me.t+re:0}});Y(H,[...H.roles].map(()=>i.eye),ne,"eyespot",fe,ge,K,ae?ae.point:null)}}else{const q=M.built,fe=M.k*g*_,[re,ne,K]=bp(h,p,g,m),he=[];for(const xe of[-1,1]){const Z=ws(M.gazeYawDeg,ta,xe),Re=[re,ne,xe*K],oe=Ni(C,Re,Z);oe||l.fallbacks++;const Ee=oe?Gn(oe.point,Z,-wo.recess*fe):Re,ze=zh(C,Ee,dS*fe),Ve=pp({type:q,er:fe,centre:Ee,gaze:Z,barAxis:zc(Z,V),surface:ze.tris});for(const se of Ve.surface)se&&(se.tri=ze.ids[se.tri]);const it=Ve.surface.map((se,A)=>{if(se)return W(se);const y=Ve.positions[A*3],O=I(y,Ve.positions[A*3+1],Ve.positions[A*3+2]);return a(O,.5,r.region(y),r.along(y))});he.push({patch:Ve,side:xe,centre:Ee,gaze:Z,hit:oe,surf:it})}const ae=xe=>jt([...p0[xe]],l.eyeMul);let ge=ae(M.irisBuilt??"dark-brown");u.head==="beak"&&u.maturity<.75&&(ge=st(ge,ae("dark-brown"),(.75-u.maturity)/.75));const H=gp,de=It.lid;let J=0;for(const{patch:xe,surf:Z}of he)xe.roles.forEach((Re,oe)=>{Re===de&&(J=Math.max(J,bn(jt(Z[oe],H.lid))))});const me=(xe,Z)=>[Math.min(1,xe[0]*Z),Math.min(1,xe[1]*Z),Math.min(1,xe[2]*Z)],U=Math.max(H.overPupil*bn(wc),H.overLid*J),ee=bn(ge);ee<U&&ee>0&&(ge=me(ge,Math.min(H.maxIrisGain,U/ee)));let P=H.lid;bn(ge)<H.overLid*J&&(P=H.lid*bn(ge)/(H.overLid*J)*.999),l.colours.iris=ge,l.colours.lidFactor=P;const ie=me(ge,1.1),_e=jt(ge,.45);for(const{patch:xe,side:Z,centre:Re,gaze:oe,hit:Ee,surf:ze}of he){let Ve=[0,0,0],it=0;const se=[...xe.roles].map((y,O)=>{switch(y){case It.pupil:return wc;case It["iris-inner"]:return ie;case It.iris:return ge;case It.limbus:return _e;case It.lid:{const j=jt(ze[O],P);return Ve=[Ve[0]+j[0],Ve[1]+j[1],Ve[2]+j[2]],it++,j}case It["outer-lid"]:return jt(ze[O],H.outerLid);case It.orbit:return ze[O];default:return[0,0,0]}}),A=jt(Ve,1/Math.max(1,it));xe.roles.forEach((y,O)=>{y===It.socket&&(se[O]=A)}),Y(xe,se,Z,q,fe,Re,oe,Ee?Ee.point:null)}}n.end()}const Mp=Object.freeze({minK:.14,sizeBoost:1.12,irisMin:.1,maxIrisGain:8,periocular:[.36,.3,.25],periocularLum:.18,periocularOverSkin:1.3,periocularSkinGain:2.5,periocularOwnLum:.08,sclera:[.72,.68,.6],nictitans:[.5,.42,.4],nictitansMix:.6,brow:.85,disc:[.7,.64,.52],discMix:1,discLum:.4,discEdge:.6,facetMin:.15,facetOverSkin:3,lens:[1.5,1.15],lattice:.55,pseudopupil:.12,compoundScale:1.45,mandibleScale:1.3,compoundSink:.5,eyespotR:.09,eyespotOnFace:.75,pigment:[.62,.2,.07],pigmentMix:.85,rimGain:1,eyespotEdgeToSkin:.3,eyespotLum:.9,eyespotYawDeg:24,eyespotPitchDeg:42,ocellus:[.012,.012,.016],ocellusRim:[.5,.4,.32],ocellusRimMix:.6,ocellusClear:1.35,turretGain:1.2,turretOpen:2,turretRim:[.8,.72,.45],turretRimMix:.5,turretShape:{w:.78,lift:.62,aperture:1.3},turretSize:1.3,turretStripe:.6,brilleEdge:.8,barMin:.62,barMax:.17,barSquare:5,slitMin:.12,slitSize:1.25,cat:{size:1.8,tiltDeg:14,maxEr:.5},owl:{size:.68,up:.12,midline:.005},turretNormal:4,seat:{deg:30,tiltLidless:12,reach:1,dx:[-.3,.15],dy:[-.25,.25],step:.05,move:.5},stalkLength:{blunt:.9,other:.45},stalkDimorphism:.6,stalkR:[.07,.05],stalkBulb:.13,stalkBead:.09}),iS=Object.freeze([{r:.32,yaw:12,pitch:5,z:.2,dx:.1,dy:0,segments:10,stations:1,rim:!0},{r:.15,yaw:42,pitch:5,z:.5,dx:.04,dy:-.06,segments:5,stations:1,rim:!0},{r:.14,yaw:20,pitch:35,z:.28,dx:-.03,dy:.14,segments:5,stations:1,rim:!0},{r:.15,yaw:90,pitch:25,z:.55,dx:-.07,dy:.08,segments:5,stations:1,rim:!0}]),sS=[[.1,0],[-.05,-.3],[-.05,.3]],rS=1e-9;function oS(n,e,t,i){const s=ma(n,e,t).filter(a=>a.normal[0]*t[0]+a.normal[1]*t[1]+a.normal[2]*t[2]>0&&Math.abs(a.t-i.t)<=rS).sort((a,l)=>a.tri-l.tri);let r=0,o=0;for(const a of s)r+=a.normal[0],o+=a.normal[1];return nn([r,o,0])}const aS=5.2;function cS(n){const e=Mp,t=n.pupil,i=t.kind==="horizontal"?{...n,pupil:{...t,rx:Math.max(t.rx,e.barMin),ry:Math.min(t.ry,e.barMax),n:Math.max(t.n,e.barSquare)}}:t.kind==="vertical-slit"?{...n,pupil:{...t,rx:Math.max(t.rx,e.slitMin)}}:n;if(!i.turret)return i;const s=e.turretOpen,r=i.pupil;return{...i,pupil:{...r,r:r.r*s},iris:i.iris===null?null:i.iris*s,limbus:i.limbus===null?null:i.limbus*s,lid:{...i.lid,w:i.lid.w*s,above:i.lid.above*s,below:i.lid.below*s},turret:{...e.turretShape}}}function lS(n,e,t){const i=Math.acos(mn(n[0]*e[0]+n[1]*e[1]+n[2]*e[2],-1,1));if(i<=t||i>Math.PI-1e-6)return n;const s=Math.sin(t)/Math.sin(i),r=Math.sin(i-t)/Math.sin(i);return nn([e[0]*r+n[0]*s,e[1]*r+n[1]*s,e[2]*r+n[2]*s])}function hS(n,e){const t=n.positions.length/3;return{positions:[...n.positions,...e.positions],roles:Uint8Array.from([...n.roles,...e.roles]),gloss:[...n.gloss,...e.gloss],index:[...n.index,...e.index.map(i=>i+t)],surface:[...n.surface,...e.surface],rimFallbacks:n.rimFallbacks+e.rimFallbacks,rings:[...n.rings,...e.rings.map(i=>i+t)]}}const qi=(n,e)=>[Math.min(1,n[0]*e),Math.min(1,n[1]*e),Math.min(1,n[2]*e)];function Ol(n,e,t){const i=bn(n),s=bn(e);return i>=t||s<=i?n:st(n,e,Math.min(1,(t-i)/(s-i)))}function uS(n){const{r:e,H:t,cW:i,cH:s,sn:r,skull:o,eyes:a,sizeK:l,tr:c,pal:u,ctx:f,headTris:p,worldUp:m,surfaceColour:g,smoothOffset:x,emit:d}=n,h=Mp,M=gp,_=a.traits,b=e.head,S=Math.PI/180,v=Ah[m0(e,"round")],E=Math.max(v.k,h.minK)*h.sizeBoost,[R,w,T]=bp(o,t,s,i),C=b==="mandibles",I=_.placement,F=q=>I.kind==="independent"&&q>0&&I.right?I.right:null,V=a.kind==="cat",W=a.kind==="owl",D=q=>F(q)?.yawDeg??I.yawByFace?.[b]??I.yawDeg??v.gazeYawDeg,B=q=>F(q)?.pitchDeg??I.pitchDeg??ta,G=(q,fe,re)=>{const ne=mn((v.gazeYawDeg-fe)/Math.max(v.gazeYawDeg,1),0,1),K=re>10?Math.sin(re*S):0;return[R+.1*t*ne,w+.2*s*K+(W?h.owl.up*s:0),q*T*(1-.45*ne)*(1-.25*K)]},Y=q=>q?g(q):u.base,N=q=>{const fe=Math.max(h.facetMin,h.facetOverSkin*bn(q));return Ol(u.eye,Kr.tint,Math.min(fe,bn(Kr.tint)))},te=(q,fe)=>[...q.roles].map(re=>re===It["facet-a"]?qi(fe,h.lens[0]):re===It["facet-b"]?qi(fe,h.lens[1]):re===It.pseudopupil?jt(fe,h.pseudopupil):jt(fe,h.lattice));if(_.structure==="camera"){const q=cS(d2(_)),fe=E*_.size*s*l*(q.turret?h.turretSize:["vertical-slit","slit-wide","w"].includes(q.pupil.kind)?h.slitSize:1),re=fe*(V?mn(h.cat.maxEr*s/fe,1,h.cat.size):W?h.owl.size:1),ne=[],K=h.seat,he=zh(p,[R,w,0],.6*t+2*re).tris,ae=(Re,oe)=>{const Ee=Ni(he,Re,oe);if(!Ee)return null;const ze=uu(he,Ee.point,oe,3*re);if(ze&&ze.t>.02*re)return{hit:Ee,score:-1/0};const Ve=nn(Math.abs(oe[1])>.95?[oe[1],-oe[0],0]:[oe[2],0,-oe[0]]),it=[oe[1]*Ve[2]-oe[2]*Ve[1],oe[2]*Ve[0]-oe[0]*Ve[2],oe[0]*Ve[1]-oe[1]*Ve[0]];let se=[...Ee.normal];for(const[y,O]of[[1,0],[-1,0],[0,1],[0,-1]]){const j=Ni(he,Gn(Gn(Ee.point,Ve,y*K.reach*re),it,O*K.reach*re),oe,re);if(!j)return{hit:Ee,score:-1/0};se=Gn(se,j.normal,1)}const A=nn(se);return{hit:Ee,score:A[0]*oe[0]+A[1]*oe[1]+A[2]*oe[2],normal:A}};let ge=null;const H=(Re,oe,Ee)=>{if(q.turret)return[0,0];if(I.kind!=="independent"&&ge)return ge;const ze=ae(Re,oe);let Ve=[0,0];if(!ze||ze.score<Math.cos(K.deg*S)){let it=ze?ze.score:-1/0;const se=Math.round((K.dx[1]-K.dx[0])/K.step),A=Math.round((K.dy[1]-K.dy[0])/K.step);for(let y=0;y<=se;y++)for(let O=0;O<=A;O++){const j=K.dx[0]+y*K.step,le=K.dy[0]+O*K.step,X=ae([Re[0]+j*t,Re[1]+le*s,Re[2]],oe),Se=X?X.score-K.move*Math.hypot(j,le):-1/0;Se>it+1e-9&&(it=Se,Ve=[j,le])}}return Ee<0&&(ge=Ve),Ve};for(const Re of[-1,1]){const oe=D(Re),Ee=B(Re),ze=ws(oe,Ee,Re),Ve=G(Re,oe,Ee),[it,se]=H(Ve,ze,Re),A=[Ve[0]+it*t,Ve[1]+se*s,Ve[2]],y=Ni(p,A,ze);y||f.fallbacks++;let O=q.turret&&y?nn(Gn(ze,y.normal,h.turretNormal)):ze;const j=q.spectacle||V?ae(A,ze):null;j?.normal&&Number.isFinite(j.score)&&(O=lS(ze,j.normal,(V?h.cat.tiltDeg:K.tiltLidless)*S));const le=y?Gn(y.point,O,-wo.recess*re):A,X=zh(p,le,aS*re),Se=pp({type:"round",er:re,centre:le,gaze:O,barAxis:zc(O,m),surface:X.tris,spec:q,forward:[1,0,0],midline:{n:[0,0,Re],min:(q.disc?h.owl.midline:.03)*i},look:ze});for(const Fe of Se.surface)Fe&&(Fe.tri=X.ids[Fe.tri]);const Te=Se.surface.map((Fe,at)=>{if(Fe)return g(Fe);const Pe=Se.positions[at*3],k=n.toModel(Pe,Se.positions[at*3+1],Se.positions[at*3+2]);return n.coatAt(k,.5,n.hc.region(Pe),n.hc.along(Pe))});ne.push({patch:Se,side:Re,centre:le,gaze:O,hit:y,surf:Te})}const de=Re=>jt([...p0[Re]],f.eyeMul);let J=de(a.irisBuilt??"dark-brown");e.head==="beak"&&e.maturity<.75&&(J=st(J,de("dark-brown"),(.75-e.maturity)/.75));let me=0;for(const{patch:Re,surf:oe}of ne)Re.roles.forEach((Ee,ze)=>{Ee===It.lid&&(me=Math.max(me,bn(jt(oe[ze],M.lid))))});const U=Math.max(M.overPupil*bn(wc),M.overLid*me,h.irisMin),ee=bn(J);ee<U&&ee>0&&(J=qi(J,Math.min(h.maxIrisGain,U/ee)));let P=M.lid;const ie=M.overLid*me,_e=a.kind==="cephalopod"?ie*(1-1e-12):ie;bn(J)<_e&&(P=M.lid*bn(J)/ie*.999),f.colours.iris=J,f.colours.lidFactor=P;const xe=qi(J,1.1),Z=jt(J,.45);for(const{patch:Re,side:oe,centre:Ee,gaze:ze,hit:Ve,surf:it}of ne){let se=[0,0,0],A=0;const y=le=>Re.shade?.[le]??1,O=[...Re.roles].map((le,X)=>{switch(le){case It.pupil:return wc;case It["iris-inner"]:return qi(xe,y(X));case It.iris:return qi(J,y(X));case It.limbus:return Z;case It.sclera:return h.sclera;case It.lid:case It.nictitans:{const Se=q.turret?st(qi(it[X],h.turretGain),h.turretRim,h.turretRimMix):jt(it[X],q.spectacle?h.brilleEdge:P);return se=[se[0]+Se[0],se[1]+Se[1],se[2]+Se[2]],A++,le===It.nictitans?st(Se,h.nictitans,h.nictitansMix):Se}case It["outer-lid"]:{if(q.spectacle)return jt(it[X],h.brilleEdge);const Se=jt(it[X],M.outerLid);if(q.disc)return Ol(st(Se,h.disc,h.discMix),h.disc,h.discLum);const Te=st(h.periocular,qi(it[X],h.periocularSkinGain),mn(bn(it[X])/h.periocularOwnLum,0,1));return Ol(q.disc?st(Se,h.disc,h.discMix):Se,Te,Math.max(h.periocularLum,h.periocularOverSkin*bn(it[X])))}case It.brow:return jt(it[X],h.brow);case It.turret:return(X-Re.rings[6])%2?jt(it[X],h.turretStripe):qi(it[X],h.turretGain);case It.orbit:return q.disc?st(it[X],h.disc,h.discEdge):it[X];default:return[0,0,0]}}),j=jt(se,1/Math.max(1,A));Re.roles.forEach((le,X)=>{le===It.socket&&(O[X]=j)}),d(Re,O,oe,a.kind,re,Ee,ze,Ve?Ve.point:null)}}else if(_.structure==="compound"){const q=E*s*l*_.size,fe=h.compoundScale*l*_.size*h.mandibleScale,re=C?[.07*t*fe,.18*s*fe,.12*i*fe]:[1.05*q*h.compoundScale,1.2*q*h.compoundScale,.75*q*h.compoundScale],ne=C?Ah.mandibles.gazeYawDeg:v.gazeYawDeg;let K=u.eye;for(const he of[-1,1]){const ae=ws(ne,ta,he),ge=C?[.45*t,.35*s,he*.82*i]:[R,w,he*T],H=Ni(p,ge,ae);H||f.fallbacks++;const de=H?Gn(H.point,ae,-h.compoundSink*re[2]):ge,J=mf({er3:re,centre:de,gaze:ae,up:[0,1,0]});K=N(Y(H)),d(J,te(J,K),he,a.kind,Math.max(...re),de,ae,H?H.point:null)}if(f.colours.compound=K,_.extras==="ocelli"){const he=C?.45*t:R,ae=.25*re[1],ge=nn([.35,1,0]);for(const[H,de]of sS){const J=[he+H*t,.3*s,de*i],me=Ni(p,J,ge);me||f.fallbacks++;const U=me?de===0?oS(p,J,ge,me):me.normal:null,ee=U?nn(Gn(ge,U,1)):ge,P=me?Gn(me.point,ee,-.25*ae):J,ie=Ul({r:ae,height:.7*ae,centre:P,normal:ee,up:[1,0,0],segments:6,stations:1}),_e=qi(K,1.2);d(ie,[...ie.roles].map(()=>_e),0,"ocellus",ae,P,ee,me?me.point:null)}}}else if(_.structure==="ocellus"){const[q,fe]=C?[.45*t,.35*s]:[R,w];for(const re of[-1,1])for(const ne of iS){const K=ne.r*s*l,he=ws(ne.yaw,ne.pitch,re),ae=[q+ne.dx*t,fe+ne.dy*s,re*Math.max(ne.z*i,h.ocellusClear*Oh.flange*K)],ge=Ni(p,ae,he);ge||f.fallbacks++;const H=ge?nn(Gn(he,ge.normal,1)):he,de=ge?Gn(ge.point,H,-.05*K):ae,J=Ul({r:K,height:.75*K,centre:de,normal:H,up:[0,1,0],segments:ne.segments,stations:ne.stations,rim:ne.rim,flange:ne.rim}),me=st(Y(ge),h.ocellusRim,h.ocellusRimMix);d(J,[...J.roles].map(U=>U===It["ocellus-rim"]?me:h.ocellus),re,"ocellus",K,de,H,ge?ge.point:null)}}else if(_.structure==="eyespot"){const q=b==="blunt",fe=q?h.eyespotR*s*l:h.eyespotOnFace*E*s*l,re=st(u.eye,h.pigment,h.pigmentMix),ne=.002*t;for(const K of[-1,1]){let he,ae,ge;if(q){const P=.6*t+r*.3,ie=[P,0,0];he=ws(h.eyespotYawDeg,h.eyespotPitchDeg,K),ae=$r(p,ie,he),ge=ae?ae.point:Gn(ie,he,.7*i)}else{he=ws(v.gazeYawDeg,ta,K);const P=[R,w,K*T];ae=Ni(p,P,he),ge=ae?ae.point:P}ae||f.fallbacks++;const H=he,de=P=>Ni(p,P,H,3*fe),J=x2({r:fe,centre:ge,normal:he,up:[0,1,0],rimLift:P=>{const ie=de(P);return ie?ie.t+x(ie,H)+ne:ne}}),me=Y(ae),U=jt(re,h.eyespotLum*bn(me)/Math.max(1e-6,bn(re))),ee=[...J.roles].map((P,ie)=>{if(P===It.eyespot&&ie<=12)return U;const _e=[J.positions[ie*3],J.positions[ie*3+1],J.positions[ie*3+2]],xe=de(Gn(_e,H,-fe)),Z=xe?g(xe):me;return P===It.eyespot?st(U,Z,h.eyespotEdgeToSkin):P===It["eyespot-rim"]?qi(Z,h.rimGain):Z});d(J,ee,K,"eyespot",fe,ge,he,ae?ae.point:null)}}else{const q=b==="blunt",fe=c.sex==="male"?1+h.stalkDimorphism*e.dimorphism:1,re=(q?h.stalkLength.blunt:h.stalkLength.other)*s*l*fe,ne=h.stalkR[0]*s*l,K=h.stalkR[1]*s*l;for(const he of[-1,1]){const ae=ws(I.yawDeg??40,I.pitchDeg??55,he),ge=q?[.55*t+.3*r,.35*s,he*.3*i]:C?[.4*t,.45*s,he*.45*i]:[R,w+.25*s,he*.6*T],H=Ni(p,ge,ae);H||f.fallbacks++;const de=H?H.point:ge,J=Y(H),{patch:me,tip:U}=_2({base:de,dir:ae,up:[0,1,0],length:re,r0:ne,r1:K,segments:6,rings:q?4:2});let ee,P,ie,_e=U,xe=ae;if(q){ie=h.stalkBead*s*l,ee=Ul({r:ie,height:.9*ie,centre:U,normal:ae,up:[0,1,0],segments:8,stations:2,rim:!0});const Re=st(jt(J,.9),h.ocellusRim,h.ocellusRimMix);P=[...ee.roles].map(oe=>oe===It["ocellus-rim"]?Re:h.ocellus)}else ie=h.stalkBulb*s*l,xe=nn(Gn(ae,[0,0,he],.6)),_e=Gn(U,xe,-.2*ie),ee=mf({er3:[ie,ie,.8*ie],centre:_e,gaze:xe,up:[0,1,0],segments:8,stations:2}),P=te(ee,N(J));const Z=jt(J,.9);d(hS(me,ee),[...me.roles].map(()=>Z).concat(P),he,"stalk",ie,_e,xe,H?H.point:null)}}}function Fl(n,e,t,i){const s=new dn(...e.restQuaternion).invert(),r=_t(...e.restPosition),o=_t(),a=new Float64Array((i-t)*9);for(let l=t*3,c=0;l<i*3;l++,c+=3){const u=n.ix[l];o.set(n.p[u*3],n.p[u*3+1],n.p[u*3+2]).sub(r).applyQuaternion(s),a[c]=o.x,a[c+1]=o.y,a[c+2]=o.z}return a}const dS=4.5;function zh(n,e,t){const i=[],s=[];for(let r=0;r+8<n.length;r+=9){const o=(n[r]+n[r+3]+n[r+6])/3,a=(n[r+1]+n[r+4]+n[r+7])/3,l=(n[r+2]+n[r+5]+n[r+8])/3;let c=0;for(let u=0;u<9;u+=3)c=Math.max(c,Math.hypot(n[r+u]-o,n[r+u+1]-a,n[r+u+2]-l));if(Math.hypot(o-e[0],a-e[1],l-e[2])<=t+c){s.push(r/9);for(let u=0;u<9;u++)i.push(n[r+u])}}return{tris:Float64Array.from(i),ids:s}}const Gn=(n,e,t)=>[n[0]+e[0]*t,n[1]+e[1]*t,n[2]+e[2]*t];function fS(n,e,t,i,[s,r]){const o=_t(...t.restPosition),a=new dn(...t.restQuaternion).invert(),l=new dn(...t.restQuaternion);for(let c=e;c<n.nv;c++){let u=0;for(let m=0;m<4;m++)n.si[c*4+m]===t.index&&(u+=n.sw[c*4+m]);if(u<=0)continue;const f=n.pos(c).sub(o).applyQuaternion(a);if(u<.999){if(f.y>=0)continue;for(let m=0;m<4;m++)n.si[c*4+m]=m?0:t.index,n.sw[c*4+m]=m?0:1}f.set(mn(f.x,-s,r),Math.max(f.y,-i),f.z);const p=f.applyQuaternion(l).add(o);n.p[c*3]=p.x,n.p[c*3+1]=p.y,n.p[c*3+2]=p.z}}function pS(n,e,t,i,s,r,o,a,l,c,u,f){const p=[[t.index,1]],m=c(t,1,0,0),g=c(t,0,1,0),x=c(t,0,0,1),d=g.clone().negate(),h=o.ring,M=h.rx,_=T=>st(u(T),a.skin,e==="claw"?.4:.18),b=(T,C)=>e==="hoof"?st(u(C),a.keratin,Yt(0,2,T)):_(C),S=e==="claw"?[[.06,-.28,Math.max(h.ry,.16*s),Math.max(M,.15*s)],[.15,-.65,.25*s,Math.max(M,.19*s)],[.17,-1,.23*s,Math.max(M*.94,.17*s)]]:[[.03,-.25,Math.max(h.ry,M*1.08),M*1.05],[.11,-.7,Math.max(M*1.2,s*.38),M*1.23],[.14,-1,Math.max(M*1.23,s*.4),M*1.24]];f&&e!=="claw"&&(S[1][2]=f.footLength*.48,S[1][3]=f.footWidth*.48,S[2][2]=f.footLength*.5,S[2][3]=f.footWidth*.5);const v=[h,...S.map(([T,C,I,F],V)=>({c:l(t,T*s,C*i),t:d,u:m,rx:F,ry:I,w:p,region:Xt.foot,color:(W,D)=>b(V+1,D)}))];if(vn(n,v,o.radial,0,0),Bc(n,v[v.length-1],o.radial,1),e==="pad"){const T=S[2],C=T[2],I=T[3];for(let F=-1;F<=1;F++){const V=F*.56;Nn(n,l(t,T[0]*s+C*Math.cos(V)*.97,-.79*i,I*Math.sin(V)),[m,g,x],[.09*C,.16*i,.19*I],p,()=>st(a.keratin,a.horn,.4),8,4)}}if(e!=="claw")return;const E=.082*s;for(const T of[-.42,0,.42]){const C=m.clone().multiplyScalar(Math.cos(T)).addScaledVector(x,Math.sin(T)*r).normalize(),I=l(t,.18*s,0,Math.sin(T)*r*.12*s),F=(.76-.18*Math.abs(T))*s,W=[[0,1.08,-.55,.45],[.2,1.12,-.55,.45],[.36,.87,-.59,.4],[.53,.91,-.58,.41],[.72,.68,-.67,.32],[.9,.48,-.7,.28]].map(([G,Y,N,te])=>({c:I.clone().addScaledVector(C,F*G).addScaledVector(g,i*N),t:C,u:g,rx:E*Y,ry:i*te,w:p,region:Xt.foot,color:(q,fe)=>_(fe)}));vn(n,W,10,.12,.12);const D=W[W.length-1].c,B=[D,D.clone().addScaledVector(C,E*1.3).addScaledVector(g,-.02*i),D.clone().addScaledVector(C,E*2.3).addScaledVector(g,-.2*i)];An(n,B,[E*.48,E*.27,E*.025],[p,p,p],()=>a.keratin,8,.05,.05,.65,g)}const R=m.clone().negate().addScaledVector(x,-r*.15).normalize(),w=l(t,-.01*s,-.58*i);An(n,[w,w.clone().addScaledVector(R,.14*s),w.clone().addScaledVector(R,.28*s).addScaledVector(g,-.12*i)],[E*.8,E*.6,E*.16],[p,p,p],(T,C,I)=>T===2?a.keratin:_(I),8,.1,.1,.62,g)}function mS(n,e,t,i,s,r,o,a,l,c,u){const f=[[t.index,1]],p=[[t.index,.6],[i.index,.4]],m=c(t,1,0,0),g=c(t,0,1,0),x=c(t,0,0,1),d=Math.max(i.end.w,.001),h=(M,_,b,S=.25)=>{const v=M.map(([E,R,w,T],C)=>({c:l(t,E,R),t:g.clone().negate(),u:m,rx:T,ry:w,w:C===0?p:f,color:(I,F)=>_(C,F)}));vn(n,v,b,.15,S)};if(e==="hoof")h([[0,.25*s,d,d],[.05*r,-.3*s,d*1.15,d*1.1],[.18*r,-1.02*s,d*1.35,d*1.2]],(M,_)=>M===0?st(a.keratin,u(_),.4):a.keratin,12,.08);else if(e==="pad"){h([[0,.3*s,d,d],[.02*r,-.4*s,d*1.2,d*1.2],[.05*r,-1.02*s,d*1.35,d*1.3]],(M,_)=>st(u(_),a.skin,.3),14,.06);for(let M=-1;M<=1;M++)Nn(n,l(t,.05*r+d*1.25*Math.cos(M*.5),-.8*s,d*1.2*Math.sin(M*.5)),[m,g,x],[d*.18,s*.22,d*.3],f,()=>[.78,.72,.62],6,3)}else if(e==="paw"){Nn(n,l(t,.25*r,-.45*s),[m,g,x],[.42*r,.55*s+.01*r,Math.max(d*1.15,.28*r)],p,(M,_,b)=>st(u(b),a.accent,.2),10,5);for(let M=0;M<4;M++){const _=(M-1.5)*.17*r,b=.62*r-Math.abs(M-1.5)*.06*r;Nn(n,l(t,b,-.62*s,_),[m,g,x],[.12*r,.38*s,.085*r],f,(S,v,E)=>u(E),7,4),An(n,[l(t,b+.08*r,-.5*s,_),l(t,b+.17*r,-.85*s,_)],[.03*r,.003*r],[f,f],()=>a.keratin,5,.1,.1)}}else if(e==="claw"||e==="hand"){const M=e==="hand",_=M?.06*r:Math.max(.035*r,.45*s),b=M?[-.36,-.12,.12,.36]:[-.42,0,.42];M?Nn(n,l(t,.32*r,-.6*s),[m,g,x],[.36*r,.4*s,.22*r],p,()=>a.skin,10,5):Nn(n,l(t,.02*r,-.3*s),[m,g,x],[_*2,_*1.5,_*2],p,()=>st(a.keratin,a.skin,.5),8,4);for(const R of b){const w=(M?.55:1-.25*Math.abs(R))*r,T=M?l(t,.6*r,-.6*s,R*.5*r):l(t,.02*r,-.4*s,0),C=m.clone().multiplyScalar(Math.cos(R)).addScaledVector(x,Math.sin(R)*o*(M?.3:1)).normalize(),I=[0,.35,.7,.95].map(W=>T.clone().addScaledVector(C,w*W).addScaledVector(g,-s*.55*W+(M?0:s*.1)));An(n,I,[_,_*.85,_*.7,_*.5],I.map(()=>f),()=>M?a.skin:st(a.keratin,a.skin,.55),7,.3,.2);const F=I[3],V=[F,F.clone().addScaledVector(C,_*2.2).addScaledVector(g,-_*.2),F.clone().addScaledVector(C,_*3.6).addScaledVector(g,-_*1.1)];An(n,V,[_*.5,_*.32,_*.03],[f,f,f],()=>a.keratin,6,.1,.1)}const S=M?m.clone().multiplyScalar(.3).addScaledVector(x,-o*.95).normalize():m.clone().negate().addScaledVector(x,-o*.15).normalize(),v=M?l(t,.25*r,-.6*s,-o*.2*r):l(t,0,-.5*s,0),E=[0,.5,1].map(R=>v.clone().addScaledVector(S,(M?.35:.3)*r*R).addScaledVector(g,-.4*s*R));An(n,E,[_*.9,_*.7,_*.35],[f,f,f],()=>M?a.skin:a.keratin,6,.3,.2)}else An(n,[l(t,0,.25*s),l(t,.08*s,-.5*s),l(t,.12*s,-s)],[d,d*.6,d*.06],[p,f,f],M=>M?a.keratin:st(a.keratin,a.accent,.4),6,.1,.05)}function gS(n,e,t,i,s,r,o,a,l,c){const u=[[i.index,1]],f=[[s.index,1]],p=[[i.index,.5],[t.index,.5]],m=[[i.index,.5],[s.index,.5]],g=l(i,1,0,0),x=l(i,0,1,0),d=l(i,0,0,1),h=i.length,M=s.length,_=Math.max(t.end.w,.001);if(e==="pincer"){const v=Math.max(h*1.6,_*3);Nn(n,a(i,v*.45),[g,x,d],[v*.6,_*1.7,_*1.4],p,()=>st(o.plate,o.accent,.3),12,6);const E=[0,.5,1].map(w=>a(i,v*(.9+.7*w),_*(.6-.7*w*w)));An(n,E,[_*.7,_*.45,_*.05],[u,u,u],()=>o.keratin,8,.2,.1);const R=[0,.5,1].map(w=>a(s,v*(.45+.7*w)-M*0,-_*(.6-.6*w*w)));An(n,R,[_*.65,_*.42,_*.05],[f,f,f],()=>o.keratin,8,.2,.1);return}const b=e==="claw";Nn(n,a(i,h*.5),[g,x,d],[h*.62,_*.7,_*(b?1:1.25)],p,(v,E,R)=>b?c(R):o.skin,10,5);const S=b?[-.5,0,.5]:[-.45,-.15,.15,.45];for(const v of S){const E=M*(b?2.2:1.6)*(1-.2*Math.abs(v)),w=[a(i,h*.95,0,v*_*1.6),...[.33,.66,1].map(T=>a(s,E*T,-E*.18*T*T,v*_*1.6*(1-.15*T)))];An(n,w,b?[_*.35,_*.28,_*.18,_*.02]:[_*.28,_*.24,_*.2,_*.14],[m,f,f,f],()=>b?o.keratin:o.skin,6,.2,b?.05:.6)}if(!b){const v=a(i,h*.35,-_*.3,-r*_*1.1),E=g.clone().addScaledVector(d,-r*.8).addScaledVector(x,-.3).normalize();An(n,[v,v.clone().addScaledVector(E,M*.9),v.clone().addScaledVector(E,M*1.5)],[_*.3,_*.24,_*.16],[u,u,u],()=>o.skin,6,.2,.6)}}function xS(n,e,t,i,s,r,o,a,l){const c=e.recipe,u=c.wings==="feathered",f=t.reduce((S,v)=>S+v.length,0),p=16,m=4,g=[],x=[],d=lp(u,f),h=[];for(let S=0;S<=p;S++){const v=S/p*f;let E=0,R=0;for(;E<t.length-1&&R+t[E].length<v-1e-9;)R+=t[E].length,E++;const w=t[E],T=v-R,C=T/w.length,I=o(w,T),F=a(w,0,0,1).multiplyScalar(s),V=a(w,0,1,0),W=S/p,D=cp(u,f,W),B=[];for(let G=0;G<=m;G++){const Y=G/m,N=C<.5&&E>0?[[t[E-1].index,.5*(1-Yt(0,.5,C))],[w.index,1]]:C>.5&&E<t.length-1?[[t[E+1].index,.5*Yt(.5,1,C)],[w.index,1]]:[[w.index,1]];let te=N;!u&&W<.2&&(te=[...N.map(([re,ne])=>[re,ne*(1-Y*(1-W/.2))]),[i.index,Y*(1-W/.2)]]);const q=I.clone().addScaledVector(F,D*Y).addScaledVector(V,D*.06*Math.sin(Math.PI*Y)),fe=u?st(st(l(q,W),r.accent,Yt(.45,.9,Y)*.8),r.keratin,Yt(.75,1,W)*.5*Y):st(st(r.skin,r.accent,.35),r.keratin,.25*Yt(.6,1,Y));B.push({p:q,n:V,w:te,col:fe})}h.push(B)}for(const S of h)g.push(S.map(({p:v,n:E,w:R,col:w},T)=>n.v(v.clone().addScaledVector(E,d*.5*(1-.7*T/m)),w,R))),x.push(S.map(({p:v,n:E,w:R,col:w},T)=>n.v(v.clone().addScaledVector(E,-d*.5*(1-.7*T/m)),st(w,[.8,.78,.74],.12),R)));const M=_t();let _=0;for(const S of h)for(const v of S)M.add(v.p),_++;M.multiplyScalar(1/_);for(let S=0;S<p;S++)for(let v=0;v<m;v++){const E=h[S][v].n;n.to(g[S][v],g[S+1][v],g[S][v+1],E),n.to(g[S+1][v],g[S+1][v+1],g[S][v+1],E);const R=E.clone().negate();n.to(x[S][v],x[S+1][v],x[S][v+1],R),n.to(x[S+1][v],x[S+1][v+1],x[S][v+1],R)}const b=[];for(let S=0;S<=p;S++)b.push([S,0]);for(let S=1;S<=m;S++)b.push([p,S]);for(let S=p-1;S>=0;S--)b.push([S,m]);for(let S=m-1;S>=1;S--)b.push([0,S]);for(let S=0;S<b.length;S++){const[v,E]=b[S],[R,w]=b[(S+1)%b.length],T=h[v][E].p.clone().add(h[R][w].p).multiplyScalar(.5).sub(M);n.to(g[v][E],x[v][E],g[R][w],T),n.to(g[R][w],x[v][E],x[R][w],T)}if(!u){const S=t[t.length-1];for(const v of[.35,.75]){const E=o(S,0),R=a(S,1,0,0).multiplyScalar(Math.cos(v)).addScaledVector(a(S,0,0,1),s*Math.sin(v)).normalize(),w=S.length*(1.2-.4*v);An(n,[E,E.clone().addScaledVector(R,w*.5),E.clone().addScaledVector(R,w)],[S.start.w*.5,S.start.w*.35,S.start.w*.1],[[[S.index,1]],[[S.index,1]],[[S.index,1]]],()=>r.keratin,5,.1,.1)}}for(const S of t)An(n,[o(S,0),o(S,S.length)],[S.start.w,S.end.w],[[[S.index,1]],[[S.index,1]]],(v,E,R)=>u?l(R,0):r.skin,7,.4,.4)}function _S(n,e,t,i,s,r,o){const a=e.recipe,l=e.bones,c=e.chains.torso.map(d=>l[d]),u=c.length,f=c.reduce((d,h)=>d+h.length,0),p=a.layout==="limbless"||a.layout==="many-legged",m=d=>{const h=mn(d,-.12,1.12)*f;let M=0,_=0;for(;_<u-1&&M+c[_].length<h;)M+=c[_].length,_++;const b=c[_],S=h-M,v=mn(S/b.length,0,1),E={w:At(b.start.w,b.end.w,v),h:At(b.start.h,b.end.h,v),yc:At(b.start.yc,b.end.yc,v)},R=c[_-1],w=c[_+1],T=v<.5&&R?[[R.index,.5*(1-Yt(0,.5,v))],[b.index,1]]:v>.5&&w?[[w.index,.5*Yt(.5,1,v)],[b.index,1]]:[[b.index,1]];return{bone:b,local:S,sec:E,w:T}};if(a.armor==="dome"){const[d,h]=p?[.33,.67]:[-.08,1.04],M=[],_=10;for(let b=0;b<=_;b++){const S=At(d,h,b/_),{bone:v,local:E,sec:R,w}=m(S),T=b/_,C=Math.pow(Math.sin(Math.PI*At(.08,.92,T)),.45),I=i(v,E,R.yc+R.h*.12),F=s(v,1,0,0),V=s(v,0,1,0);M.push({c:I,t:F,u:V,rx:R.w*1.25*C,ry:R.h*1.32*C,ryBelow:R.h*Math.min(1.32*C,1.1),w,color:W=>{const D=Math.sin(W);if(D<-.15)return st(t.belly,t.plate,.35);const B=Math.abs(Math.sin(T*Math.PI*5))<.12||Math.abs(Math.sin(W*3))<.1;return D<.1?st(t.plate,t.belly,.4):B?st(t.plate,t.keratin,.6):st(t.plate,t.horn,.25+.15*Math.sin(r+T*13))}})}vn(n,M,24,.25,.25);return}if(a.armor==="bands"){const d=p?u:Math.max(6,u*2);for(let h=0;h<d;h++){const M=(h+.05)/d,_=Math.min((h+1.15)/d,.985),b=-.35,S=Math.PI+.35,v=12,E=[];for(const[I,F]of[M,_].entries()){const{bone:V,local:W,sec:D,w:B}=m(F),G=s(V,0,1,0),Y=s(V,0,0,1),N=i(V,W,D.yc),te=[],q=h===d-1&&I===1||h===0&&I===0;for(const fe of q?[1.03,.95]:[1.16,1.02]){const re=[];for(let ne=0;ne<=v;ne++){const K=At(b,S,ne/v),he=N.clone().addScaledVector(Y,-Math.cos(K)*D.w*fe).addScaledVector(G,Math.sin(K)*D.h*fe);re.push(n.v(he,st(t.plate,t.keratin,I?.35:.1),B))}te.push(re)}E.push(te)}const[R,w]=E,T=I=>{const{bone:F,local:V,sec:W}=m(I);return i(F,V,W.yc)},C=T((M+_)/2);for(let I=0;I<v;I++){const F=(B,G,Y,N)=>n.to(B,G,Y,N),V=n.pos(R[0][I]).sub(C);F(R[0][I],R[0][I+1],w[0][I],V),F(R[0][I+1],w[0][I+1],w[0][I],V),F(R[1][I],R[1][I+1],w[1][I],V.clone().negate()),F(R[1][I+1],w[1][I+1],w[1][I],V.clone().negate());const W=T(M).sub(C),D=T(_).sub(C);F(R[0][I],R[0][I+1],R[1][I],W),F(R[0][I+1],R[1][I+1],R[1][I],W),F(w[0][I],w[0][I+1],w[1][I],D),F(w[0][I+1],w[1][I+1],w[1][I],D)}for(const I of[0,v]){const F=n.pos(R[0][I]).sub(n.pos(R[0][v/2]));n.to(R[0][I],R[1][I],w[0][I],F),n.to(R[1][I],w[1][I],w[0][I],F)}}return}if(a.armor==="plates"){const d=e.chains.tail.slice(0,Math.ceil(e.chains.tail.length/2)).map(_=>l[_]),h=[],M=p?u:Math.max(3,9+o.traits.countScale.plate);for(let _=0;_<M;_++){const b=(_+.5)/M,S=m(b);h.push({...S,size:.6+.5*Math.sin(Math.PI*b)})}for(const[_,b]of d.entries())h.push({bone:b,local:b.length*.5,sec:{w:b.start.w,h:b.start.h,yc:0},w:[[b.index,1]],size:.7-.12*_});h.forEach(({bone:_,local:b,sec:S,w:v,size:E},R)=>{const w=o.jv*((R%2?.07:-.07)+.12*(Yo(o.plateSeed,R,0)-.5)),T=Math.max(S.h,e.dims.torsoHeight*.5)*.85*E*(1+w),C=T*.95,I=s(_,_.part==="tail"?-1:1,0,0),F=s(_,0,1,0),V=s(_,0,0,1),W=i(_,b,S.yc+S.h*.82).addScaledVector(V,(R%2?1:-1)*S.w*.14);mp(n,W,I,F,[[-C*.5,0],[-C*.3,T*.7],[0,T],[C*.35,T*.65],[C*.5,0]],T*.07,v,(D,B)=>st(t.plate,t.accent,Yt(.5,1,B/T)*.6))});return}const g=Math.max(3,(p?u*2:10)+o.traits.countScale.osteoderm),x=[.55,.95,1.5707,2.19,2.59];for(let d=0;d<g;d++)for(const[h,M]of x.entries()){const _=o.jv*(Yo(o.osteoSeed,d,h*3)-.5)*.5,b=o.jv*(Yo(o.osteoSeed,d,h*3+1)-.5)*.2,S=1+o.jv*(Yo(o.osteoSeed,d,h*3+2)-.5)*.3,v=(d+.5+h%2*.5+_)/(g+.5),E=M+b,{bone:R,local:w,sec:T,w:C}=m(v),I=s(R,0,1,0),F=s(R,0,0,1),V=i(R,w,T.yc),W=F.clone().multiplyScalar(-Math.cos(E)*T.h).addScaledVector(I,Math.sin(E)*T.w).normalize(),D=V.clone().addScaledVector(F,-Math.cos(E)*T.w*.97).addScaledVector(I,Math.sin(E)*T.h*.97),B=Math.min(T.w,T.h)*.16*S;An(n,[D.clone().addScaledVector(W,-B*.4),D.clone().addScaledVector(W,B*.55),D.clone().addScaledVector(W,B*.95)],[B,B*.75,B*.08],[C,C,C],G=>G?st(t.plate,t.horn,.4):t.plate,5,.1,.05)}}const sc=n=>`0x${(n>>>0).toString(16)}u`,bS=n=>{const e=String(n);return/[.eE]/.test(e)?e:`${e}.0`},i3=`
// every integer the hash touches is highp (32-bit), whatever the program's default int precision
uniform highp uint coatSeed;
uniform float coatCells, coatThreshold, coatWarp, coatBellyLine;
varying vec3 vCoatL0;
varying vec3 vCoatL1;
varying vec3 vCoatL2;
varying vec4 vCoatSample;
const float COAT_INV32 = 1.0 / 4294967296.0;
const highp uint COAT_SALT_WARP = ${sc($a.warp)}, COAT_SALT_DETAIL = ${sc($a.detail)}, COAT_SALT_MARK = ${sc($a.mark)}, COAT_SALT_BAND = ${sc($a.band)};
const float COAT_JITTER = ${bS(Pv)};
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
`;export{Ic as $,US as A,Vi as B,lf as C,ZM as D,KM as E,uv as F,ka as G,$M as H,DS as I,tu as J,Pc as K,Kh as L,SS as M,Ji as N,ra as O,cu as P,dn as Q,oa as R,yS as S,yn as T,Vf as U,ue as V,eu as W,fa as X,ZS as Y,RS as Z,Ui as _,wy as a,da as a0,Jh as a1,NS as a2,FS as a3,OS as a4,Mc as a5,Ac as a6,IS as a7,kS as a8,FM as a9,Us as aA,Ts as aB,ca as aC,XS as aD,Ht as aE,hs as aF,om as aG,ES as aH,qS as aI,YS as aJ,uc as aK,Gv as aL,W0 as aM,yc as aN,Rc as aO,wS as aP,MS as aQ,WS as aR,CS as aS,t3 as aT,$S as aU,PS as aV,Ty as aW,b2 as aX,Hy as aY,M2 as aZ,Cy as a_,v0 as aa,wM as ab,LS as ac,p0 as ad,Of as ae,po as af,Ah as ag,m0 as ah,Ai as ai,EM as aj,VM as ak,HM as al,vS as am,Et as an,Yi as ao,TS as ap,Oi as aq,nm as ar,Dp as as,AS as at,dv as au,GS as av,HS as aw,fv as ax,VS as ay,Fd as az,QS as b,n3 as c,jS as d,Bi as e,KS as f,ag as g,Yf as h,JS as i,jf as j,Ps as k,e3 as l,v2 as m,br as n,i3 as o,df as p,Ey as q,ou as r,J0 as s,zS as t,oo as u,yy as v,ro as w,Od as x,QM as y,BS as z};
