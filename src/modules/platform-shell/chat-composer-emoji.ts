import type { ShellAction } from "./action-menu";
import love from "./chat-emoji/love.svg";
import thumbsUp from "./chat-emoji/thumbsUp.svg";
import laugh from "./chat-emoji/laugh.svg";
import sparkles from "./chat-emoji/sparkles.svg";
import blossom from "./chat-emoji/blossom.svg";
import eyes from "./chat-emoji/eyes.svg";
import smile from "./chat-emoji/smile.svg";
import wave from "./chat-emoji/wave.svg";
import party from "./chat-emoji/party.svg";
import purpleHeart from "./chat-emoji/purpleHeart.svg";
import coffee from "./chat-emoji/coffee.svg";
import music from "./chat-emoji/music.svg";
import raisedHands from "./chat-emoji/raisedHands.svg";
import whiteHeart from "./chat-emoji/whiteHeart.svg";
import relieved from "./chat-emoji/relieved.svg";
import fire from "./chat-emoji/fire.svg";

// Twemoji art supplied in Prototype17.3. See THIRD_PARTY_NOTICES.md.
const emojiArt = [
  ["❤️", love],
  ["👍", thumbsUp],
  ["😂", laugh],
  ["✨", sparkles],
  ["🌸", blossom],
  ["👀", eyes],
  ["😊", smile],
  ["👋", wave],
  ["🎉", party],
  ["💜", purpleHeart],
  ["☕", coffee],
  ["🎶", music],
  ["🙌", raisedHands],
  ["🤍", whiteHeart],
  ["😌", relieved],
  ["🔥", fire],
] as const;

export function composerEmojiActions(insert: (emoji: string) => void): ShellAction[] {
  return emojiArt.map(([emoji, art]) => ({ label: emoji, emojiArt: art, run: () => insert(emoji) }));
}
