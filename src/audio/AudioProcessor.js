import { applyHanningWindow } from './applyHanningWindow.js'
const audioProcessors = ['energy', 'spectralCentroid']
export class AudioProcessor {
    // An array of strings of names of processors
    thingsThatWork = ['SpectralFlux', 'SpectralSpread', 'SpectralCentroid']

    constructor(audioContext, sourceNode, fftSize = 2048) {
        const fftAnalyzer = audioContext.createAnalyser()
        fftAnalyzer.fftSize = fftSize

        this.fftData = new Uint8Array(fftAnalyzer.frequencyBinCount)
        this.fftAnalyzer = fftAnalyzer
        this.source = sourceNode.connect(fftAnalyzer)
        this.audioContext = audioContext
        this.fftSize = fftSize
        this.rawFeatures = {}
        this.features = {}
        this.workers = {}
    }

    getFrequencyData = () => {
        return this.fftData
    }

    start = async () => {
        const timestamp = Date.now()
        const { source, audioContext, rawFeatures } = this
        audioContext.audioWorklet.addModule(`/src/audio/analyzers/StatTracker.js?timestamp=${timestamp}`)

        for (const processor of audioProcessors) {
            await audioContext.audioWorklet.addModule(`/src/audio/analyzers/${processor}.js?timestamp=${timestamp}`)
            console.log(`Audio worklet ${processor} added`)
            rawFeatures[processor] = {}
            const audioProcessor = new AudioWorkletNode(audioContext, processor)
            source.connect(audioProcessor)
            const statTracker = new AudioWorkletNode(audioContext, 'StatTracker')
            audioProcessor.connect(statTracker)

            audioProcessor.port.addEventListener('message', (event) => {
                // console.log(`Audio worklet ${processor} message received`, event)
                rawFeatures[processor].value = event.data.value
            })
            statTracker.port.addEventListener('message', (event) => {
                this.rawFeatures[processor].stats = event.data.value
            })
            audioProcessor.port.start()
            statTracker.port.start()
            // audioProcessor.port.onmessage = (event) => {
            //     console.log(`Audio worklet ${processor} message received`, event)
            // }
        }
        // for (const workerName of this.thingsThatWork) {
        //     const worker = new Worker(`/src/audio/analyzers/${workerName}.js?timestamp=${timestamp}`)
        //     console.log(`Worker ${workerName} added`)
        //     worker.onmessage = (event) => {
        //         // console.log(`Worker ${workerName} message received`, event);;
        //         this.rawFeatures[workerName] = event.data
        //     }
        //     this.workers[workerName] = worker
        // }

        this.pullFFTData()
    }
    pullFFTData = () => {
        // this.fftAnalyzer.getByteTimeDomainData(this.fftData);
        this.fftAnalyzer.getByteFrequencyData(this.fftData)
        this.windowedFftData = applyHanningWindow(this.fftData)

        for (const worker in this.workers) {
            this.workers[worker].postMessage(this.windowedFftData)
        }

        // this.fftAnalyzer.getFloatFrequencyData(this.fftFloatData);
        this.updateLegacyFeatures()
        requestAnimationFrame(this.pullFFTData)
    }
    updateLegacyFeatures = () => {
        this.features = {}
        for (const processor in this.rawFeatures) {
            this.mapFeature(processor, this.rawFeatures[processor])
        }
    }
    mapFeature = (name, feature) => {
        if (!feature.value) return
        this.features[name] = feature.value
        if (!feature.stats) return
        this.features[`${name}Normalized`] = feature.stats.normalized
        this.features[`${name}Mean`] = feature.stats.mean
        this.features[`${name}StandardDeviation`] = feature.stats.standardDeviation
        this.features[`${name}ZScore`] = feature.stats.zScore
        this.features[`${name}Min`] = feature.stats.min
        this.features[`${name}Max`] = feature.stats.max
        console.log({ features: this.features })
    }
}
