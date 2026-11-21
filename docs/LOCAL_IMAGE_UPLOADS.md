# Sharing local files

FUSAM and the standalone userscript send public uploads to the chosen host over HTTPS.

| Action | Storage |
| --- | --- |
| Chat file sharing and Room Tools | WaifuVault with a lifetime of 1, 12, 24 or 72 hours |
| Gallery | Local copy, temporary WaifuVault link or long-lived AnonDrop link |
| Music | Local copy or long-lived AnonDrop link |
| Compatibility banner or group image sharing | AnonDrop public image link |
| Cloud profile images, Feed and authenticated Cloud attachments | Access-controlled KikiLink Cloud media |

AnonDrop can reclaim inactive files on the free service.

KikiLink validates and re-encodes images as WebP, removing embedded image metadata
before sending a prepared copy. The selected image stays on your device until an
upload action. Images can contain visible identifying details. Shared music
accepts supported playlist audio files up to 80 MB and room MP3 or MP4 files up to
20 MB. Audio can contain embedded metadata. Prepared WebP images can be up to 8 MB.

The file link can be opened by anyone who receives it. Removing a Gallery or Music
entry leaves its public link active. Earlier Catbox and Litterbox links still use
their original providers and retention policies. See [Privacy](../PRIVACY.md#public-shared-files).
