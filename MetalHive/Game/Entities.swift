import SpriteKit

// MARK: - Utilidades

let TAU = CGFloat.pi * 2

@inline(__always) func clamp(_ v: CGFloat, _ a: CGFloat, _ b: CGFloat) -> CGFloat { min(max(v, a), b) }
@inline(__always) func rnd(_ a: CGFloat, _ b: CGFloat) -> CGFloat { a < b ? CGFloat.random(in: a...b) : a }
@inline(__always) func chance(_ p: CGFloat) -> Bool { CGFloat.random(in: 0..<1) < p }

// MARK: - Ajustes generales

enum Cfg {
    /// Resolución lógica mínima: iPhone vertical ≈ 390×844, iPad vertical ≈ 480×690.
    static let minW: CGFloat = 390
    static let minH: CGFloat = 690
    /// En pantallas apaisadas (Mac) el campo de juego se mantiene vertical.
    static let maxAspect: CGFloat = 0.8
    static let playAspect: CGFloat = 0.5625

    /// Escala de la nave: el modelo mide ~66 u → ~53 pt (≈13 % del ancho del iPhone).
    static let shipScale: CGFloat = 0.8
    static let shipModel = CGSize(width: 76, height: 72)
    static let shipAnchor = CGPoint(x: 0.5, y: 1 - 41.0 / 72.0)
    static let shipHitR: CGFloat = 4.5      // núcleo vulnerable
    static let shipBodyR: CGFloat = 11      // choque de cuerpo

    /// El suelo está ~5000 m por debajo: se desplaza lento. Las nubes, más cerca, más rápido.
    static let groundSpeed: CGFloat = 13
    static let groundParallax: CGFloat = 0.03
    static let terrainSize = CGSize(width: 540, height: 2048)
    static let cloudSpeed: CGFloat = 44
    static let cloudParallax: CGFloat = 0.1
}

/// Geometría de la nave según el rolido (igual que en el generador de arte).
enum ShipGeo {
    private static func T(_ x: CGFloat, _ y: CGFloat, _ z: CGFloat, _ bank: CGFloat) -> CGPoint {
        let r = bank * 0.7
        return CGPoint(x: (x * cos(r) + z * sin(r)) * Cfg.shipScale, y: y * Cfg.shipScale)
    }
    static func engines(_ bank: CGFloat) -> [CGPoint] { [T(-7.5, 26, 2, bank), T(7.5, 26, 2, bank)] }
    static func nose(_ bank: CGFloat) -> [CGPoint] { [T(-3.6, -37, 4, bank), T(3.6, -37, 4, bank)] }
    static func wings(_ bank: CGFloat) -> [CGPoint] { [T(-27, -13, 3, bank), T(27, -13, 3, bank)] }
}

// MARK: - Jugador

final class Ship {
    var x: CGFloat, y: CGFloat, tx: CGFloat, ty: CGFloat, px: CGFloat
    var bank: CGFloat = 0
    var integ: CGFloat = 100
    var inv: CGFloat = 2
    var alive = true
    var fireT: CGFloat = 0, slugT: CGFloat = 0, shotN = 0
    var impactT: CGFloat = 0, wideT: CGFloat = 0
    var charges = 2, chargeT: CGFloat = 0

    init(x: CGFloat, y: CGFloat) {
        self.x = x; self.y = y; tx = x; ty = y; px = x
    }
}

// MARK: - Enemigos

@MainActor
final class Enemy {
    enum Kind { case stinger, tabano, beetle }
    enum Mode { case dive, sweep, orbit }
    enum TState { case enter, hover, charge, cool, leave }

    struct Spec {
        let hp: CGFloat, r: CGFloat, mass: CGFloat, score: Int, drag: CGFloat, k: CGFloat
        let size: CGSize, anchor: CGPoint
    }

    static func spec(_ kind: Kind) -> Spec {
        switch kind {
        case .stinger:
            return Spec(hp: 2, r: 12, mass: 1, score: 100, drag: 3.2, k: 1.25,
                        size: CGSize(width: 32, height: 36), anchor: CGPoint(x: 0.5, y: 0.5))
        case .tabano:
            return Spec(hp: 8, r: 15, mass: 2.2, score: 300, drag: 3.5, k: 1,
                        size: CGSize(width: 46, height: 44), anchor: CGPoint(x: 0.5, y: 1 - 21.0 / 44.0))
        case .beetle:
            return Spec(hp: 18, r: 22, mass: 4.5, score: 600, drag: 2.6, k: 1,
                        size: CGSize(width: 58, height: 62), anchor: CGPoint(x: 0.5, y: 1 - 30.0 / 62.0))
        }
    }

