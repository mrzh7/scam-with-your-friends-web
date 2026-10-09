"""Original 120 BPM electronic caper score and foley. No samples or provider APIs.

Requires Python 3.10+, numpy and scipy. Generates stereo 48 kHz PCM masters.
The musical notes, oscillator patches, arrangement and sound effects are defined here.
"""
from pathlib import Path
import json
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
DURATION = 48
RNG = np.random.default_rng(74021)
N = SR * DURATION
music = np.zeros((N, 2), dtype=np.float32)
foley = np.zeros_like(music)
out = Path(__file__).parent / '.renders'
out.mkdir(exist_ok=True)
events = []


def clock(length):
    return np.arange(int(length * SR), dtype=np.float64) / SR


def hz(note):
    return 440 * 2 ** ((note - 69) / 12)


def add(track, start, wave, gain=1., pan=0.):
    offset = int(start * SR)
    if offset < 0:
        wave = wave[-offset:]
        offset = 0
    count = min(len(wave), N - offset)
    if count <= 0:
        return
    # Equal-power panning, not duplicate mono at full level.
    if wave.ndim == 1:
        pan = np.clip(pan, -1, 1)
        gains = np.array([np.cos((pan+1)*np.pi/4), np.sin((pan+1)*np.pi/4)])
        track[offset:offset+count] += (wave[:count, None] * gains * gain).astype(np.float32)
    else:
        track[offset:offset+count] += wave[:count].astype(np.float32) * gain


def filt(wave, cutoff, kind='lowpass'):
    return signal.sosfilt(signal.butter(2, cutoff, kind, fs=SR, output='sos'), wave)


def pluck(note, length=.28, tone='bass'):
    t = clock(length)
    f = hz(note)
    if tone == 'bass':
        phase = 2*np.pi*f*t + .32*(1-np.exp(-t*35))
        wave = np.sin(phase) + .35*np.sin(2*phase)*np.exp(-t*11) + .16*np.sin(3*phase)*np.exp(-t*17)
        wave *= np.exp(-t*5.2)*(1-np.exp(-t*250))
    elif tone == 'lead':
        wave = (np.sin(2*np.pi*f*t + 2.8*np.sin(2*np.pi*f*2*t)*np.exp(-t*14)) + .17*np.sin(2*np.pi*f*.998*t))
        wave *= np.exp(-t*8)*(1-np.exp(-t*350))
    else:
        wave = np.sin(2*np.pi*f*t)*np.exp(-t*6) + .28*np.sin(2*np.pi*f*2.01*t)*np.exp(-t*18)
        wave *= (1-np.exp(-t*280))
    wave *= np.minimum(1, (length-t)*80)
    return wave


def chord(notes, length=.8, sustain=False):
    t = clock(length)
    stereo = np.zeros((len(t), 2))
    for i, note in enumerate(notes):
        f = hz(note)
        for side in range(2):
            drift = 1 + (-1 if side == 0 else 1) * .0017
            wave = sum(np.sin(2*np.pi*f*drift*k*t+i*.4)/(k**1.8) for k in range(1, 6))
            stereo[:, side] += wave / len(notes)
    attack = 1-np.exp(-t*(10 if sustain else 80))
    decay = np.exp(-t*(.7 if sustain else 5))
    release = np.minimum(1, (length-t)*5)
    return stereo*(attack*decay*release)[:, None]


def kick():
    t = clock(.44)
    phase = 2*np.pi*(47*t+102*.022*(1-np.exp(-t/.022)))
    wave = np.sin(phase)*np.exp(-t*11) + filt(RNG.standard_normal(len(t)), 1800)*np.exp(-t*210)*.24
    return np.tanh(wave*1.6)*.75*(1-np.exp(-t*900))


def snare():
    t = clock(.26)
    noise = filt(filt(RNG.standard_normal(len(t)), 1800, 'highpass'), 10000)
    wave = noise*np.exp(-t*20)*.62 + np.sin(2*np.pi*185*t)*np.exp(-t*35)*.42
    # Two short clap echoes give a tactile snap rather than white-noise hiss.
    wave += np.roll(noise, 410)*np.exp(-t*35)*.12
    return np.tanh(wave*1.4)*.8*(1-np.exp(-t*1000))


