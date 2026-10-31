import SpriteKit

@MainActor
struct HUDNodes {
    var score = GameScene.label(20)
    var lives: [SKSpriteNode] = []
    var integLabel = GameScene.label(9, color: Palette.dim, align: .left)
    var segs: [SKSpriteNode] = []
    var powerBars: [SKSpriteNode] = []
    var combo = GameScene.label(13, color: Palette.gold, align: .right)
    var pause = SKSpriteNode(texture: Tex.get("ui_pause"), size: CGSize(width: 40, height: 40))
    var mute = SKSpriteNode(texture: Tex.get("ui_sound"), size: CGSize(width: 40, height: 40))
    var shock = SKSpriteNode(texture: Tex.get("ui_shock"), size: CGSize(width: 80, height: 80))
    var pips: [SKSpriteNode] = []

    var bannerBG = SKSpriteNode(color: SKColor(red: 0.04, green: 0.025, blue: 0.02, alpha: 0.55), size: .zero)
    var bannerTitle = GameScene.label(26, color: Palette.text)
    var bannerSub = GameScene.label(11, color: Palette.dim)

    var title = SKNode()
    var logo = SKSpriteNode(texture: Tex.get("logo"))
    var subtitle = GameScene.label(12, color: Palette.dim)
    var lines: [SKLabelNode] = (0..<3).map { _ in GameScene.label(10, color: Palette.dim) }
    var start = GameScene.label(16, color: Palette.gold)
    var record = GameScene.label(10, color: Palette.dim)

    var dim = SKSpriteNode(color: SKColor(red: 0.03, green: 0.02, blue: 0.015, alpha: 0.62), size: .zero)
    var bigText = GameScene.label(34, color: Palette.text)
    var midText = GameScene.label(18, color: Palette.text)
    var smallText = GameScene.label(11, color: Palette.dim)
    var actionText = GameScene.label(15, color: Palette.gold)
}

extension GameScene {
    struct Banner { var title: String; var sub: String; var t: CGFloat }

    static func label(_ size: CGFloat, color: SKColor = Palette.text, align: SKLabelHorizontalAlignmentMode = .center) -> SKLabelNode {
        let l = SKLabelNode(fontNamed: Fonts.main)
        l.fontSize = size
        l.fontColor = color
        l.horizontalAlignmentMode = align
        l.verticalAlignmentMode = .center
        return l
    }

    // Botones en coordenadas de juego
    var shockButton: (CGPoint, CGFloat) { (CGPoint(x: VW - 62, y: VH - safeBottom - 74), 44) }
    var pauseButton: (CGPoint, CGFloat) { (CGPoint(x: VW - 28, y: safeTop + 28), 26) }
    var muteButton: (CGPoint, CGFloat) { (CGPoint(x: VW - 76, y: safeTop + 28), 26) }

    func buildHUD() {
        hud.addChild(ui.score)
        ui.score.horizontalAlignmentMode = .left
        for _ in 0..<5 {
            let l = SKSpriteNode(texture: Tex.get("ship_4"), size: CGSize(width: 76 * 0.26, height: 72 * 0.26))
            hud.addChild(l)
            ui.lives.append(l)
        }
        ui.integLabel.text = "INTEGRIDAD"
        hud.addChild(ui.integLabel)
        for _ in 0..<10 {
            let s = SKSpriteNode(color: Palette.bio, size: .zero)
            s.anchorPoint = CGPoint(x: 0, y: 0.5)
            hud.addChild(s)
            ui.segs.append(s)
        }
        for k in [PickupKind.impact, .wide] {
            let b = SKSpriteNode(color: Palette.pickup(k), size: .zero)
            b.anchorPoint = CGPoint(x: 0, y: 0.5)
            hud.addChild(b)
            ui.powerBars.append(b)
        }
        hud.addChild(ui.combo)
        for b in [ui.pause, ui.mute, ui.shock] { hud.addChild(b) }
        for _ in 0..<3 {
            let p = SKSpriteNode(texture: Tex.get("dot"), size: CGSize(width: 6.5, height: 6.5))
            p.colorBlendFactor = 1
            hud.addChild(p)
            ui.pips.append(p)
        }

        ui.bannerBG.zPosition = -0.1
        for n in [ui.bannerBG, ui.bannerTitle, ui.bannerSub] { n.alpha = 0; overlay.addChild(n) }

        overlay.addChild(ui.title)
        ui.logo.size = CGSize(width: 340, height: 340 * 220 / 1200)
        ui.subtitle.text = "ARCADE CIBERORGÁNICO"
        ui.start.text = "TOCÁ PARA EMPEZAR"
        for n in [ui.logo, ui.subtitle, ui.start, ui.record] { ui.title.addChild(n) }
        for l in ui.lines { ui.title.addChild(l) }

        ui.dim.zPosition = -0.2
        for n in [ui.dim, ui.bigText, ui.midText, ui.smallText, ui.actionText] { overlay.addChild(n) }
        showScreen()
    }

