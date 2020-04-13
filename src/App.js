import React from 'react';
import logo from './logo.svg';
import './App.css';
import Peaks from "peaks.js"
import webAudioBuilder from 'waveform-data/webaudio'
import WaveformData from 'waveform-data';
import track from './track.dat'
import keycode from 'keycode'
import toWav from "audiobuffer-to-wav"
const { ipcRenderer } = require('electron')

class App extends React.Component {
  state = {
    file: false
  }

  keyDown = (e) => {
    if(keycode(e) == "space"){
      e.preventDefault()
      if(this.audio.paused)
      {
        // this.audio.play() 
        this.peaks.player.playSegment(this.peaks.segments.getSegments()[0]);
      }else{
        this.audio.pause();

      }
    }
  }

  componentDidMount() {
    document.addEventListener("keydown", this.keyDown);


    navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      .then((stream) => {

        let recordedChunks = [];
        const mediaRecorder = new MediaRecorder(stream);
        this.mediaRecorder = mediaRecorder

        mediaRecorder.addEventListener('dataavailable', function (e) {
          console.log('da')
          console.log('e.data: ', e.data);
          if (e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        });

        mediaRecorder.addEventListener('error', function (err) {
          console.log('error', err)
        });

        mediaRecorder.addEventListener('stop', async () => {
          this.setState({
            file: {
              data: URL.createObjectURL(
                recordedChunks[0]
              ),
              name: "horsey.webm"
            }
          })

          // this.audio.data = URL.createObjectURL(
          //   recordedChunks[0]
          // )
          this.audiobuffer = await this.blobToAudioBuffer(recordedChunks[0])
          const info = this.getAudioBufferInfo(this.audiobuffer)
          this.info = info
          console.log('info: ', info);
          this.initpeaks(info)

          recordedChunks = []
        });

      })


  }

  getAudioBufferInfo = (audioBuffer) => {

    // Do something with audioBuffer
    const erp = audioBuffer.getChannelData(0)
    const startOffset = erp.findIndex(a => a > 0.5) - 1000
    const endOffset = erp.length - ([...erp].reverse().findIndex(a => a > 0.5) - 1000)


    return {
      soundStart: startOffset / audioBuffer.sampleRate,
      soundEnd: endOffset / audioBuffer.sampleRate,
      duration: audioBuffer.duration
    }



  }

  start = () => {
    this.mediaRecorder.start()
  }

  blobToAudioBuffer = async (blob) => {
    const audioContext = new AudioContext()
    const fileReader = new FileReader()

    const audiobuffer = await new Promise(resolve => {
      // Set up file reader on loaded end event
      fileReader.onloadend = () => {

        const arrayBuffer = fileReader.result

        // Convert array buffer into audio buffer
        audioContext.decodeAudioData(arrayBuffer, (audioBuffer) => {





          resolve(audioBuffer)
        })

      }

      //Load blob
      fileReader.readAsArrayBuffer(blob)

    })
    return audiobuffer


  }


  download = async () => {
    const audiobuffer = this.audiobuffer
    const seg = this.peaks.segments.getSegments()

    const startOffset = seg[0].startTime * audiobuffer.sampleRate
    const endOffset = seg[0].endTime * audiobuffer.sampleRate

    const audioContext = new AudioContext()
    const newAB = audioContext.createBuffer(audiobuffer.numberOfChannels, endOffset - startOffset, audiobuffer.sampleRate);
    var anotherArray = new Float32Array(endOffset - startOffset);
    audiobuffer.copyFromChannel(anotherArray, 0, startOffset);
    newAB.copyToChannel(anotherArray, 0, 0);

    var wav = toWav(newAB)
    var blob = new window.Blob([new DataView(wav)], {
      type: 'audio/wav'
    })

    var url = window.URL.createObjectURL(blob)

    ipcRenderer.send("arraybuffer", await blob.arrayBuffer())

  }

  initpeaks = async (info) => {
    console.log('ip')
    const options = {
      containers: {
        overview: false,
        zoomview: this.zoomview
      },
      mediaElement: this.audio,
      webAudio: {
        audioBuffer: this.audiobuffer
      },
      zoomLevels: [20, 512, 1024, 2048, 4096],
      segments: [{
        startTime: info.soundStart,
        endTime: info.soundEnd,
        editable: true,
        color: "rgba(85, 85, 85, 1)",
        labelText: "Export Segment"
      }],
      zoomWaveformColor:"#282828"
    };

    Peaks.init(options, (err, peaks) => {
      // Do something when the waveform is displayed and ready
      this.peaks = peaks
      const view = peaks.views.getView('zoomview');
      console.log('view: ', view);
      view.setZoom({ seconds: info.duration + 0.1 });
    });
  }

  render() {
    return (
      <div className="App">
        <audio style={{visibility:"hidden"}} src={this.state.file.data} id="player" controls ref={r => this.audio = r}></audio>
        <button onClick={() => {
          this.mediaRecorder.stop()
        }}>Stop</button>
        <button onClick={() => {
          this.start()
        }}>start</button>
        <button onClick={() => {
          this.download()
        }}>download</button>
        <div ref={a => this.overview = a} style={{ opacity: 0 }} />
        <div ref={a => this.zoomview = a} />
        {/* <canvas ref={a => this.canvas = a} /> */}

        {/* {this.state.file &&
          <a href={this.state.file.data} download={this.state.file.name}>{this.state.file.name}</a>
        } */}
        <div style={{
          padding: 250,
          background: 'yellow'
        }} onDragStart={(event) => {
          event.preventDefault()
          ipcRenderer.send('ondragstart', '/path/to/item')
        }} draggable>
          🍔DRAG ME🍔
        </div>
      </div>
    );

  }
}

export default App;


/*

const WIDTH = canvas.width
    const HEIGHT = canvas.height;

    const erp = audiobuffer.getChannelData(0)
    const ctx = canvas.getContext('2d');
    ctx.beginPath();

    ctx.translate(0, HEIGHT / 2)

    const gm = (HEIGHT / 2) / Math.max(...erp)
    erp.forEach((a, i) => {
      ctx.lineTo((i / erp.length) * WIDTH, a * gm)
    })

    ctx.stroke();

*/