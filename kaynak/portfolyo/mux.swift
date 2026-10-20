// Video + ses birleştirme: swift mux.swift <video.mp4> <ses.m4a> <çıktı.mp4>
import AVFoundation
let a = CommandLine.arguments
let v = AVURLAsset(url: URL(fileURLWithPath: a[1])), s = AVURLAsset(url: URL(fileURLWithPath: a[2]))
let out = URL(fileURLWithPath: a[3]); try? FileManager.default.removeItem(at: out)
let sem = DispatchSemaphore(value: 0)
Task {
  do {
    let comp = AVMutableComposition()
    let vt = try await v.loadTracks(withMediaType: .video)[0], st = try await s.loadTracks(withMediaType: .audio)[0]
    let dur = try await v.load(.duration)
    let cv = comp.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid)!
    try cv.insertTimeRange(CMTimeRange(start: .zero, duration: dur), of: vt, at: .zero)
    let ca = comp.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)!
    let sdur = try await s.load(.duration)
    try ca.insertTimeRange(CMTimeRange(start: .zero, duration: CMTimeMinimum(dur, sdur)), of: st, at: .zero)
    let ex = AVAssetExportSession(asset: comp, presetName: AVAssetExportPresetPassthrough)!
    try await ex.export(to: out, as: .mp4)
    print("tamam")
  } catch { print("hata", error) }
  sem.signal()
}
sem.wait()