    let kind: Kind
    var x: CGFloat, y: CGFloat
    var vx: CGFloat = 0, vy: CGFloat = 0     // velocidad propia (IA)
    var kx: CGFloat = 0, ky: CGFloat = 0     // empuje recibido (golpes, choques)
    var rot: CGFloat = 0, rv: CGFloat = 0, t: CGFloat = 0, flash: CGFloat = 0
    var chain = 0, crashCD: CGFloat = 0
    var entered = false, dead = false, gone = false
    var hp: CGFloat, maxHp: CGFloat
    let r: CGFloat, mass: CGFloat, score: Int, drag: CGFloat, k: CGFloat
    var fireT = CGFloat.random(in: 1.5...3), fires = false

    // Aguijón
    var mode: Mode = .dive
    var spd: CGFloat = 170, amp: CGFloat = 0, w: CGFloat = 0, ph: CGFloat = 0
    var locked = false, aimX: CGFloat = 0, dir: CGFloat = 1
    weak var anchor: Enemy?
    var ang: CGFloat = 0, orbitR: CGFloat = 46

    // Escarabajo: placas laterales desmontables
    var plateL: CGFloat = 0, plateR: CGFloat = 0

    // Tábano
    var st: TState = .enter, stT: CGFloat = 0, cycles = 0, ty: CGFloat = 0

    // Nodos
    let node = SKNode()
    let body: SKSpriteNode
    let white: SKSpriteNode
    var wings: [SKSpriteNode] = []
    var glows: [SKSpriteNode] = []
    private var shownSprite = -1

    init(kind: Kind, x: CGFloat, y: CGFloat, hpMul: CGFloat) {
        let s = Enemy.spec(kind)
        self.kind = kind
        self.x = x; self.y = y
        hp = s.hp * hpMul; maxHp = hp
        r = s.r; mass = s.mass; score = s.score; drag = s.drag; k = s.k
        if kind == .beetle { plateL = 5 * hpMul; plateR = 5 * hpMul }

        body = SKSpriteNode(texture: Tex.get(Enemy.textureName(kind, 0)), size: s.size)
        body.anchorPoint = s.anchor
        white = SKSpriteNode(texture: Tex.get(Enemy.textureName(kind, 0) + "_w"), size: s.size)
        white.anchorPoint = s.anchor
        white.alpha = 0
        white.zPosition = 0.2
        node.addChild(body)
        node.addChild(white)
        node.setScale(k)

        if kind != .beetle {
            let big = kind == .tabano
            for side: CGFloat in [-1, 1] {
                let wing = SKSpriteNode(texture: Tex.get("wing"),
                                        size: big ? CGSize(width: 24, height: 7.5) : CGSize(width: 16, height: 5.4))
                wing.position = CGPoint(x: side * (big ? 10 : 6.5), y: big ? 5 : 1)
                wing.zPosition = 0.1
                node.addChild(wing)
                wings.append(wing)
            }
        }
        if kind == .tabano {
            for (gx, gy, gr) in [(-11.0, 15.0, 7.0), (11.0, 15.0, 7.0), (0.0, 10.0, 10.0)] {
                let g = SKSpriteNode(texture: Tex.get("glow"), size: CGSize(width: gr * 2, height: gr * 2))
                g.position = CGPoint(x: gx, y: -gy)
                g.color = SKColor(red: 1, green: 0.25, blue: 0.35, alpha: 1)
                g.colorBlendFactor = 1
                g.blendMode = .add
                g.alpha = 0
                g.zPosition = 0.3
                node.addChild(g)
                glows.append(g)
            }
        }
    }

    static func textureName(_ kind: Kind, _ index: Int) -> String {
        switch kind {
        case .stinger: return "stinger"
        case .tabano: return "tabano"
        case .beetle: return "beetle_\(index)"
        }
    }

    /// El escarabajo cambia de sprite al perder placas.
    func refreshSprite() {
        guard kind == .beetle else { return }
        let i = (plateL > 0 ? 0 : 1) + (plateR > 0 ? 0 : 2)
        guard i != shownSprite else { return }
        shownSprite = i
        body.texture = Tex.get("beetle_\(i)")
        white.texture = Tex.get("beetle_\(i)_w")
    }
}

