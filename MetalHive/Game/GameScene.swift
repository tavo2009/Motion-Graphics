import SpriteKit

/// Coordenadas de juego: origen arriba a la izquierda, Y hacia abajo, en puntos lógicos (VW × VH).
/// `P(x, y)` convierte a coordenadas de SpriteKit dentro de `world`.
final class GameScene: SKScene {
    enum Mode { case title, play, paused, over }

    // Pantalla
    var VW: CGFloat = 390, VH: CGFloat = 844, SC: CGFloat = 1
    var safeTop: CGFloat = 0, safeBottom: CGFloat = 0
    let world = SKNode()
    let hud = SKNode()
    let overlay = SKNode()
    private let maskL = SKSpriteNode(color: .black, size: .zero)
    private let maskR = SKSpriteNode(color: .black, size: .zero)

    // Estado
    var mode: Mode = .title
    var t: CGFloat = 0, modeT: CGFloat = 0, stageT: CGFloat = 0, scrollT: CGFloat = 0
    var scriptIndex = 0, loop = 0, waitClear = false
    var hpMul: CGFloat = 1, bspd: CGFloat = 1
    var score = 0, best = UserDefaults.standard.integer(forKey: "metalhive.best"), lives = 3
    var combo = 0, comboT: CGFloat = 0
    var shake: CGFloat = 0, hitstop: CGFloat = 0, respawnT: CGFloat = 0
    var ship: Ship?
    var enemies: [Enemy] = []
    var bullets: [Bullet] = []
    var ebullets: [EnemyBullet] = []
    var pickups: [Pickup] = []
    var rings: [Ring] = []
    var parts: [Particle] = []
    var texts: [FloatText] = []
    var clouds: [Cloud] = []
    var nextCloudT: CGFloat = 3

    // Capas
    let groundA = SKSpriteNode(texture: Tex.get("terrain", ext: "jpg"))
    let groundB = SKSpriteNode(texture: Tex.get("terrain", ext: "jpg"))
    let vignette = SKSpriteNode(texture: Tex.get("vignette"))
    let shipNode = SKNode()
    var shipFrames: [SKTexture] = (0..<9).map { Tex.get("ship_\($0)") }
    let shipBody = SKSpriteNode(texture: Tex.get("ship_4"))
    let shipWhite = SKSpriteNode(texture: Tex.get("ship_white"))
    var flames: [SKSpriteNode] = []
    let core = SKSpriteNode(texture: Tex.get("glow"))
    let coreDot = SKSpriteNode(texture: Tex.get("dot"))

    // HUD y pantallas (ver GameScene+HUD.swift)
    var ui = HUDNodes()
    var currentBanner: Banner?

    // Entrada
    let pad = PadInput()
    var dragID: AnyHashable?
    var dragLast = CGPoint.zero
    var keysHeld = Set<UInt16>()
    var padMove = CGVector.zero
    let dragSensitivity: CGFloat = 1.2

    private var lastUpdate: TimeInterval = 0
    private var lastInsets: (CGFloat, CGFloat) = (-1, -1)

    // MARK: - Ciclo de vida

    override init(size: CGSize) {
        super.init(size: size)
        anchorPoint = .zero
        backgroundColor = SKColor(red: 0.05, green: 0.035, blue: 0.03, alpha: 1)
        Tex.preload()
        _ = Sound.shared
        buildLayers()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) no se usa") }

    override func didMove(to view: SKView) {
        relayout()
    }

    override func didChangeSize(_ oldSize: CGSize) {
        super.didChangeSize(oldSize)
        relayout()
    }

