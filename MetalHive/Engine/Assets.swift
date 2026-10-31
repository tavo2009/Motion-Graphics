import SpriteKit
import ImageIO
import CoreText

/// Texturas generadas por tools/assetgen (PNG a 3x salvo el terreno).
enum Tex {
    private static var cache: [String: SKTexture] = [:]

    static func get(_ name: String, ext: String = "png") -> SKTexture {
        if let t = cache[name] { return t }
        var tex = SKTexture()
        if let url = Bundle.main.url(forResource: name, withExtension: ext),
           let src = CGImageSourceCreateWithURL(url as CFURL, nil),
           let img = CGImageSourceCreateImageAtIndex(src, 0, nil) {
            tex = SKTexture(cgImage: img)
        } else {
            print("⚠️ Falta la textura \(name).\(ext)")
        }
        tex.filteringMode = .linear
        cache[name] = tex
        return tex
    }

    static func preload() {
        var all: [SKTexture] = (0..<9).map { get("ship_\($0)") }
        for n in ["stinger", "stinger_w", "tabano", "tabano_w", "bullet", "slug", "ebullet", "spark", "flash",
                  "smoke", "glow", "dot", "ring", "flame", "wing", "logo", "vignette",
                  "pickup_impact", "pickup_wide", "pickup_repair", "pickup_charge",
                  "ui_pause", "ui_sound", "ui_mute", "ui_shock"] {
            all.append(get(n))
        }
        for i in 0..<4 {
            all.append(get("beetle_\(i)"))
            all.append(get("beetle_\(i)_w"))
            all.append(get("debris\(i)"))
            all.append(get("cloud_\(i)"))
        }
        all.append(get("terrain", ext: "jpg"))
        SKTexture.preload(all) {}
    }
}

enum Fonts {
    static let main = "BlackOpsOne-Regular"

    static func register() {
        guard let url = Bundle.main.url(forResource: "BlackOpsOne-Regular", withExtension: "ttf") else {
            print("⚠️ Falta la fuente BlackOpsOne-Regular.ttf")
            return
        }
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
    }
}

/// Colores de la paleta compartida con el generador de arte.
enum Palette {
    static let text = SKColor(red: 0.94, green: 0.88, blue: 0.76, alpha: 1)
    static let dim = SKColor(red: 0.66, green: 0.59, blue: 0.48, alpha: 1)
    static let gold = SKColor(red: 1.0, green: 0.82, blue: 0.48, alpha: 1)
    static let bio = SKColor(red: 0.74, green: 0.85, blue: 0.42, alpha: 1)
    static let warn = SKColor(red: 0.88, green: 0.63, blue: 0.23, alpha: 1)
    static let danger = SKColor(red: 1.0, green: 0.30, blue: 0.37, alpha: 1)
    static let off = SKColor(red: 0.24, green: 0.18, blue: 0.14, alpha: 0.85)
    static let spark = SKColor(red: 1.0, green: 0.86, blue: 0.56, alpha: 1)

    static func pickup(_ kind: PickupKind) -> SKColor {
        switch kind {
        case .impact: return SKColor(red: 1.0, green: 0.60, blue: 0.24, alpha: 1)
        case .wide: return SKColor(red: 0.73, green: 0.83, blue: 0.35, alpha: 1)
        case .repair: return SKColor(red: 1.0, green: 0.35, blue: 0.43, alpha: 1)
        case .charge: return SKColor(red: 0.48, green: 0.84, blue: 1.0, alpha: 1)
        }
    }
}
