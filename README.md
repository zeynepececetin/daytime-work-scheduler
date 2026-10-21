# Daytime Work Schedule

A program that prepares the monthly daytime work schedule of the anesthesiology department at Kayseri City Hospital, Türkiye. It decides which anesthesiologist works in which operating room, outpatient clinic or endoscopy unit on each working day of the month.

**▶ Try the live demo (web version, fictional data):** https://zeynepececetin.github.io/daytime-work-scheduler/web-demo/
November 2026 is already entered, scheduled and published. Sign in as the department admin (`yonetici@demo`) or as a doctor (`kemal.arslan@demo`); the password for both is `demo123`.

## About this project

I built this program to solve a real scheduling problem in the anesthesiology department of Kayseri City Hospital. Every month, about 27 anesthesiologists have to be assigned to 25 operating rooms, clinics and endoscopy units. The schedule used to be prepared by hand, and the workload was often shared unevenly. My mother, one of the department's specialists, objected to this and took the job over herself, and seeing how difficult it was to do a evenly distributed program by hand gave me the idea for this program.

Hospital scheduling was completely new to me, so I started by learning how the system works. I gathered every rule and variable from my mother, decided with her guidance which rules take priority, and listed the situations most likely to break a schedule. I built the program together with Anthropic's Claude, an AI assistant: I worked out what it had to do, Claude turned it into code, and I tested each version. The drafts were reviewed by the department's doctors, and I revised the program after each round of feedback.

The project showed me how a real problem can be broken down into its parts and turned into a system that does in seconds what used to take hours.

*Zeynep Ece Cetin*

> **Privacy:** all doctors named in the sample data, the demo and the screenshots are fictional. The real department data is kept out of this repository to comply with Türkiye's personal data protection law (KVKK).

| | |
|---|---|
| Doctors scheduled per month | ~27 |
| Work areas per day | 25 |
| Assignments per month | ~525 |
| Hard-rule violations in test runs | **0** |
| Largest gap from a doctor's fair workload target | ≈ 0.2 % |

![Generated monthly schedule (room × day)](kaynak/portfolyo/img/gunluk.jpg)

---

## The problem

On every working day, about 27 anesthesiologists have to be distributed across 25 work areas. The areas are not equal. Some operating rooms have long and demanding cases, others much lighter ones, so each area carries a workload score and the doctors expect their monthly totals to come out even. The schedule also has to take into account night shifts, leave, intensive-care rotations and a number of department rules. Preparing it by hand, it is hard to follow every rule and still be fair to everyone, and a single change, such as a colleague falling ill, can undo much of the work.

## How the problem was analysed

The first step was to understand how the schedule is actually made. In conversations with the specialist preparing it, each element was gone through one by one: who can work on which day, how a night shift affects the following days and why a Friday shift is treated differently, how leave is counted, which rooms a doctor cannot be assigned to, and which rooms can be covered together when there are not enough doctors. She also described the things that typically go wrong during a month. The result is the full set of inputs and rules the program works with, written down in [`KURALLAR.md`](KURALLAR.md) (Turkish).

The rules are not all equally important, so the next question was what should take precedence when two of them conflict. Rules that can never be broken come first, followed by the doctors' personal requests, then preferences, then a fair balance of workload, and finally a rotation so that no one keeps getting the same rooms.

The situations most likely to break a schedule were then listed: a doctor reporting sick in the middle of the month, a room closing for renovation, more doctors available than open rooms on a given day, a schedule that has to be changed after it has already been announced. For each case, the expected response of the program was defined and later checked.

## Testing and revision

The first version was tested on the previous month's data, and the drafts were then shown to other anesthesiologists in the department. Their comments raised requirements and problems that nobody had anticipated. A septic operating room, for example, can only be covered together with certain rooms because of where it is located. Rooms are sometimes closed for part of a month. The doctor preparing the schedule needs to be able to edit it by hand, and changes keep coming in after the month has started. Each of these was resolved and the program revised. Every draft was reviewed by practising anesthesiologists before the next one.

## Working with AI

I built the program together with Anthropic's Claude, an AI assistant. My part was to work out what the program had to do: the rules, the structure of the data and the type of each variable, the order of priorities, and how each problem should be resolved. I described all of this to Claude in detail, and Claude turned it into code. I then reviewed and tested each version, and asked for changes whenever the result did not match how the department actually works.

Some real-life situations were not something Claude could anticipate, such as congress leave, extra shifts, sick leave in the middle of a month and how workload points should be calculated in each case. I had to explain these in detail before they worked correctly.