    func layoutHUD() {
        let top = safeTop + 14
        ui.score.position = P(16, top + 8)
        for (i, l) in ui.lives.enumerated() { l.position = P(26 + CGFloat(i) * 22, top + 34) }
        let bx: CGFloat = 132, bw = min(150, VW * 0.36)
        ui.integLabel.position = P(bx, top + 27)
        for (i, s) in ui.segs.enumerated() {
            s.position = P(bx + CGFloat(i) * bw / 10, top + 38)
            s.size = CGSize(width: bw / 10 - 2, height: 7)
        }
        for (i, b) in ui.powerBars.enumerated() { b.position = P(bx + CGFloat(i) * bw / 2, top + 48) }
        ui.combo.position = P(VW - 104, top + 14)
        ui.pause.position = P(pauseButton.0.x, pauseButton.0.y)
        ui.mute.position = P(muteButton.0.x, muteButton.0.y)
        ui.shock.position = P(shockButton.0.x, shockButton.0.y)
        for (i, p) in ui.pips.enumerated() { p.position = P(shockButton.0.x - 10 + CGFloat(i) * 10, shockButton.0.y + 25) }

        let by = VH * 0.36
        ui.bannerBG.size = CGSize(width: VW, height: 58)
        ui.bannerBG.position = P(VW / 2, by)
        ui.bannerTitle.position = P(VW / 2, by - 7)
        ui.bannerSub.position = P(VW / 2, by + 17)

        ui.logo.position = P(VW / 2, VH * 0.2)
        ui.subtitle.position = P(VW / 2, VH * 0.2 + 36)
        for (i, l) in ui.lines.enumerated() { l.position = P(VW / 2, VH * 0.7 + CGFloat(i) * 18) }
        ui.start.position = P(VW / 2, VH * 0.84)
        ui.record.position = P(VW / 2, VH - safeBottom - 24)

        ui.dim.size = CGSize(width: VW, height: VH)
        ui.dim.position = P(VW / 2, VH / 2)
        ui.bigText.position = P(VW / 2, VH * 0.38)
        ui.midText.position = P(VW / 2, VH * 0.46)
        ui.smallText.position = P(VW / 2, VH * 0.46 + 26)
        ui.actionText.position = P(VW / 2, VH * 0.6)
    }

