import makeWASocket, { useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import { createClient } from 'redis';
const redis = createClient();


async function connectTOWA() {
await redis.connect();
const { state, saveCreds } = await useMultiFileAuthState('csai_auth')
const conn = makeWASocket({
     auth: state,
     printQRInTerminal: true 
    })

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update

		switch (connection) {
			case 'close':
				const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
				console.log('🔴 Closed: ', lastDisconnect?.error)
				if (shouldReconnect) {
					connectTOWA() // YOUR INIT FUNCTION
				}
				break;

			case 'connecting':
				console.log('🟡 Connecting...')
				break;

			case 'open':
				console.log('🟢 Connected.')
				break;

			default:
				break;
		}
    })

    conn.ev.on('messages.upsert', async m => {
        let msg = m.messages[0].message?.conversation
        let location =  m.messages[0].message?.locationMessage
        let quoted = m.messages[0]

        let latitude = "-8.1" //sekolah -8.1
        let lotitude = "112.6" //sekolah 112.6


        let me = "Absensi"

        let reps =  m.messages[0].message?.extendedTextMessage?.text
        let from = m.messages[0].key?.remoteJid || 'null from';
        let name = m.messages[0].pushName
        let choose = (msg || reps)?.toLowerCase()
        let registered = await redis.get(from+"-guru")

        if((choose || location) && (name != me && name!.length > 0)) {

            if(choose?.split(' ')[0] == "daftar") {
                let name = choose.slice(7)
                await redis.set(from+"-guru", name)
                return await conn.sendMessage(from, {text: "Selamat anda sudah terdaftar! 🥳\n_Silahkan melakukan absensi dengan mengetik check in untuk masuk dan check out untuk keluar_"})
            } else if(choose?.split(' ')[0] == "help") {
                return await conn.sendMessage(from, {text: "Assalamualaikum warahmatullahi wabarokatuh..\nSelamat datang! 😊\nSaya adalah bot absensi otomatis.\n\nuntuk melakukan absen masuk silahkan ketik :\n*check in*\nuntuk melakukan absen keluar silahkan ketik :\n*check out*"})
            }

            if(registered) {

                if(choose == "check in" || choose == "cek in" || choose == "masuk") {
                    await redis.set(from+'-absensi', 'Absen Masuk') 
                    await conn.sendMessage(from, {text: "Silahkan kirimkan lokasi terkini anda 😉"})
                 } else if(choose == "check out" || choose == "cek out" || choose == "keluar") {
                    await redis.set(from+'-absensi', 'Absen Keluar') 
                    await conn.sendMessage(from, {text: "Silahkan kirimkan lokasi terkini anda 😉"})
                 } else if(location) {

                     let check = await redis.get(from+'-absensi')
                     let lat = location?.degreesLatitude?.toFixed(1)
                     let long = location?.degreesLongitude?.toFixed(1)

                     
                     console.log(lat)
                     console.log(long)

                     if(lat == latitude && long == lotitude) {

                        let date = new Date();
	                    let time = date.getHours()+":"+date.getMinutes();

                        let days = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', "Jum'at", 'Sabtu'];
                        let months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', "Juni", 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                        let dayName = days[date.getDay()];
                        let monthName = months[date.getMonth()]
                        let currDate = `${dayName}, ${date.getDate()} ${monthName} ${date.getFullYear()}`

                        await conn.sendMessage(from, {text: `Berhasil melakukan absensi! 🤩\n\nNama : *${registered}*\n🕐 Jam Absensi : ${time} WIB\n🗓️ Tipe Absensi : ${check}\n📆 Tanggal Absensi : ${currDate}`})

                        await conn.sendMessage("6285646467552@s.whatsapp.net", {text: `*DATA ABSENSI*\n\nNama : *${registered}*\n🕐 Jam Absensi : ${time} WIB\n🗓️ Tipe Absensi : ${check}\n📆 Tanggal Absensi : ${currDate}`})
                     } else {
                        await conn.sendMessage(from, {text: "Tampaknya lokasi anda tidak akurat atau sedang tidak berada di sekolah 😞 \n\n_Silahkan ulangi proses absensi anda._"})
                     }
         
                     
                 }

            } else {
               }

        } 

        

    })

    conn.ev.on('groups.upsert', async g => {
        
    })
// this will be called as soon as the credentials are updated
conn.ev.on ('creds.update', saveCreds)
}

connectTOWA()