    private func buildLayers() {
        addChild(world)
        for g in [groundA, groundB] {
            g.anchorPoint = CGPoint(x: 0.5, y: 1)
            g.size = Cfg.terrainSize
            g.zPosition = 0
            world.addChild(g)
        }
        vignette.anchorPoint = .zero
        vignette.zPosition = 18
        world.addChild(vignette)

        shipNode.zPosition = 14
        for _ in 0..<2 {
            let f = SKSpriteNode(texture: Tex.get("flame"))
            f.anchorPoint = CGPoint(x: 0.5, y: 1)
            f.blendMode = .add
            f.zPosition = -0.1
            shipNode.addChild(f)
            flames.append(f)
        }
        let shipSize = CGSize(width: Cfg.shipModel.width * Cfg.shipScale, height: Cfg.shipModel.height * Cfg.shipScale)
        for s in [shipBody, shipWhite] {
            s.size = shipSize
            s.anchorPoint = Cfg.shipAnchor
            shipNode.addChild(s)
        }
        shipWhite.zPosition = 0.1
        shipWhite.alpha = 0
        core.size = CGSize(width: 16, height: 16)
        core.position = CGPoint(x: 0, y: -3)
        core.blendMode = .add
        core.zPosition = 0.2
        coreDot.size = CGSize(width: 4, height: 4)
        coreDot.position = CGPoint(x: 0, y: -3)
        coreDot.color = SKColor(red: 0.98, green: 1, blue: 0.9, alpha: 1)
        coreDot.colorBlendFactor = 1
        coreDot.zPosition = 0.3
        shipNode.addChild(core)
        shipNode.addChild(coreDot)
        shipNode.isHidden = true
        world.addChild(shipNode)

        hud.zPosition = 20
        world.addChild(hud)
        overlay.zPosition = 30
        world.addChild(overlay)
        buildHUD()

        for m in [maskL, maskR] {
            m.anchorPoint = .zero
            m.zPosition = 100
            addChild(m)
        }
    }

    // MARK: - Distribución de pantalla

    private func currentInsets() -> (CGFloat, CGFloat) {
        #if os(iOS)
        let ins = view?.safeAreaInsets ?? .zero
        return (ins.top, ins.bottom)
        #else
        return (0, 0)
        #endif
    }

    func relayout() {
        let vw = size.width, vh = size.height
        guard vw > 1, vh > 1 else { return }
        var playW = vw
        if vw / vh > Cfg.maxAspect { playW = (vh * Cfg.playAspect).rounded() }
        SC = min(playW / Cfg.minW, vh / Cfg.minH)
        VW = playW / SC
        VH = vh / SC
        world.setScale(SC)
        let offX = ((vw - playW) / 2).rounded()
        world.position = CGPoint(x: offX, y: 0)
        maskL.size = CGSize(width: offX, height: vh)
        maskL.position = .zero
        maskR.size = CGSize(width: vw - offX - playW + 1, height: vh)
        maskR.position = CGPoint(x: offX + playW, y: 0)
        let ins = currentInsets()
        lastInsets = ins
        safeTop = offX > 0 ? 0 : ins.0 / SC
        safeBottom = offX > 0 ? 0 : ins.1 / SC
        vignette.size = CGSize(width: VW, height: VH)
        if let s = ship {
            s.x = clamp(s.x, 22, VW - 22); s.tx = s.x
            s.y = clamp(s.y, 0, VH - 34); s.ty = s.y
        }
        layoutHUD()
    }

    @inline(__always) func P(_ x: CGFloat, _ y: CGFloat) -> CGPoint { CGPoint(x: x, y: VH - y) }

    // MARK: - Partida

    func startGame() {
        for e in enemies { e.node.removeFromParent() }
        for b in bullets { b.node.removeFromParent() }
        for b in ebullets { b.node.removeFromParent() }
        for p in pickups { p.node.removeFromParent() }
        for r in rings { r.node.removeFromParent() }
        for p in parts { p.node.removeFromParent() }
        for x in texts { x.label.removeFromParent() }
        enemies = []; bullets = []; ebullets = []; pickups = []; rings = []; parts = []; texts = []
        mode = .play; modeT = 0; stageT = 0; scriptIndex = 0; loop = 0; waitClear = false
        hpMul = 1; bspd = 1; score = 0; lives = 3; combo = 0; comboT = 0; respawnT = 0
        ship = Ship(x: VW / 2, y: VH - safeBottom - 140)
        Sound.shared.startMusic()
        showScreen()
    }

    func togglePause() {
        if mode == .play { mode = .paused; Sound.shared.stopMusic() }
        else if mode == .paused { mode = .play; Sound.shared.startMusic() }
        showScreen()
    }