def hat(opened=False):
    t = clock(.27 if opened else .09)
    noise = filt(RNG.standard_normal(len(t)), 7400, 'highpass')
    metallic = sum(np.sin(2*np.pi*f*t) for f in [4103, 6211, 7439, 9721])*.12
    return (noise*.3+metallic)*np.exp(-t*(20 if opened else 66))*(1-np.exp(-t*1800))


def bell(note, length=1.):
    t = clock(length)
    f = hz(note)
    wave = sum(np.sin(2*np.pi*f*ratio*t)*np.exp(-t*decay)*gain for ratio, decay, gain in [(1,4,1),(2.76,8,.23),(5.4,12,.12)])
    return wave*(1-np.exp(-t*650))*np.minimum(1,(length-t)*20)


def whoosh(start, length=.52, pan=0., gain=.13):
    t = clock(length)
    noise = RNG.standard_normal(len(t))
    wave = filt(noise, [550, 5500], 'bandpass')*np.sin(np.pi*t/length)**2
    sweep = signal.chirp(t, 1300, length, 120, method='logarithmic')*.13*np.sin(np.pi*t/length)**2
    add(foley, start, wave+sweep, gain, pan)
    events.append({'time':start,'sound':'air transition'})


def impact(start, gain=.32):
    t=clock(1.)
    wave = np.sin(2*np.pi*(38*t+2.8*(1-np.exp(-t*18))))*np.exp(-t*8)
    wave += filt(RNG.standard_normal(len(t)),1100)*np.exp(-t*32)*.6
    add(foley,start,wave,gain)


def cash(start):
    for dt,note,gain,pan in [(0,88,.21,-.1),(.09,95,.19,.2),(.18,100,.11,.4)]:
        add(foley,start+dt,bell(note),gain,pan)
    # Mechanical cash-drawer clack.
    t=clock(.14);add(foley,start,filt(RNG.standard_normal(len(t)),2200)*np.exp(-t*45),.23)
    events.append({'time':start,'sound':'original three-note cash chime'})


# Harmony: Em9 / Cmaj7 / Am9 / B7. Each harmonic cell lasts two seconds.
changes = [(40,[52,55,59,62,66]),(36,[48,52,55,59,62]),(33,[45,48,52,55,59]),(35,[47,51,54,57,62])]
hook = [76,79,83,81,79,76,74,71]
for bar in range(24):
    start=bar*2.
    root,notes=changes[max(0,bar-2)%4]
    if start < 4:
        add(music,start,chord(notes,2.5,True),.16)
        if start==2:
            for beat in range(4):
                add(music,start+beat*.5,pluck(40,.3),.24)
        continue
    if 37 <= start < 40:
        continue
    busy=30 <= start < 37
    outro=start>=42
    # Off-beat, palm-muted bass pattern with octave pickup.
    pattern=[(0,0,.35),(.75,0,.19),(1,12,.23),(1.5,7,.16),(1.75,12,.14)]
    for at, interval, length in pattern:
        if start+at>=47: continue
        add(music,start+at,pluck(root+interval,length+.05),.52 if not outro else .41)
    # Chord stabs alternating left and right; chorus chords widen in the finale.
    for beat in [.25,1.25]:
        add(music,start+beat,chord(notes,.65),.25 if not outro else .32)
    for beat in [0,1,1.75] if bar%2 else [0,.75,1]:
        if start+beat>=47: continue
        add(music,start+beat,kick(),.48)
    for beat in [.5,1.5]:
        if start+beat>=47: continue
        add(music,start+beat,snare(),.23)
    for i in range(16 if busy else 8):
        at=start+i*(.125 if busy else .25)
        if at>=47: continue
        add(music,at,hat(i%8==6),(.16 if i%2 else .11)*(1+RNG.uniform(-.1,.1)),.32 if i%2 else -.23)
    if bar%4<2 or outro:
        for i,note in enumerate(hook):
            at=start+i*.25+(0 if i%2==0 else .025)
            if at>=47: continue
            v=pluck(note + (0 if (bar-2)%4<2 else -2), .42, 'lead')
            add(music,at,v,.14 if not busy else .10,-.18)
            add(music,at+.1875,v,.035,.48)
            add(music,at+.375,v,.02,-.55)
    elif not busy:
        for i,note in enumerate([notes[-1]+12,notes[2]+12,notes[1]+12]):
            add(music,start+.25+i*.5,pluck(note,.5,'keys'),.14,(-.4+i*.4))
    if busy:
        for i in range(16):
            add(music,start+i*.125,pluck([76,78,79,83][i%4]+int((start-30)/2),.18,'keys'),.08,-.65+i%4*.43)

