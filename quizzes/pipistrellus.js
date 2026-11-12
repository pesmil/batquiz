// =====================================================================
//  QUIZ: Pipistrellus – Beobachtungen und Referenzbestimmungen
//  Ein Eintrag = ein Tier (eine "Frage"), mit einem oder mehreren Fotos.
//  Die Reihenfolge der Beobachtungen wird im Quiz gemischt,
//  die Reihenfolge der Fotos innerhalb einer Beobachtung bleibt wie hier.
//
//  id         eindeutiges Kürzel, erscheint in der Tabelle
//  images     Liste der Fotos, das erste ist das Startbild.
//             Es reicht der Dateiname, genau wie im Ordner images/ (mit Leerzeichen und ©).
//             Autor und Lizenz werden automatisch aus dem Teil nach "©" gelesen
//             und unter dem Foto angezeigt, z.B.
//             "pippyg_1 - © Mateusz Ciechanowski CC BY-NC.jpg"
//               → "© Mateusz Ciechanowski · CC BY-NC"
//             Erkannte Lizenzen: CC BY, CC BY-NC, CC BY-SA, CC BY-NC-SA, CC BY-ND, CC0 (auch mit 4.0),
//             "alle Rechte vorbehalten", "public domain". Ohne © im Namen: keine Bildunterschrift.
//             Fotos direkt von iNaturalist (Autor und Lizenz kommen automatisch mit):
//               "inat:123456789"     alle Fotos der Beobachtung 123456789
//               "inat:123456789/2"   nur Foto Nr. 2 dieser Beobachtung
//               oder einfach den Link "https://www.inaturalist.org/observations/123456789"
//             Lokale Dateien und iNaturalist-Fotos dürfen gemischt werden.
//  reference  deine Referenzbestimmung (wird erst am Schluss gezeigt)
//  note       optional: kurzer Kommentar zur Auflösung
//
//  Neue Beobachtung: einen Block { … } kopieren und mit Komma anhängen.
//  Beliebig viele Beobachtungen und beliebig viele Fotos pro Beobachtung.
// =====================================================================
window.QUIZ_QUESTIONS = [
{ id: "pipkuh5", images: ["inat:176587792/1", "inat:176587792/4"], reference: "Pipistrellus kuhlii", note: "" },
{ id: "pippip5", images: ["inat:317375562/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pipnat3", images: ["inat:312969404/2"], reference: "Pipistrellus nathusii" },
{ id: "pipnat4", images: ["inat:251233663/1"], reference: "Pipistrellus nathusii" },
{ id: "pippip7", images: ["inat:251234295/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippip8", images: ["inat:251212869/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippip3", images: ["inat:16742472/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippip2", images: ["inat:129122394/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pipkuh3", images: ["inat:372277955/1"], reference: "Pipistrellus kuhlii" },
{ id: "pipnat1", images: ["inat:379660698/1"], reference: "Pipistrellus nathusii" },
{ id: "pippip1", images: ["inat:390799667/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippyg6", images: ["inat:300505575/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pippyg7", images: ["inat:107580676/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pipkuh4", images: ["inat:378459775/1"], reference: "Pipistrellus kuhlii" },
{ id: "pippip10", images: ["inat:66583820/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippip6", images: ["inat:282300087/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippyg1", images: ["inat:378183275/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pipkuh6", images: ["inat:777285/1"], reference: "Pipistrellus kuhlii" },
{ id: "pippip9", images: ["inat:191266824/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippyg2", images: ["inat:354655200/1", "inat:354655200/3", "inat:354655200/5"], reference: "Pipistrellus pygmaeus" },
{ id: "pippyg9", images: ["inat:61459266/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pippyg3", images: ["inat:329965615/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pipnat2", images: ["inat:344868744/1"], reference: "Pipistrellus nathusii" },
{ id: "pippip4", images: ["inat:344868726/1"], reference: "Pipistrellus pipistrellus" },
{ id: "pippyg8", images: ["inat:146784687/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pipkuh1", images: ["inat:400438093/1"], reference: "Pipistrellus kuhlii" },
{ id: "pipkuh2", images: ["inat:394060556/1"], reference: "Pipistrellus kuhlii" },
{ id: "pippyg4", images: ["inat:314193685/1"], reference: "Pipistrellus pygmaeus" },
{ id: "pippyg5", images: ["inat:183054417/1"], reference: "Pipistrellus pygmaeus" },

];
