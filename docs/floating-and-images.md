# Mobile controls and image-map cleanup

Mobile WhatsApp remains in the existing bottom navigation (same destination); its duplicate floating overlay is desktop-only. The tab-bar height now adds the safe-area inset rather than squeezing controls into it. Page bottom clearance is 88px plus the safe area; scroll/focus clearance uses the same measurement. Footer accessibility links and all existing controls remain intact.

Important limitation: no floating accessibility widget implementation, launcher selector, or provider script exists in current main. The public injected Grok extensions script also has no accessibility control. No guessed selectors, third-party widget hiding, or replacement accessibility widget was added. A browser DOM/screenshot identifying that control is required to adjust its position safely; this part is not verified/fixed.

Missing tracked assets (no filename/case/path equivalent found):
- public/catalog/images/images-new-01.json
- public/catalog/images/images-new-02.json
- public/catalog/images/images-new-03.json
- public/catalog/images/images-new-04.json
- public/catalog/images/images-new-05.json

Also public/catalog/images/images-new-00.json exists but contains the literal PLACEHOLDER_FOR_19K, not JSON. It remains on disk but is no longer requested. All six stale manifest references were removed, retaining batch1-polished.json and batch2-polished.json. Existing differently numbered image maps cannot be assumed to be the missing shards and were not relabeled. No images were invented. Existing base image maps still load normally; unavailable product photos use a shared neutral placeholder, including load errors and related cards.

Preview prerequisite reused from PR #10: package immutable catalog JSON into the serverless function and resolve it relative to the emitted module, avoiding protected self-fetch. This changes no environment or protection settings, no prices/product data, and no main/production branch. Build plus manifest/mobile source regression and the real emitted handler from read-only /proc with network forbidden are checked. Visual mobile overlap/browser interaction remains unverified (no approved browser tool available to this executor).