# A short comedic gap, then a clear logo cadence and musical resolve.
add(music,37.05,chord([52,55,58,61],1.2),.37)
for i,n in enumerate([64,63,59,52]):
    add(music,37.4+i*.2,pluck(n,.35,'lead'),.23,.16)
add(music,39,chord([47,51,54,57],1.8,True),.23)
for i,n in enumerate([71,74,78,83,86,90]):
    add(music,39.5+i*.21,pluck(n,.3,'keys'),.12,-.5+i*.2)
add(music,41,chord([40,52,55,59,66],3.5,True),.49)
add(music,41,kick(),.55)
add(music,41,bell(88,3),.22,.4)
add(music,46.8,chord([40,52,55,59,66],1.2,True),.43)

# Telephone ring, handset pickup and deliberately spaced punctuation.
for start in [.40,1.40,2.40]:
    t=clock(.64)
    amp=(.65+.35*np.sin(2*np.pi*24*t))*(1-np.exp(-t*200))*np.minimum(1,(.64-t)*30)
    wave=(np.sin(2*np.pi*440*t)+np.sin(2*np.pi*480*t))*.26
    wave+=(np.sin(2*np.pi*1336*t)+np.sin(2*np.pi*1971*t))*.08
    add(foley,start,wave*amp,.32,.38)
events.append({'time':.40,'sound':'synthesized desk telephone ring'})
for start in [3.55,17.2,18.45,19.7,46.8]:
    t=clock(.1)
    add(foley,start,filt(RNG.standard_normal(len(t)),3400)*np.exp(-t*60),.22)
for i,start in enumerate([17.2,18.45,19.7]):
    add(foley,start+.04,pluck([83,86,90][i],.3,'keys'),.32,.2)
    events.append({'time':start,'sound':'verification click and rising confirmation tone'})
for cut in [4,10,16,23,30,37,41]:
    whoosh(cut-.30,.43, .4 if cut%2 else -.4)
    impact(cut,.27 if cut!=41 else .42)
for start in [12,14]:
    whoosh(start-.12,.24,.6,.09)
    add(foley,start,pluck(88,.12,'keys'),.16,.5)
for start in [7.6,38.4]:
    impact(start,.48)
    events.append({'time':start,'sound':'rubber stamp thump'})
for start in [20.5,32,34]:cash(start)
for start,pan in [(24,-.7),(26,.7),(28,-.5)]:whoosh(start,.6,pan,.08)
for i in range(28):
    start=30+i*.25
    t=clock(.065)
    wave=np.sin(2*np.pi*(2100 if i%4==0 else 1700)*t)*np.exp(-t*100)
    add(foley,start,wave,.19 if i%4==0 else .10,.2)
events.append({'time':30,'sound':'accelerated shift clock for trailer montage'})
t=clock(6.8)
riser=filt(RNG.standard_normal(len(t)),[1000,6000],'bandpass')*(t/6.8)**2
riser+=signal.chirp(t,55,6.8,360,method='logarithmic')*.19*(t/6.8)**2
add(foley,30,riser,.13)

# Tiny room/delay sends; preserve dry drum transients and intelligible effects.
dry=music.copy()
for delay,gain in [(.093,.06),(.1875,.075),(.31,.035)]:
    shift=int(delay*SR)
    music[shift:]+=dry[:-shift,::-1]*gain

# Duck beneath the opening telephone and final stamp, and avoid any clipped export.
music[:int(3.8*SR)]*=.70
tail=np.minimum(1,np.maximum(0,(DURATION-np.arange(N)/SR)/.7))
opening=np.minimum(1,np.arange(N)/SR/.12)
music*= (tail*opening)[:,None]
foley*=tail[:,None]
combined=np.tanh((music+foley)*1.07)*.90
peak=float(np.max(np.abs(combined)))
combined*=.89/max(peak,1e-6)
for name,track in [('score',music),('effects',foley),('mix',combined)]:
    wavfile.write(out/f'{name}.wav',SR,(np.clip(track,-.999,.999)*32767).astype(np.int16))
(out/'sound-events.json').write_text(json.dumps(events,indent=2),encoding='utf-8')
print(f'Original score + {len(events)} timed effects: 48 s / stereo / 48 kHz; mix peak {20*np.log10(np.max(np.abs(combined))):.2f} dBFS')
