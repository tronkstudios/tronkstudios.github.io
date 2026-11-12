// Local WebRTC, or RTC_TEST_MODE=mock for protocol-only checks.
// The Supabase rendezvous, account and TURN request are mocked in both modes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader']});
  try {
    const context=await browser.newContext({ignoreHTTPSErrors:process.env.ALLOW_TEST_PROXY_CERT==='1',locale:'es-ES'});
    const pages=[];const errors=[];
    async function player() {
      const page=await context.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));
      await page.exposeBinding('mockRtcMessage', async (_source, message) => {
        for (const other of pages) if (!other.isClosed()) {
          await other.evaluate(message => {
            const pc = window.testConnections.find(pc => pc.id === message.to);
            if (!pc) return;
            if (message.kind === 'open') pc.open(message.from);
            if (message.kind === 'data') pc.channels.get(message.label)?.onmessage?.({data:message.data});
            if (message.kind === 'close') { pc.connectionState='disconnected'; pc.onconnectionstatechange?.(); }
          }, message);
        }
      });
      await page.exposeBinding('signalToRoom' ,async(_source,name,message)=>{
        for(const other of pages) if(other!==page&&!other.isClosed()) {
          await other.evaluate(({name,message})=>{ const ch=window.testChannels.get(name);if(ch)ch.callback({payload:message.payload}); },{name,message});
        }
      });
      await page.route('**/three.min.js', route => route.abort());
      await page.route('**/turn',route=>route.fulfill({json:{iceServers:[]}}));
      await page.addInitScript(mock=>{
        window.testChannels=new Map();window.testConnections=[];
        if (mock) {
          window.RTCPeerConnection = class {
            constructor() { this.id=Math.random().toString(36);this.channels=new Map();this.connectionState='new';window.testConnections.push(this); }
            createDataChannel(label) {
              const pc=this;
              const dc={label,readyState:'connecting',send(data){return window.mockRtcMessage({kind:'data',to:pc.remoteId,label,data});}};
              this.channels.set(label,dc);return dc;
            }
            async createOffer(){return {type:'offer',sdp:this.id};}
            async createAnswer(){return {type:'answer',sdp:this.id};}
            async setLocalDescription(sdp){this.localDescription=sdp;}
            async setRemoteDescription(sdp){
              this.remoteDescription=sdp;this.remoteId=sdp.sdp;
              if(sdp.type==='answer') {
                await window.mockRtcMessage({kind:'open',to:this.remoteId,from:this.id});
                this.open(this.remoteId);
              }
            }
            open(remoteId){
              this.remoteId=remoteId;this.connectionState='connected';
              for(const label of ['game','ctrl']) {
                let dc=this.channels.get(label);
                if(!dc){dc=this.createDataChannel(label);this.ondatachannel?.({channel:dc});}
                dc.readyState='open';dc.onopen?.();
              }
              this.onconnectionstatechange?.();
            }
            async addIceCandidate(){}
            close(){
              if(this.connectionState==='closed')return;
              this.connectionState='closed';for(const dc of this.channels.values())dc.readyState='closed';
              window.mockRtcMessage({kind:'close',to:this.remoteId});this.onconnectionstatechange?.();
            }
          };
        } else {
          const RTC=window.RTCPeerConnection;
          window.RTCPeerConnection=class extends RTC { constructor(){super({iceServers:[]});window.testConnections.push(this);} };
        }
        const client={auth:{getSession:async()=>({data:{session:null}})},channel(name){
          const channel={callback:null,on(_type,_filter,callback){this.callback=callback;return this;},
            subscribe(callback){window.testChannels.set(name,this);setTimeout(()=>callback('SUBSCRIBED'),0);return this;},
            send(message){return window.signalToRoom(name,JSON.parse(JSON.stringify(message)));},unsubscribe(){window.testChannels.delete(name);}};
          return channel;
        }};
        // A read-only fake account leaves gameplay and all RTC channels real.
        Object.defineProperty(window,'supabase',{configurable:true,get:()=>({createClient:()=>client}),set(){}});
      }, process.env.RTC_TEST_MODE === 'mock');
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:8000'}/survivors/`);
      await page.waitForSelector('#menu.is-on',{timeout:90000});
      await page.locator('#menu [data-go="online"]').click();return page;
    }
    const host=await player(),guest=await player();
    await host.getByRole('button',{name:'Crear sala',exact:true}).click();
    await host.waitForSelector('.online-code');const code=await host.locator('.online-code').textContent();
    await guest.locator('.online-input').fill(code);
    await guest.getByRole('button',{name:'Unirse',exact:true}).click();
    await guest.waitForFunction(()=>window.testConnections[0]?.connectionState==='connected' ||
      (window.testConnections[0]?.iceGatheringState==='complete' && !(window.testConnections[0].localDescription?.sdp.match(/a=candidate/g)||[]).length), {}, {timeout:15000});
    if (await guest.evaluate(()=>window.testConnections[0].connectionState!=='connected')) {
      console.log('SKIP real local RTC: Chromium produced no candidates; check managed WebRtcIPHandling policy. Run RTC_TEST_MODE=mock to verify game protocol separately.');
      return;
    }
    await host.waitForFunction(()=>window.testConnections[0]?.connectionState==='connected');
    await host.getByRole('button',{name:'Empezar partida',exact:true}).click();
    await guest.waitForFunction(()=>Game.state?.guest&&Game.state.t>10,{},{timeout:30000});
    assert.equal(await host.evaluate(()=>Game.state.players.length),2);
    const before=await host.evaluate(()=>Game.state.players[1].x);
    await guest.keyboard.down('d');
    await host.waitForFunction(x=>Game.state.players[1].x>x+5,before,{timeout:5000});
    await guest.keyboard.up('d');
    await host.evaluate(()=>Game.finish(false));
    await guest.waitForSelector('#end:not([hidden])');
    assert.equal(await guest.evaluate(()=>Save.get().runs),1,'guest receives and saves the final result');
    await host.waitForFunction(()=>!TronkNet.active);
    for(const page of [host,guest]) {await page.locator('#end-menu').click();await page.locator('#menu [data-go="online"]').click();}
    await host.getByRole('button',{name:'Crear sala',exact:true}).click();await host.waitForSelector('.online-code');
    await guest.locator('.online-input').fill(await host.locator('.online-code').textContent());
    await guest.getByRole('button',{name:'Unirse',exact:true}).click();
    await guest.waitForFunction(()=>window.testConnections.at(-1)?.connectionState==='connected');
    await host.getByRole('button',{name:'Empezar partida',exact:true}).click();
    await guest.waitForFunction(()=>Game.state?.guest&&Game.state.t>10);
    await host.evaluate(()=>{Game.state.xp=Game.state.xpNext;Game.step();});
    await guest.waitForSelector('#levelup:not([hidden])');
    await host.locator('.up-card').first().click();
    // A closed peer while its choice is pending must not freeze the host.
    await guest.evaluate(()=>window.testConnections.forEach(pc=>pc.close()));
    await host.waitForFunction(()=>Game.state.players[1].disconnected&&Game.state.choosing===null,{},{timeout:12000});
    await host.evaluate(()=>{Game.state.gems=[];Game.state.xp=0;});
    const tick=await host.evaluate(()=>Game.state.t);
    await host.waitForFunction(t=>Game.state.t>t,tick,{timeout:5000});
    assert.deepEqual(errors,[]);
    console.log(`Online (${process.env.RTC_TEST_MODE === 'mock' ? 'mock transport' : 'real local RTC'}): room, guest movement, final results, shared level up and disconnect during choice passed`);
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