    /// Muestra/oculta los elementos según el modo actual.
    func showScreen() {
        let inGame = mode != .title
        hud.isHidden = !inGame
        ui.title.isHidden = mode != .title
        let touch: Bool
        #if os(iOS)
        touch = true
        #else
        touch = false
        #endif
        let lines = touch
            ? ["ARRASTRÁ EN CUALQUIER LUGAR PARA MOVER", "DISPARO AUTOMÁTICO", "ONDA: EMPUJA Y HACE CHOCAR ENEMIGOS"]
            : ["FLECHAS / WASD (O ARRASTRAR CON EL MOUSE)", "ESPACIO = ONDA  ·  P = PAUSA  ·  M = SONIDO", "HACÉ CHOCAR A LOS ENEMIGOS ENTRE SÍ"]
        for (l, s) in zip(ui.lines, lines) { l.text = s }
        if !touch { ui.start.text = "ESPACIO O CLIC PARA EMPEZAR" }
        ui.record.text = best > 0 ? "RÉCORD \(best)" : ""

        let overlayOn = mode == .paused || mode == .over
        for n in [ui.dim, ui.bigText, ui.midText, ui.smallText, ui.actionText] { n.isHidden = !overlayOn }
        if mode == .paused {
            ui.bigText.text = "PAUSA"
            ui.midText.text = ""
            ui.smallText.text = touch ? "TOCÁ PARA SEGUIR" : "P O CLIC PARA SEGUIR"
            ui.actionText.text = ""
        } else if mode == .over {
            ui.bigText.text = "NAVE PERDIDA"
            ui.midText.text = "\(score)"
            ui.smallText.text = "RÉCORD \(best)  ·  SECTOR \(loop + 1)"
            ui.actionText.text = touch ? "TOCÁ PARA REINTENTAR" : "ESPACIO PARA REINTENTAR"
        }
    }

    func banner(_ title: String, _ sub: String) {
        currentBanner = Banner(title: title, sub: sub, t: 0)
        ui.bannerTitle.text = title
        ui.bannerSub.text = sub.uppercased()
        ui.bannerTitle.position = P(VW / 2, VH * 0.36 - (sub.isEmpty ? 0 : 7))
        Sound.shared.play("banner", gap: 0.5, volume: 0.6)
    }

    func updateBanner(_ dt: CGFloat) {
        guard var b = currentBanner else { return }
        if mode != .paused { b.t += dt }
        let a = max(0, min(1, b.t * 4, (2.6 - b.t) * 3))
        for n in [ui.bannerBG, ui.bannerTitle, ui.bannerSub] { n.alpha = a }
        currentBanner = b.t > 2.6 ? nil : b
    }

    func renderHUD() {
        if mode == .title {
            ui.start.alpha = Int(t * 2) % 2 == 0 ? 1 : 0
            return
        }
        ui.score.text = String(format: "%07ld", score)
        for (i, l) in ui.lives.enumerated() { l.isHidden = i >= lives }
        let s = ship
        let integ = (s?.integ ?? 0) / 100
        let col: SKColor = integ < 0.3 ? (Int(t * 6) % 2 == 0 ? Palette.danger : SKColor(red: 0.66, green: 0.13, blue: 0.18, alpha: 1))
            : integ < 0.6 ? Palette.warn : Palette.bio
        for (i, seg) in ui.segs.enumerated() {
            seg.color = integ > CGFloat(i) / 10 + 0.001 ? col : Palette.off
        }
        let bw = min(150, VW * 0.36)
        let impact = (s?.impactT ?? 0) / 10, wide = (s?.wideT ?? 0) / 12
        ui.powerBars[0].size = CGSize(width: max(0, (bw / 2 - 4) * impact), height: 3)
        ui.powerBars[1].size = CGSize(width: max(0, (bw / 2 - 4) * wide), height: 3)
        if combo >= 4 {
            ui.combo.text = "x\(min(8, 1 + combo / 4))  CADENA \(combo)"
            ui.combo.isHidden = false
        } else {
            ui.combo.isHidden = true
        }
        let charges = s?.charges ?? 0
        ui.shock.alpha = charges > 0 ? 1 : 0.45
        for (i, p) in ui.pips.enumerated() {
            if i < charges {
                p.color = Palette.bio; p.alpha = 1
            } else if i == charges, let s {
                p.color = Palette.bio; p.alpha = 0.15 + 0.5 * s.chargeT / 14   // recargando
            } else {
                p.color = Palette.off; p.alpha = 1
            }
        }
        ui.actionText.alpha = (mode == .over && modeT > 1 && Int(t * 2) % 2 == 0) ? 1 : 0
        if mode == .over { ui.dim.alpha = min(1, modeT * 1.5) } else { ui.dim.alpha = 1 }
    }
}
