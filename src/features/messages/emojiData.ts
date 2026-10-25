// A curated emoji set for the chat picker, bundled so it works under the page
// CSP (picker libraries load their data from a CDN). Each entry is the emoji
// and the words it is found by.

export interface EmojiCategory {
  id: string;
  label: string;
  emojis: [emoji: string, keywords: string][];
}

/** Offered first when reacting to a message. */
export const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "😡", "👍"];

export const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    label: "Smileys",
    emojis: [
      ["😀", "grin happy smile"], ["😃", "smile happy joy"], ["😄", "smile laugh happy"], ["😁", "grin beam teeth"],
      ["😆", "laugh squint haha"], ["😅", "sweat smile relief nervous"], ["🤣", "rofl rolling laugh"], ["😂", "joy tears laugh lol"],
      ["🙂", "slight smile"], ["🙃", "upside down silly"], ["😉", "wink"], ["😊", "blush smile happy"],
      ["😇", "angel halo innocent"], ["🥰", "love hearts adore"], ["😍", "heart eyes love"], ["🤩", "star struck wow"],
      ["😘", "kiss blow love"], ["😋", "yum tasty delicious"], ["😛", "tongue playful"], ["😜", "wink tongue crazy"],
      ["🤪", "zany crazy goofy"], ["🤗", "hug hugging"], ["🤭", "giggle oops hand"], ["🤫", "shush quiet secret"],
      ["🤔", "think thinking hmm"], ["🤐", "zip mouth secret"], ["🤨", "raised eyebrow sus doubt"], ["😐", "neutral meh"],
      ["😑", "expressionless blank"], ["😶", "no mouth speechless"], ["😏", "smirk"], ["😒", "unamused annoyed"],
      ["🙄", "eye roll whatever"], ["😬", "grimace awkward"], ["😌", "relieved calm"], ["😔", "pensive sad"],
      ["😪", "sleepy tired"], ["😴", "sleep zzz tired"], ["😷", "mask sick"], ["🤒", "fever sick ill"],
      ["🤕", "hurt bandage injured"], ["🤢", "nausea sick gross"], ["🥵", "hot heat sweating"], ["🥶", "cold freezing"],
      ["😵", "dizzy"], ["🤯", "mind blown shocked"], ["🥳", "party celebrate birthday"], ["😎", "cool sunglasses"],
      ["🤓", "nerd geek study"], ["🧐", "monocle curious"], ["😕", "confused"], ["😟", "worried"],
      ["🙁", "frown sad"], ["😮", "wow surprised open mouth"], ["😲", "astonished shocked"], ["😳", "flushed embarrassed"],
      ["🥺", "pleading puppy eyes please"], ["😦", "frowning shocked"], ["😨", "fearful scared"], ["😰", "anxious sweat"],
      ["😢", "cry sad tear"], ["😭", "sob crying loud"], ["😱", "scream fear shock"], ["😖", "confounded"],
      ["😞", "disappointed"], ["😓", "downcast sweat"], ["😩", "weary tired"], ["😫", "tired exhausted"],
      ["🥱", "yawn bored sleepy"], ["😤", "triumph huff angry"], ["😡", "angry mad rage"], ["😠", "angry mad"],
      ["🤬", "cursing swearing"], ["😈", "devil smile evil"], ["💀", "skull dead lol"], ["🤡", "clown"],
      ["👻", "ghost boo"], ["🤖", "robot bot"], ["😺", "cat smile"], ["🙈", "see no evil monkey"],
    ],
  },
  {
    id: "people",
    label: "Hands & people",
    emojis: [
      ["👍", "thumbs up like yes ok"], ["👎", "thumbs down dislike no"], ["👌", "ok perfect"], ["✌️", "peace victory"],
      ["🤞", "fingers crossed luck"], ["🤟", "love you hand"], ["🤘", "rock on horns"], ["🤙", "call me shaka"],
      ["👈", "point left"], ["👉", "point right"], ["👆", "point up"], ["👇", "point down"],
      ["☝️", "index up one"], ["✋", "raised hand stop high five"], ["👋", "wave hello hi bye"], ["🤚", "back hand"],
      ["👏", "clap applause bravo"], ["🙌", "raise hands celebrate yay"], ["👐", "open hands"], ["🤲", "palms up dua pray"],
      ["🙏", "pray please thanks namaste"], ["🤝", "handshake deal agree"], ["💪", "muscle strong flex"], ["✍️", "writing write"],
      ["🫶", "heart hands love"], ["🫡", "salute respect"], ["🧠", "brain smart"], ["👀", "eyes look see"],
      ["👨‍🎓", "student graduate man"], ["👩‍🎓", "student graduate woman"], ["👨‍💻", "coder developer man laptop"], ["👩‍💻", "coder developer woman laptop"],
      ["👨‍🏫", "teacher professor man"], ["👩‍🏫", "teacher professor woman"], ["🤷", "shrug dunno"], ["🤦", "facepalm"],
      ["🙋", "raising hand question"], ["🙇", "bow sorry"], ["🏃", "run running late"], ["🚶", "walk walking"],
    ],
  },
  {
    id: "hearts",
    label: "Hearts & symbols",
    emojis: [
      ["❤️", "heart love red"], ["🧡", "orange heart"], ["💛", "yellow heart"], ["💚", "green heart"],
      ["💙", "blue heart"], ["💜", "purple heart"], ["🖤", "black heart"], ["🤍", "white heart"],
      ["🤎", "brown heart"], ["💔", "broken heart"], ["❤️‍🔥", "heart on fire passion"], ["💕", "two hearts love"],
      ["💖", "sparkling heart"], ["💯", "hundred perfect 100"], ["✨", "sparkles shiny magic"], ["🔥", "fire lit hot"],
      ["⭐", "star"], ["🌟", "glowing star"], ["💥", "boom collision"], ["💫", "dizzy star"],
      ["✅", "check done yes"], ["❌", "cross no wrong"], ["❗", "exclamation important"], ["❓", "question"],
      ["⚠️", "warning caution"], ["🆗", "ok button"], ["🆕", "new"], ["🔔", "bell notification"],
      ["💤", "sleep zzz"], ["💬", "speech bubble chat"], ["🗨️", "speech left"], ["☪️", "star crescent islam"],
    ],
  },
  {
    id: "nature",
    label: "Animals & nature",
    emojis: [
      ["🐱", "cat kitty"], ["🐈", "cat"], ["🐶", "dog puppy"], ["🐕", "dog"],
      ["🐭", "mouse"], ["🐰", "rabbit bunny"], ["🦊", "fox"], ["🐻", "bear"],
      ["🐼", "panda"], ["🐨", "koala"], ["🐯", "tiger bengal"], ["🦁", "lion"],
      ["🐮", "cow"], ["🐐", "goat eid"], ["🐔", "chicken"], ["🐦", "bird"],
      ["🦆", "duck"], ["🦉", "owl night"], ["🐟", "fish"], ["🐢", "turtle slow"],
      ["🦋", "butterfly"], ["🐝", "bee"], ["🌸", "cherry blossom flower"], ["🌹", "rose flower"],
      ["🌻", "sunflower"], ["🌺", "hibiscus flower"], ["🌴", "palm tree"], ["🌳", "tree"],
      ["🍀", "clover luck"], ["🍁", "maple leaf autumn"], ["🌙", "moon crescent night"], ["☀️", "sun sunny"],
      ["🌧️", "rain"], ["⛈️", "storm thunder"], ["🌈", "rainbow"], ["❄️", "snow cold winter"],
    ],
  },
  {
    id: "food",
    label: "Food & drink",
    emojis: [
      ["🍎", "apple"], ["🥭", "mango"], ["🍌", "banana"], ["🍉", "watermelon"],
      ["🍇", "grapes"], ["🍓", "strawberry"], ["🍋", "lemon"], ["🥥", "coconut"],
      ["🍕", "pizza"], ["🍔", "burger"], ["🍟", "fries"], ["🌭", "hot dog"],
      ["🍗", "chicken leg"], ["🍛", "curry rice biryani"], ["🍚", "rice"], ["🍜", "noodles ramen"],
      ["🥟", "dumpling momo"], ["🍰", "cake"], ["🎂", "birthday cake"], ["🍩", "donut"],
      ["🍪", "cookie"], ["🍫", "chocolate"], ["🍦", "ice cream"], ["🍿", "popcorn movie"],
      ["☕", "coffee tea hot"], ["🍵", "tea cha"], ["🧋", "bubble tea boba"], ["🥤", "drink soda"],
    ],
  },
  {
    id: "activity",
    label: "Activities",
    emojis: [
      ["⚽", "football soccer"], ["🏏", "cricket"], ["🏀", "basketball"], ["🏸", "badminton"],
      ["🏓", "table tennis ping pong"], ["🏐", "volleyball"], ["♟️", "chess"], ["🎮", "game gaming"],
      ["🎯", "target goal bullseye"], ["🏆", "trophy win champion"], ["🥇", "gold medal first"], ["🏅", "medal"],
      ["🎉", "party tada celebrate"], ["🎊", "confetti"], ["🎈", "balloon"], ["🎁", "gift present"],
      ["🎵", "music note"], ["🎶", "music notes"], ["🎤", "mic sing karaoke"], ["🎧", "headphones music"],
      ["🎸", "guitar"], ["🎨", "art paint"], ["📸", "camera photo"], ["🎬", "movie film"],
    ],
  },
  {
    id: "objects",
    label: "Campus & objects",
    emojis: [
      ["📚", "books study library"], ["📖", "book read"], ["📝", "memo note write"], ["✏️", "pencil"],
      ["📐", "ruler triangle math"], ["🧮", "abacus math"], ["🧪", "test tube lab chemistry"], ["🔬", "microscope lab science"],
      ["💻", "laptop computer code"], ["🖥️", "desktop computer"], ["⌨️", "keyboard"], ["📱", "phone mobile"],
      ["🔌", "plug electricity"], ["🔋", "battery"], ["💡", "idea bulb"], ["🔧", "wrench tool fix"],
      ["⚙️", "gear settings engineering"], ["🛠️", "tools build"], ["📅", "calendar date"], ["⏰", "alarm clock time"],
      ["⏳", "hourglass deadline waiting"], ["🎓", "graduation cap degree"], ["🏫", "school campus"], ["🕌", "mosque"],
      ["🚌", "bus transport"], ["🚲", "bicycle cycle"], ["🏠", "home house"], ["✈️", "plane travel"],
      ["💰", "money bag"], ["📌", "pin pushpin"], ["📎", "paperclip attach"], ["🔒", "lock private"],
    ],
  },
];

const RECENT_KEY = "iutverse-recent-emoji";

export const readRecentEmoji = (): string[] => {
  try {
    const value = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => typeof item === "string").slice(0, 16) : [];
  } catch {
    return [];
  }
};

export const rememberEmoji = (emoji: string) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([emoji, ...readRecentEmoji().filter((item) => item !== emoji)].slice(0, 16)));
  } catch {
    // Recent emoji are a convenience; private mode simply has none.
  }
};

/** Emoji whose keywords contain every word of the query. */
export const searchEmoji = (query: string) => {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return EMOJI_CATEGORIES.flatMap((category) => category.emojis).filter(([, keywords]) => words.every((word) => keywords.includes(word))).map(([emoji]) => emoji);
};