// MARK: - Proyectiles, mejoras y efectos

@MainActor
final class Bullet {
    var x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat
    let dmg: CGFloat, r: CGFloat, knock: CGFloat, slug: Bool
    var dead = false
    let node: SKSpriteNode

    init(x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat, slug: Bool) {
        self.x = x; self.y = y; self.vx = vx; self.vy = vy; self.slug = slug
        dmg = slug ? 4 : 1
        r = slug ? 7 : 3
        knock = slug ? 620 : 26
        node = SKSpriteNode(texture: Tex.get(slug ? "slug" : "bullet"),
                            size: slug ? CGSize(width: 12, height: 16) : CGSize(width: 4, height: 12))
        node.blendMode = .add
        node.zRotation = -atan2(vx, -vy)
    }
}

@MainActor
final class EnemyBullet {
    var x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat, t: CGFloat = 0
    let r: CGFloat = 5
    var dead = false
    let node = SKSpriteNode(texture: Tex.get("ebullet"), size: CGSize(width: 12, height: 12))

    init(x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat) {
        self.x = x; self.y = y; self.vx = vx; self.vy = vy
    }
}

enum PickupKind: CaseIterable {
    case impact, wide, repair, charge
    var texture: String {
        switch self {
        case .impact: return "pickup_impact"
        case .wide: return "pickup_wide"
        case .repair: return "pickup_repair"
        case .charge: return "pickup_charge"
        }
    }
    var label: String {
        switch self {
        case .impact: return "IMPACTO"
        case .wide: return "ABANICO"
        case .repair: return "REPARACIÓN"
        case .charge: return "ONDA +1"
        }
    }
}

@MainActor
final class Pickup {
    let kind: PickupKind
    var x: CGFloat, y: CGFloat, t: CGFloat = 0
    var dead = false
    let node: SKSpriteNode

    init(kind: PickupKind, x: CGFloat, y: CGFloat) {
        self.kind = kind; self.x = x; self.y = y
        node = SKSpriteNode(texture: Tex.get(kind.texture), size: CGSize(width: 28, height: 28))
    }
}

/// Onda expansiva. `wave` = onda de choque del jugador (empuja enemigos y borra proyectiles).
@MainActor
final class Ring {
    var x: CGFloat, y: CGFloat, r: CGFloat = 4
    let maxR: CGFloat, dur: CGFloat, wave: Bool
    var life: CGFloat = 0
    var hit = Set<ObjectIdentifier>()
    let node = SKSpriteNode(texture: Tex.get("ring"))
    let baseAlpha: CGFloat

    init(x: CGFloat, y: CGFloat, maxR: CGFloat, dur: CGFloat, color: SKColor, wave: Bool = false, alpha: CGFloat = 0.8) {
        self.x = x; self.y = y; self.maxR = maxR; self.dur = dur; self.wave = wave
        baseAlpha = alpha
        node.color = color
        node.colorBlendFactor = 1
        node.blendMode = .add
    }
}

@MainActor
final class Particle {
    enum Kind { case spark, debris, smoke, flash, ember }
    let kind: Kind
    var x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat
    var rot: CGFloat = 0, vr: CGFloat = 0
    var life: CGFloat = 0
    let max: CGFloat
    let size: CGFloat
    let node: SKSpriteNode

    init(_ kind: Kind, x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat, max: CGFloat, size: CGFloat, node: SKSpriteNode) {
        self.kind = kind; self.x = x; self.y = y; self.vx = vx; self.vy = vy
        self.max = max; self.size = size; self.node = node
    }
}

@MainActor
final class FloatText {
    let label: SKLabelNode
    var x: CGFloat, y: CGFloat, life: CGFloat = 0
    let max: CGFloat

    init(label: SKLabelNode, x: CGFloat, y: CGFloat, max: CGFloat) {
        self.label = label; self.x = x; self.y = y; self.max = max
    }
}

@MainActor
final class Cloud {
    var x: CGFloat, y: CGFloat
    let vx: CGFloat, vy: CGFloat
    let node: SKSpriteNode

    init(x: CGFloat, y: CGFloat, vx: CGFloat, vy: CGFloat, node: SKSpriteNode) {
        self.x = x; self.y = y; self.vx = vx; self.vy = vy; self.node = node
    }
}