    /// La app pasó a segundo plano o perdió el foco.
    func autoPause() {
        dragID = nil
        keysHeld.removeAll()
        if mode == .play { togglePause() }
    }

    func toggleMute() {
        Sound.shared.muted.toggle()
        ui.mute.texture = Tex.get(Sound.shared.muted ? "ui_mute" : "ui_sound")
    }

    // MARK: - Bucle

    override func update(_ currentTime: TimeInterval) {
        let dt = CGFloat(lastUpdate == 0 ? 1.0 / 60 : min(1.0 / 30, currentTime - lastUpdate))
        lastUpdate = currentTime
        let ins = currentInsets()
        if ins != lastInsets { relayout() }
        handlePad()
        step(dt)
        render(dt)
    }

    private func step(_ dt: CGFloat) {
        t += dt
        modeT += dt
        if mode != .paused { scrollT += dt }
        updateBanner(dt)
        guard mode == .play else {
            if mode != .paused { updateParticles(dt) }
            return
        }
        if hitstop > 0 { hitstop -= dt; return }
        runScript(dt)
        updateShip(dt)
        for e in enemies { updateEnemy(e, dt) }
        enemyCollisions()
        updateBullets(dt)
        updateRings(dt)
        updateEnemyBullets(dt)
        bodyCollisions()
        updatePickups(dt)
        comboT -= dt
        if comboT <= 0 { combo = 0 }
        cleanup()
        updateParticles(dt)
    }

    private func cleanup() {
        enemies.removeAll { e in
            if e.dead || e.gone { e.node.removeFromParent(); return true }
            return false
        }
        bullets.removeAll { b in
            if b.dead { b.node.removeFromParent(); return true }
            return false
        }
        ebullets.removeAll { b in
            if b.dead { b.node.removeFromParent(); return true }
            return false
        }
        pickups.removeAll { p in
            if p.dead { p.node.removeFromParent(); return true }
            return false
        }
    }

    // MARK: - Dibujo (sincroniza nodos con el estado)