## Result

A schedule that used to take hours of work each month is now generated in seconds, without breaking any rule, and every doctor's total stays within about 0.2 % of a fair target. The desktop version is used by the department. A web version, in which doctors enter their own leave requests, is the next step.

## The scheduling rules in brief

- **Doctors:** each with different availability (the day after a night shift, leave, intensive-care rotations, rooms they are exempt from).
- **Work areas:** 25 a day, each with a workload score between 200 and 5,000 points.
- **Rules that are never broken (K1–K15):** for example, no daytime work the day after a night shift, with different rules for Friday and weekend shifts; one or two clinic and endoscopy days per person, in different units; at most two days in the same room; only specific room pairings when doctors are short.
- **Priorities:** rules first, then personal requests, then preferences, then fairness. Each doctor's monthly total is brought as close as possible to their fair target, which is reduced in proportion to leave. Finally, doctors rotate through rooms they did not work in the previous month.
- **Changes during the month:** when someone falls ill or a room closes, only the remaining days are recalculated. The program offers alternatives from *fewest changes* to *most balanced* and shows what each one costs in fairness.

## How it works

![Step-by-step monthly input](kaynak/portfolyo/img/ay.jpg)

1. **Calendar & night-shift roster:** holidays, room availability, the four duty columns (can be read from the administration's Excel file).
2. **Intensive-care staff:** who is outside the daytime schedule this month.
3. **Leave:** annual, congress, sick and other leave (reduces the fairness target proportionally).
4. **Personal requests:** preferred clinic/endoscopy days, rooms to avoid on given days.
5. **Generate & review:** the algorithm builds the month; a control table flags any day with more doctors than open rooms.
6. **Training clinic & official list:** exported in the hospital administration's own 50-column Excel template.

**Algorithm:** simulated annealing over the space of possible assignments (`kaynak/core.js`). Hard rules are never violated, and the remaining objectives are optimised in a fixed priority order.

**Control stays with people:** the algorithm's original schedule is never overwritten. Manual edits happen in a draft with undo/redo. The program reports any rule broken and every change in points, but never blocks the scheduler. Finalised drafts become numbered revisions, and each revision produces a change report (PDF) for the administration.

![Fairness: target vs. received points](kaynak/portfolyo/img/ozet.jpg)

## Two versions

| | Desktop (in use) | Web (next step) |
|---|---|---|
| File | [`CalismaProgrami.html`](CalismaProgrami.html) | [`web-demo/index.html`](web-demo/index.html) |
| Runs | Offline in Chrome/Edge, from a USB stick, no installation | Browser; demo stores data locally, production will use a server |
| Data | Encrypted data file (AES-256-GCM, PBKDF2) | Invitation-only accounts |
| Extra | | Doctors enter their own leave requests from their phones; scheduler approves day by day; personal schedule page |

The desktop version is used by the department's scheduler, and its first full real month is November 2026. The web version is built from the same source (`kaynak/web/build_web.py`), so every desktop feature carries over. It is not yet live.

## Repository structure

```
CalismaProgrami.html     desktop program (built, single file)
web-demo/index.html      web version demo (built, fictional data)
KURALLAR.md              rules / requirements specification (Turkish)
sample-data/             fictional night-shift roster and leave list for November 2026
docs/                    project portfolio (PDF)
kaynak/                  source code
  core.js                scheduling algorithm, rules, validation
  template.html          user interface
  build.py               builds CalismaProgrami.html
  test.js                rule and fairness tests
  web/                   web-version layers and build script
  portfolyo/             tools that produced the portfolio screenshots, PDF and video
```

The user interface and code comments are in Turkish, because the program is used by a Turkish hospital department.

## Build and test

Requires Python 3 and Node.js.

```bash
cd kaynak
python3 -I build.py                       # → ../CalismaProgrami.html
python3 -I web/build_web.py               # → ../web-demo/index.html
node test.js ../CalismaProgrami.html      # rule/fairness test on the sample month: violations must be 0
REQ=1 node test.js ../CalismaProgrami.html     # with personal requests
CLOSE=1 node test.js ../CalismaProgrami.html   # with closed rooms
REPAIR=1 node test.js ../CalismaProgrami.html  # mid-month revision
PREV=1 node test.js ../CalismaProgrami.html    # month-to-month rotation
```

## Project portfolio

A 9-page overview with screenshots: [`docs/Portfolio-Daytime-Work-Schedule.pdf`](docs/Portfolio-Daytime-Work-Schedule.pdf)
