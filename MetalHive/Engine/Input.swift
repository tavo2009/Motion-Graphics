import GameController
import CoreGraphics

/// Mandos (MFi, Xbox, PlayStation) en iPhone/iPad/Mac y teclado físico en iPad.
/// El teclado del Mac llega por eventos de AppKit (GameSKView) para no duplicar entradas.
final class PadInput {
    struct Frame {
        var move = CGVector.zero      // -1…1
        var shock = false             // flanco de pulsación
        var pause = false
        var mute = false
        var start = false
    }

    private var prevShock = false, prevPause = false, prevMute = false, prevStart = false

    func poll() -> Frame {
        var f = Frame()
        var shockHeld = false, pauseHeld = false, muteHeld = false, startHeld = false

        if let pad = GCController.current?.extendedGamepad {
            var x = CGFloat(pad.leftThumbstick.xAxis.value)
            var y = CGFloat(-pad.leftThumbstick.yAxis.value)
            if pad.dpad.left.isPressed { x = -1 }
            if pad.dpad.right.isPressed { x = 1 }
            if pad.dpad.up.isPressed { y = -1 }
            if pad.dpad.down.isPressed { y = 1 }
            if abs(x) < 0.15 { x = 0 }
            if abs(y) < 0.15 { y = 0 }
            f.move = CGVector(dx: x, dy: y)
            shockHeld = pad.buttonA.isPressed || pad.rightTrigger.isPressed
            pauseHeld = pad.buttonMenu.isPressed
            startHeld = pad.buttonA.isPressed
        }

        #if os(iOS)
        if let kb = GCKeyboard.coalesced?.keyboardInput {
            func down(_ k: GCKeyCode) -> Bool { kb.button(forKeyCode: k)?.isPressed ?? false }
            var x: CGFloat = 0, y: CGFloat = 0
            if down(.leftArrow) || down(.keyA) { x -= 1 }
            if down(.rightArrow) || down(.keyD) { x += 1 }
            if down(.upArrow) || down(.keyW) { y -= 1 }
            if down(.downArrow) || down(.keyS) { y += 1 }
            if x != 0 || y != 0 { f.move = CGVector(dx: x, dy: y) }
            shockHeld = shockHeld || down(.spacebar) || down(.keyX)
            pauseHeld = pauseHeld || down(.keyP) || down(.escape)
            muteHeld = down(.keyM)
            startHeld = startHeld || down(.spacebar) || down(.returnOrEnter)
        }
        #endif

        f.shock = shockHeld && !prevShock
        f.pause = pauseHeld && !prevPause
        f.mute = muteHeld && !prevMute
        f.start = startHeld && !prevStart
        prevShock = shockHeld; prevPause = pauseHeld; prevMute = muteHeld; prevStart = startHeld
        return f
    }
}
