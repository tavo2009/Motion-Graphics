import AVFoundation
import QuartzCore

/// Efectos con latencia mínima: buffers precargados en memoria y un grupo de reproductores.
/// Cada efecto tiene varias variantes (golpe_0.wav, golpe_1.wav…) que se eligen al azar.
final class Sound {
    static let shared = Sound()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private let musicPlayer = AVAudioPlayerNode()
    private var buffers: [String: [AVAudioPCMBuffer]] = [:]
    private var music: AVAudioPCMBuffer?
    private var last: [String: CFTimeInterval] = [:]
    private var nextPlayer = 0
    private var musicOn = false
    private(set) var ready = false

    var muted = false {
        didSet { engine.mainMixerNode.outputVolume = muted ? 0 : 1 }
    }

    private static let names = [
        "shot", "slug", "hit_armor", "hit_plate", "hit_flesh", "hit_shell", "plate_off", "clang", "wall",
        "explode_s", "explode_m", "explode_l", "explode_xl", "shock", "telegraph", "eshot",
        "player_hit", "pickup", "banner",
    ]

    private init() {
        #if os(iOS)
        // .ambient: respeta el interruptor de silencio y se mezcla con la música del usuario
        try? AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
        try? AVAudioSession.sharedInstance().setActive(true)
        #endif
        var format: AVAudioFormat?
        for name in Self.names {
            var list: [AVAudioPCMBuffer] = []
            var i = 0
            while let url = Bundle.main.url(forResource: "\(name)_\(i)", withExtension: "wav"),
                  let buf = Self.load(url) {
                list.append(buf)
                format = format ?? buf.format
                i += 1
            }
            if list.isEmpty { print("⚠️ Falta el sonido \(name)") }
            buffers[name] = list
        }
        if let url = Bundle.main.url(forResource: "music", withExtension: "wav") {
            music = Self.load(url)
        }
        guard let fmt = format ?? music?.format else { return }
        for _ in 0..<14 {
            let p = AVAudioPlayerNode()
            engine.attach(p)
            engine.connect(p, to: engine.mainMixerNode, format: fmt)
            players.append(p)
        }
        engine.attach(musicPlayer)
        engine.connect(musicPlayer, to: engine.mainMixerNode, format: music?.format ?? fmt)
        musicPlayer.volume = 0.45
        NotificationCenter.default.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: .main) { [weak self] _ in
            self?.start()
        }
        start()
    }

    private static func load(_ url: URL) -> AVAudioPCMBuffer? {
        guard let file = try? AVAudioFile(forReading: url),
              let buf = AVAudioPCMBuffer(pcmFormat: file.processingFormat, frameCapacity: AVAudioFrameCount(file.length))
        else { return nil }
        do { try file.read(into: buf) } catch { return nil }
        return buf
    }

    private func start() {
        engine.prepare()
        do { try engine.start() } catch { print("⚠️ Audio: \(error)"); return }
        for p in players { p.play() }
        ready = true
        if musicOn { musicOn = false; startMusic() }
    }

    /// `gap`: tiempo mínimo entre repeticiones del mismo efecto (evita la acumulación de golpes iguales).
    func play(_ name: String, gap: CFTimeInterval = 0.05, volume: Float = 1) {
        guard ready, let list = buffers[name], let buf = list.randomElement() else { return }
        let now = CACurrentMediaTime()
        if let t = last[name], now - t < gap { return }
        last[name] = now
        if !engine.isRunning { start() }
        let p = players[nextPlayer]
        nextPlayer = (nextPlayer + 1) % players.count
        p.volume = volume
        p.scheduleBuffer(buf, at: nil, options: .interrupts, completionHandler: nil)
        if !p.isPlaying { p.play() }
    }

    func startMusic() {
        guard !musicOn, let music, ready else { return }
        musicOn = true
        musicPlayer.stop()
        musicPlayer.scheduleBuffer(music, at: nil, options: .loops, completionHandler: nil)
        musicPlayer.play()
    }

    func stopMusic() {
        musicOn = false
        musicPlayer.stop()
    }
}
