import React from 'react';
import Peaks from "peaks.js"
import webAudioBuilder from 'waveform-data/webaudio'
import WaveformData from 'waveform-data';
import track from './track.dat'
import keycode from 'keycode'
import toWav from "audiobuffer-to-wav"
const { ipcRenderer } = require('electron')

export default class Recorder extends React.Component {
  state = {
    file: false
  }

  keyDown = (e) => {
    // return
    if (keycode(e) == "p") {
      e.preventDefault()
      this.play()
    }
    if (keycode(e) == "r") {
      this.audio.loop = true
    }
  }

  play = () => {
    if (this.audio.paused) {
      // this.audio.play() 
      if (this.peaks) {
        this.peaks.player.playSegment(this.peaks.segments.getSegments()[0]);

      }
    } else {
      this.audio.pause();

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
          await this.initpeaks(info)

          recordedChunks = []

          this.play()
        });

      })


  }

  getAudioBufferInfo = (audioBuffer) => {
    const TRESHOLD = 0.04
    // Do something with audioBuffer
    const erp = audioBuffer.getChannelData(0)
    let startOffset = erp.findIndex(a => a > TRESHOLD) - 1500
    console.log('startOffset: ', startOffset);
    if (startOffset < 0) {
      startOffset = 0
    }
    let endOffset = erp.length - ([...erp].reverse().findIndex(a => a > TRESHOLD) - 1500)
    if (endOffset < 0) {
      endOffset = 0
    }


    return {
      soundStart: startOffset / audioBuffer.sampleRate,
      soundEnd: endOffset / audioBuffer.sampleRate,
      duration: audioBuffer.duration
    }



  }

  start = () => {
    this.mediaRecorder.start()
  }

  stop = () => {
    this.mediaRecorder.stop()
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
      zoomWaveformColor: "#282828"
    };
    await new Promise(resolve => {
      Peaks.init(options, (err, peaks) => {
        // Do something when the waveform is displayed and ready
        this.peaks = peaks
        const view = peaks.views.getView('zoomview');
        console.log('view: ', view);
        view.setZoom({ seconds: info.duration + 0.1 });
        resolve()
      });

    })
  }



  render() {
    return (
      <div className="Recorder"

      >
        <audio style={{ display: "none" }} src={this.state.file.data} id="player" controls ref={r => this.audio = r}></audio>
        <button
          onMouseDown={e => {
            this.start()
          }}
          onMouseUp={e => {
            this.mediaRecorder.stop()
          }}
        >Hold to record</button>
        {/* <button onClick={() => {
          this.download()
        }}>download</button> */}
        <button onClick={() => {
          this.play()
        }}>play</button>
        <button style={{
          // padding: 250,
          background: 'yellow'
        }} onDragStart={(event) => {
          event.preventDefault()
          this.download()
          setTimeout(() => {
            ipcRenderer.send('ondragstart', '/path/to/item')

          },500)
        }} draggable>
          🍔DRAG ME🍔
        </button>
        <div ref={a => this.zoomview = a} style={{
          height: 150
        }} />
        {/* <canvas ref={a => this.canvas = a} /> */}

        {/* {this.state.file &&
          <a href={this.state.file.data} download={this.state.file.name}>{this.state.file.name}</a>
        } */}

      </div>
    );

  }
}
