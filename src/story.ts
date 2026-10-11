import { counterLine, rubyLabel, stageName, type LineId } from './rules.ts';

export type Speech = { who: string; text: string };

export function momIntro(name: string): Speech[] {
  return [
    { who: 'Mom', text: `Morning, ${name}. Professor Quill knocked before the cove turned gold. The three in his lab woke up, and he asked for you.` },
    { who: 'Mom', text: 'If your partner comes home scuffed, I can patch them. The east road is still latched. Today is just the town.' },
    { who: 'Mom', text: 'Wins pay in rubies. Rubies are what this island spends. Pell sells buns with them, down by the cove.' },
  ];
}

export function momHeal(mon: string, hurt: boolean): Speech[] {
  if (!hurt) return [{ who: 'Mom', text: `${mon} looks steady. I'll be here if that changes.` }];
  return [
    { who: 'Mom', text: 'Come here. Hold still.' },
    { who: 'Mom', text: 'Good as dawn. Off you go.' },
  ];
}

export function bedLines(mon: string | null, hurt: boolean): Speech[] {
  if (!mon) return [{ who: '', text: 'The quilt is still warm from the night.' }];
  if (!hurt) return [{ who: '', text: 'The quilt is warm. You are not tired.' }];
  return [{ who: '', text: `You lie down until the shaking stops. ${mon} is breathing easier.` }];
}

export function pitch(name: string): Speech[] {
  return [
    { who: 'Quill', text: `${name}. Vesper has worn a groove in my floor.` },
    { who: 'Quill', text: 'These three hatched at first light. Grass, fire, and water. Take the one that feels like yours.' },
  ];
}

export function quillWaiting(): Speech[] {
  return [{ who: 'Quill', text: 'The three are on the benches. Whichever one looks back, that is the one.' }];
}

export function vesperWaiting(): Speech[] {
  return [{ who: 'Vesper', text: "Quit hovering and choose. I'll take whichever one beats yours." }];
}

export function blurb(line: LineId): string {
  if (line === 'pip') return 'Pip is round and green, with one stem still learning which way is up. A grass kindling.';
  if (line === 'emberkit') return 'Emberkit fits in two hands and keeps a coal-bright tail. A fire kindling.';
  return 'Drop is slick, bright-eyed, and already trying to splash. A water kindling.';
}

export function takenLines(line: LineId): Speech[] {
  const mon = stageName(line, 5);
  const other = stageName(counterLine(line), 5);
  return [
    { who: 'Quill', text: `${mon} it is. Be decent to each other.` },
    { who: 'Vesper', text: `Then ${other} is mine. You can walk first. It will not matter.` },
  ];
}

export function rivalIntro(line: LineId): Speech[] {
  return [{ who: '', text: `Vesper steps in with ${stageName(line, 5)}.` }];
}

export function afterRival(name: string, mon: string, won: boolean): Speech[] {
  if (won) {
    return [
      { who: 'Vesper', text: "A first-morning fluke. Don't get proud." },
      { who: 'Quill', text: `That's enough fire for one kitchen. ${name}, the meadow east of this lab is still Hearth. Let ${mon} battle the little wild ones. If they change, come show me.` },
    ];
  }
  return [
    { who: 'Vesper', text: "Types aren't a rumor. Remember which way this one leans." },
    { who: 'Quill', text: `Nobody is leaving town on a bruise. Catch your breath. The meadow is east of here when you want another try, and I still want to see ${mon} if they change.` },
  ];
}

export function meadowHint(): Speech[] {
  return [{ who: '', text: 'The grass leans aside. Small things live in here, and they will fight if you stay.' }];
}

export function evolveLines(before: string, after: string): Speech[] {
  return [
    { who: '', text: `${before} is changing.` },
    { who: '', text: `${before} changed into ${after}.` },
  ];
}

export function reportLines(stage: number): Speech[] {
  if (stage >= 2) {
    return [{ who: 'Quill', text: 'The last form. Look at that. Hearth is small and you still filled it. The road out can wait for another day.' }];
  }
  return [
    { who: 'Quill', text: 'Already a new shape, and you never left Hearth. The east latch stays down. This morning was only the first change.' },
    { who: 'Quill', text: "There is one more form in this line. The meadow will get you there. I'll be at the bench." },
  ];
}

export function quillHeal(mon: string, hurt: boolean): Speech[] {
  if (!hurt) return [{ who: 'Quill', text: `${mon} is bright-eyed. The bench is here when you need it.` }];
  return [
    { who: 'Quill', text: `Hold still, ${mon}.` },
    { who: 'Quill', text: 'There. Whole again.' },
  ];
}

export function niaLine(): Speech[] {
  return [{ who: 'Nia', text: "Gate's latched. Quill says the rest of the island is a later page. If you want trouble, it's the meadow, not the road." }];
}

export function signLine(id: string): Speech[] {
  if (id === 'east') return [{ who: '', text: 'East road. The latch is down. Not this morning.' }];
  return [{ who: '', text: 'Hearth Cove. Cold at dawn, and deeper than the stones.' }];
}

export function blackout(mon: string): Speech[] {
  return [
    { who: '', text: `${mon} can't keep going.` },
    { who: '', text: 'You wake in your room. Mom has already patched the scrapes.' },
  ];
}

export function rubyFound(count: number, rival: boolean): Speech[] {
  const pocket = rubyLabel(count);
  if (rival) return [{ who: '', text: `Vesper pays ${pocket}. In Hearth, a loss is settled in rubies.` }];
  return [{ who: '', text: `You pick up ${pocket}.` }];
}

export function pellPitch(mon: string | null, hurt: boolean, rubies: number, price: number): Speech[] {
  const cost = rubyLabel(price);
  if (!mon) {
    return [{ who: 'Pell', text: `Cove buns are ${cost}. They patch a partner. Come back when one is walking with you.` }];
  }
  if (!hurt) return [{ who: 'Pell', text: `${mon} looks fine. A bun is ${cost} when the scrapes are real.` }];
  if (rubies < price) {
    return [{ who: 'Pell', text: `A bun is ${cost}. Your pocket is short. The meadow pays in the same stones.` }];
  }
  return [{ who: 'Pell', text: `${mon} is scuffed. A cove bun is ${cost}, and it closes the scrapes.` }];
}

export function pellSold(mon: string): Speech[] {
  return [{ who: 'Pell', text: `There. ${mon} can breathe again.` }];
}

export function learnedLine(mon: string, move: string): Speech[] {
  return [{ who: '', text: `${mon} learned ${move}.` }];
}

export function levelLine(mon: string, level: number): Speech[] {
  return [{ who: '', text: `${mon} grew to level ${level}.` }];
}
