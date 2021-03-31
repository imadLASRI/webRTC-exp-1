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
    let channel = {};

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

        console.log('pusher = ');
        console.log(pusher);

        console.log('subscribing to channel...');
        window.channel = pusher.subscribe('presence-video-channel');

        console.log('before channel binding : ');
        console.log(window.channel);
        console.log('channel bind...');

        window.channel.bind(`client-signal-${user.id}`, (signal) => {
            let peer = peers[signal.userId];

            // if peer is not already exists, we got an incoming call
            if(peer === undefined) {
                console.log('--------------peer not defined------------')
                console.log('setOtherUserId & startPeer');
                // setOtherUserId(signal.userId);
                otherUserId = signal.userId;
                peer = startPeer(signal.userId, false);
            }

            peer.signal(signal.data);
        });

        console.log('channel bound');
    };

    setupPusher();

    console.log('global channel : ');
    console.log(window.channel);

    // channel is undefined here...
    let startPeer = (userId, initiator = true) => {
        console.log('startPeer');
        console.log(hasMedia);
        
        const peer = new Peer({
            initiator,
            stream: user.stream,
            trickle: false
        });

        console.log('signal triggering..');

        // FILL THIS
        console.log(window.channel)

        peer.on('signal', (data) => {
            window.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: user.id,
                data: data
            });
        });

        console.log('playing stream..');
        peer.on('stream', (stream) => {
            try {
                console.log('userVideo.current.srcObject = stream;');
                userVideo.current.srcObject = stream;
            } catch (e) {
                console.error(e)
                console.log('------------- ----------');
                userVideo.current.src = URL.createObjectURL(stream);
            }

            console.log('userVideo.current.play()');
            userVideo.current.play();
        });

        peer.on('close', () => {
            let peer = peers[userId];
            if(peer !== undefined) {
                peer.destroy();
            }

            peers[userId] = undefined;
        });

        return peer;
    }

    let callTo = (userId) => {
        peers[userId] = startPeer(userId);
    }

    useEffect(() => {
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
            })
    }, [])

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
        </div>
    );

}

export default App ;

if (document.getElementById('app'))
{
    ReactDOM.render(<App />, document.getElementById('app'));
}