    private func render(_ dt: CGFloat) {
        let sx = shake > 0.3 ? rnd(-shake, shake) : 0
        let sy = shake > 0.3 ? rnd(-shake, shake) : 0

        // Suelo a ~5000 m: avanza lento y apenas se corre con la nave (paralaje)
        let shipX = (mode == .play || mode == .paused) ? (ship?.x ?? VW / 2) : VW / 2
        let off = (scrollT * Cfg.groundSpeed).truncatingRemainder(dividingBy: Cfg.terrainSize.height)
        let gx = VW / 2 - (shipX - VW / 2) * Cfg.groundParallax
        groundA.position = P(gx + sx * 0.3, off - Cfg.terrainSize.height + sy * 0.3)
        groundB.position = P(gx + sx * 0.3, off + sy * 0.3)
        updateClouds(dt, shipX: shipX)

        for e in enemies {
            var rot = e.rot
            if e.kind == .stinger { rot += atan2(-(e.vx + e.kx), e.vy + e.ky + 1) }
            e.node.position = P(e.x + sx, e.y + sy)
            e.node.zRotation = -rot
            e.node.zPosition = e.kind == .beetle ? 10 : 11
            e.white.alpha = e.flash > 0 ? 0.85 : 0
            let flap = Int(t * 30 + e.x) % 2 == 0
            for (i, wing) in e.wings.enumerated() {
                let side: CGFloat = i == 0 ? -1 : 1
                wing.zRotation = -side * (flap ? 0.35 : 0.65)
            }
            if e.kind == .tabano {
                let k = e.st == .charge ? e.stT / 0.75 : 0
                for g in e.glows {
                    g.alpha = e.st == .charge ? 0.3 + k * 0.7 : 0
                    g.setScale(0.6 + k)
                }
            }
        }
        for b in bullets { b.node.position = P(b.x + sx, b.y + sy) }
        for b in ebullets {
            b.node.position = P(b.x + sx, b.y + sy)
            b.node.setScale(1 + sin(b.t * 20) * 0.08)
        }
        for p in pickups {
            p.node.position = P(p.x + sx, p.y + sy)
            p.node.zRotation = -p.t * 1.5
        }
        for r in rings {
            r.node.position = P(r.x + sx, r.y + sy)
            r.node.size = CGSize(width: r.r * 2, height: r.r * 2)
            r.node.alpha = r.baseAlpha * max(0, 1 - r.life / r.dur)
        }
        for p in parts {
            p.node.position = P(p.x + sx, p.y + sy)
        }
        for x in texts { x.label.position = P(x.x, x.y) }

        // Nave
        if let s = ship, s.alive, mode != .title {
            shipNode.isHidden = false
            shipNode.position = P(s.x + sx, s.y + sy)
            let idx = Int(((s.bank + 1) / 2 * 8).rounded())
            shipBody.texture = shipFrames[max(0, min(8, idx))]
            shipNode.zRotation = -s.bank * 0.08
            let blink = s.inv > 0 && Int(t * 16) % 2 == 0
            shipBody.alpha = blink ? 0.45 : 1
            shipWhite.alpha = s.inv > 0.9 ? min(0.8, (s.inv - 0.9) * 2) : 0
            for (i, p) in ShipGeo.engines(s.bank).enumerated() {
                let len = (12 + sin(t * 40 + CGFloat(i)) * 2.5 + rnd(0, 2.5)) * Cfg.shipScale * 1.15
                flames[i].position = CGPoint(x: p.x, y: -p.y + 1)
                flames[i].size = CGSize(width: 6 * Cfg.shipScale, height: len)
            }
            let pulse = 0.55 + sin(t * 6) * 0.2
            core.alpha = pulse
        } else if mode == .title {
            // nave de presentación
            shipNode.isHidden = false
            shipNode.position = P(VW / 2, VH * 0.47 + sin(t * 1.6) * 6)
            let bank = sin(t * 0.9) * 0.9
            let idx = Int(((bank + 1) / 2 * 8).rounded())
            shipBody.texture = shipFrames[max(0, min(8, idx))]
            shipBody.alpha = 1
            shipWhite.alpha = 0
            shipNode.zRotation = -bank * 0.08
            shipNode.setScale(2.2)
            for (i, p) in ShipGeo.engines(bank).enumerated() {
                let len = (13 + sin(t * 40 + CGFloat(i)) * 2.5) * Cfg.shipScale
                flames[i].position = CGPoint(x: p.x, y: -p.y + 1)
                flames[i].size = CGSize(width: 6 * Cfg.shipScale, height: len)
            }
            core.alpha = 0.55 + sin(t * 6) * 0.2
        } else {
            shipNode.isHidden = true
        }
        if mode != .title { shipNode.setScale(1) }
        renderHUD()
    }

    // MARK: - Nubes: pasan entre el suelo y la acción, muy difuminadas

    private func updateClouds(_ dt: CGFloat, shipX: CGFloat) {
        if mode != .paused {
            nextCloudT -= dt
            if nextCloudT <= 0 {
                nextCloudT = rnd(7, 16)
                let node = SKSpriteNode(texture: Tex.get("cloud_\(Int.random(in: 0...3))"))
                let k = rnd(1.0, 1.7)
                node.size = CGSize(width: 320 * k, height: 220 * k)
                node.alpha = rnd(0.22, 0.4)
                node.zPosition = 5
                node.xScale *= chance(0.5) ? -1 : 1
                world.addChild(node)
                clouds.append(Cloud(x: rnd(-40, VW + 40), y: -node.size.height / 2,
                                    vx: rnd(-5, 5), vy: Cfg.cloudSpeed * rnd(0.85, 1.15), node: node))
            }
        }
        for c in clouds {
            if mode != .paused { c.x += c.vx * dt; c.y += c.vy * dt }
            c.node.position = P(c.x - (shipX - VW / 2) * Cfg.cloudParallax, c.y)
        }
        clouds.removeAll { c in
            if c.y - c.node.size.height / 2 > VH { c.node.removeFromParent(); return true }
            return false
        }
    }
}
