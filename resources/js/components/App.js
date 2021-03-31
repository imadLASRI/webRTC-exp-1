import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';


const App = () => {
    console.log("===========render============");
    const APP_KEY = '7ef358eb5f365260bd07'; 

    // const [hasMedia, setHasMedia] = useState(false);
        let hasMedia = false;
    // const [otherUserId, setOtherUserId] = useState(null);
        let otherUserId = null;
    
    const myVideo = useRef(null);
    const userVideo = useRef(null);

    let user = window.user;
    user.stream = null;
    let peers = {};
    
    // Timer state
    const [start, setStart] = useState('');
    const [finish, setFinish] = useState('');

    let mediaHandler = new MediaHandler();

    let setupPusher = () => {
        console.log('starting pusher setup...');
        let pusher = new Pusher(APP_KEY, {
            authEndpoint: '/pusher/auth',
            cluster: 'eu',
            auth: {
                params: user.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        window.channel = pusher.subscribe('presence-video-channel');

        window.channel.bind(`client-signal-${user.id}`, (signal) => {
            let peer = peers[signal.userId];

            // if peer is not already exists, we got an incoming call
            if(peer === undefined) {
                console.log('--------------peer not defined------------')
                // setOtherUserId(signal.userId);
                otherUserId = signal.userId;
                peer = startPeer(signal.userId, false);
            }

            peer.signal(signal.data);
        });
    };

    let startPeer = (userId, initiator = true) => {
        const peer = new Peer({
            initiator,
            stream: user.stream,
            trickle: false
        });

        peer.on('signal', (data) => {
            console.log('peer signaling.......');
            window.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: user.id,
                data: data
            });
        });

        peer.on('stream', (stream) => {
            console.log('peer playing stream...');
            try {
                userVideo.current.srcObject = stream;
            } catch (e) {
                console.error(e)
                console.log('---------catch---------');
                userVideo.current.src = URL.createObjectURL(stream);
            }

            console.log('userVideo.current.play()');
            userVideo.current.play();
            console.log('is started ?');
            console.log(start);

            let now = new Date();
            now = `${now.getHours()}:${now.getMinutes()}`

            setStart(now.toString())
        });

        peer.on('close', () => {
            console.log('peer CLOSED !');
            let peer = peers[userId];
            if(peer !== undefined) {
                peer.destroy();
                console.log('closed & peer destroyed !');

                let now = new Date();
                now = `${now.getHours()}:${now.getMinutes()}`

                setFinish(now.toString())
            }

            peers[userId] = undefined;
        });

        peer.on('error', () => {
            console.log('error OR connection closed');
        });

        return peer;
    }

    let callTo = (userId) => {
        peers[userId] = startPeer(userId);
    }

    useEffect(() => {
        console.log('parrent useEffect ');
        mediaHandler.getPermissions()
            .then((stream) => {
                hasMedia = true;
                user.stream = stream;

                try{
                    myVideo.current.srcObject = stream;
                } catch(err)
                {
                    myVideo.current.src = URL.createObjectURL(stream);
                }
                
                myVideo.current.play();
                setupPusher();
            })
    }, []);

    return (
        <div className="App">
            {[1,2].map((userId) => {
                return user.id !== userId ? <button key={userId} onClick={() => callTo(userId)}>User {userId}</button> : null;
            })}

            <div className="video-container">
                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <video className="my-video" ref={myVideo}></video>
                    <span>My Video</span>
                </div>

                <div style={{display: 'flex', flexDirection: 'column'}}>
                    <video className="user-video" ref={userVideo}></video>
                    <span>User Video</span>
                </div>
            </div>

            <Timer start={start} finish={finish}/>
        </div>
    );

}

export default App ;


const Timer = ({ start, finish }) => {
    console.log('timer rendered');

    useEffect( () => {
        console.log('timer useEffect');
    }, [start, finish]);

    return (
        <div style={{marginLeft: '40px'}}>
            <span>conversation state  : {start && !finish ? 'ON' : 'OFF'}</span>
            <br/>
            <span>Timer :</span><br/>
            { start !== '' && <span>start : {start}</span>}
            <br/>
            { finish !== '' && <span>finish : {finish}</span>}
        </div>
    )
}


if (document.getElementById('app'))
{
    ReactDOM.render(<App />, document.getElementById('app'));
}
