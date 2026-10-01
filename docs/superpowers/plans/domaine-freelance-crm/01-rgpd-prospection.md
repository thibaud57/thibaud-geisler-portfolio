# Déclaration RGPD de la prospection et du réseau professionnel : Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mettre le registre des traitements et la politique de confidentialité en règle pour la prospection et le réseau professionnel, avant que la base stocke des personnes.

**Architecture:** Contenu seul. Le registre interne gagne un Traitement 7 ; la politique publique gagne une puce dans le markdown de ses finalités (FR et EN), une phrase sur l'opposition à la prospection dans le message `PrivacyPolicy.rights.body` et une nouvelle date `PrivacyPolicy.lastUpdated` ; `ARCHITECTURE.md` renvoie au Traitement 7. Aucune ligne `DataProcessing`, aucun code, aucun test.

**Tech Stack:** markdown lu par `loadLegalContent` (`src/lib/legal/load-legal-content.ts`), messages next-intl (`messages/fr.json`, `messages/en.json`, rendus par `t.rich`).

**Spec:** `docs/superpowers/specs/domaine-freelance-crm/01-rgpd-prospection-design.md`

## Global Constraints

- **Contenu seul** : aucun fichier sous `src/`, aucune migration, aucune ligne `DataProcessing`. `tdd_scope: none`, aucun test à écrire.
- **Durées** : prospect 3 ans à compter de la collecte ou du dernier contact émanant de lui ; personne qui s'est opposée, email et profil LinkedIn seuls conservés 3 ans ; réseau, durée de la relation. Aucune autre valeur.
- **Parité FR et EN** : mêmes clés, mêmes informations, seules les valeurs changent (`.claude/rules/next-intl/translations.md`).
- **Balises `t.rich` intactes** : `<mail>…</mail>` et `<cnil>…</cnil>` restent dans `PrivacyPolicy.rights.body`, sinon la page casse ou perd ses liens.
- **Deux clés `lastUpdated`** existent dans chaque fichier de messages (mentions légales et politique) : seule celle de `PrivacyPolicy` change.
- **Rédaction** : français avec accents, aucun tiret cadratin, guillemets « » en français.
- **`docs/PRODUCTION.md` gouverné par `production-doc`** : charger ce skill et lire son template avant d'y écrire la rubrique « Demandes RGPD » (Task 3), jamais l'éditer à main nue.
- **Aucun commit** : `/implement-subproject` porte le commit unique, que le propriétaire valide.

**Rules :** `.claude/rules/next-intl/translations.md`, `.claude/rules/nextjs/rendering-caching.md`.

## Review Focus

- **Balises `<mail>` et `<cnil>` de `rights.body`** : une balise supprimée ou mal refermée fait échouer `t.rich` au rendu ; la page doit afficher les deux liens dans les deux langues. Vérifié à la Task 2, Step 7.
- **JSON des messages** : une apostrophe typographique ou un guillemet non échappé dans une valeur casse le parse de `messages/*.json` et tout le site ; `just typecheck` et `just dev` le révèlent. Vérifié à la Task 2, Steps 6 et 7.
- **Puce markdown sur une seule ligne** : un retour à la ligne dans la puce la coupe en deux paragraphes dans `MarkdownContent`. Vérifié à la Task 2, Step 7.
- **Mauvaise clé `lastUpdated`** : modifier celle de `LegalNotice` change la date des mentions légales au lieu de la politique. Vérifié à la Task 2, Step 7.
- **Durées identiques partout** : registre, puce FR et puce EN doivent dire les mêmes 3 ans et la même règle de réseau. Vérifié à la Task 1, Step 4 ; les puces de la Task 2 reprennent ces durées mot pour mot.

---

### Task 1 : Registre et architecture

**Files:**
- Modify: `docs/registre-traitements.md` (frontmatter `date`, nouvelle section après « Traitement 6 », avant « Notes »)
- Modify: `docs/ARCHITECTURE.md` (§ Protection Données, puce « Données personnelles de tiers »)

**Interfaces:**
- Consumes: rien
- Produces: le Traitement 7 et sa phrase type, que la Task 2 reprend mot pour mot pour les durées

- [ ] **Step 1 : Mettre à jour la date du registre**

Dans le frontmatter de `docs/registre-traitements.md`, remplacer `date: "2026-05-19"` par la date du jour d'exécution au format `"AAAA-MM-JJ"`.

- [ ] **Step 2 : Ajouter le Traitement 7**

Insérer, entre la fin du tableau du « Traitement 6 » et la ligne `## Notes`, exactement :

```markdown
## Traitement 7 : relations professionnelles (prospection et réseau)

| Champ | Détail |
|---|---|
| Finalité | Prospection commerciale des services du freelance et suivi de son réseau professionnel, depuis l'espace admin |
| Base légale | Intérêt légitime (art. 6.1.f) : développer l'activité en proposant ses services à des professionnels, la sollicitation restant en rapport avec leur profession ([CNIL, prospection par courrier électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique-sms-mms-et-automate-dappel)) |
| Personnes concernées | Prospects et auteurs de demandes entrantes (leads) ; réseau professionnel : anciens collègues, clients, partenaires (contacts) ; nom et adresse d'une entreprise individuelle chez un prospect ou un client (entité légale), ceux d'une personne physique, avec les mêmes droits qu'un lead |
| Données | Identité, poste, entreprise, coordonnées professionnelles (email, téléphone), profil LinkedIn, notes d'échange, historique des actions de prospection et des entretiens |
| Sources | Profils professionnels publics (LinkedIn, site de l'entreprise), candidatures et plateformes de mission, recommandations, événements professionnels, échanges directs |
| Destinataire | Thibaud Geisler |
| Sous-traitants | IONOS (hébergeur du VPS et de la base), Cloudflare (bucket `portfolio-backups` des sauvegardes de la base, juridiction `eu`) |
| Transferts hors UE | Aucun |
| Conservation | Prospect : 3 ans à compter de la collecte ou du dernier contact émanant de lui, puis relance pour savoir s'il souhaite rester, suppression sans réponse positive ([délibération CNIL n° 2021-131 du 23 septembre 2021](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045538574)). Personne qui s'est opposée : email et profil LinkedIn seuls, conservés 3 ans, durée minimale recommandée par la CNIL, pour la seule gestion de l'opposition ([CNIL, liste repoussoir](https://www.cnil.fr/fr/comment-utiliser-une-liste-repoussoir-pour-respecter-lopposition-la-prospection-commerciale), consultée le 2026-09-26). Réseau : durée de la relation, suppression à la demande de la personne ; aucune durée CNIL n'existe hors prospection, choix du responsable |
| Information des personnes | Au plus tard au premier message (art. 14.3.b), par la phrase type ci-dessous, le droit d'opposition présenté séparément (art. 21.4). Personne jamais contactée : exception d'effort disproportionné (art. 14.5.b), l'information étant rendue publique par la [politique de confidentialité](https://thibaud-geisler.com/fr/confidentialite) |
| Stockage | Base PostgreSQL, schema `freelance`, joignable du seul réseau Docker interne |
| Sécurité | Espace admin single-user derrière Google OAuth et whitelist (Traitement 6), HTTPS/TLS |
| AIPD | Non nécessaire à cette échelle : aucune donnée sensible, aucune décision automatisée à effet juridique. À réévaluer si les agents internes se mettent à noter les personnes |

Phrase type du premier message :

- FR : « Je vous contacte à titre professionnel. Vos coordonnées sont traitées selon ma politique de confidentialité : https://thibaud-geisler.com/fr/confidentialite. Vous pouvez vous y opposer à tout moment : un simple « stop » en réponse suffit. »
- EN : « I am contacting you in a professional capacity. Your contact details are processed under my privacy policy: https://thibaud-geisler.com/en/confidentialite. You can object at any time: simply reply "stop". »
```

- [ ] **Step 3 : Renvoyer au Traitement 7 depuis l'architecture**

Dans `docs/ARCHITECTURE.md`, § Protection Données, remplacer la puce :

```markdown
- **Données personnelles de tiers** (post-MVP) : le domaine freelance introduira des contacts, prospects et entreprises nominatifs dans le schema `freelance`. Leur reprise impose au préalable une entrée dédiée au [registre des traitements](registre-traitements.md) et une mise à jour de la politique de confidentialité. Le profilage d'équipe cliente n'est pas repris
```

par :

```markdown
- **Données personnelles de tiers** : les contacts, prospects et entreprises nominatifs du domaine freelance, dans le schema `freelance`, relèvent du Traitement 7 du [registre des traitements](registre-traitements.md) et de la finalité « prospection et relations professionnelles » de la politique de confidentialité. Le profilage d'équipe cliente n'est pas repris
```

- [ ] **Step 4 : Relire**

Vérifier : le tableau du Traitement 7 a bien deux colonnes sur chaque ligne (aucune barre verticale parasite dans une cellule), aucune durée autre que celles des Global Constraints, aucun caractère tiret cadratin U+2014 dans le fichier (une recherche de ce caractère dans `docs/registre-traitements.md` ne remonte que des lignes préexistantes, s'il y en a).

---

### Task 2 : Politique de confidentialité publique

**Files:**
- Modify: `content/legal/fr/confidentialite-intro.md` (troisième puce de la section 2)
- Modify: `content/legal/en/confidentialite-intro.md` (troisième puce de la section 2)
- Modify: `messages/fr.json` (`PrivacyPolicy.lastUpdated`, `PrivacyPolicy.rights.body`)
- Modify: `messages/en.json` (`PrivacyPolicy.lastUpdated`, `PrivacyPolicy.rights.body`)

**Interfaces:**
- Consumes: les durées et la règle de conservation du Traitement 7 (Task 1)
- Produces: rien pour d'autres tâches

- [ ] **Step 1 : Ajouter la puce française**

À la fin de `content/legal/fr/confidentialite-intro.md`, après la puce « Prise de rendez-vous Calendly », ajouter sur une seule ligne :

```markdown
- **Prospection et relations professionnelles** : si je vous ai contacté ou si vous faites partie de mon réseau professionnel, je conserve vos nom, poste, entreprise, coordonnées professionnelles, profil LinkedIn et nos échanges. Ces données proviennent de profils professionnels publics (LinkedIn, site de votre entreprise), de candidatures et plateformes de mission, de recommandations, d'événements professionnels ou de nos échanges directs, et sont hébergées par IONOS et sauvegardées chez Cloudflare, dans l'Union européenne. Base légale : intérêt légitime de l'éditeur à proposer ses services à des professionnels, en rapport avec leur activité (RGPD art. 6-1-f). Durée : 3 ans à compter de la collecte ou de votre dernier contact pour un prospect, durée de la relation pour le réseau professionnel. Vous pouvez vous opposer à tout moment à la prospection, sans justification, en répondant « stop » à mon message ou en écrivant à l'adresse indiquée dans la section 5 ; seuls votre adresse email et votre profil LinkedIn sont alors conservés, 3 ans, pour ne plus vous solliciter. L'historique de nos échanges est conservé sans être réutilisé jusqu'au terme de sa durée de conservation et vous pouvez en demander l'effacement complet à tout moment.
```

- [ ] **Step 2 : Ajouter la puce anglaise**

À la fin de `content/legal/en/confidentialite-intro.md`, après la puce « Calendly scheduling », ajouter sur une seule ligne :

```markdown
- **Prospecting and professional relationships**: if I have contacted you or you are part of my professional network, I keep your name, job title, company, professional contact details, LinkedIn profile and our exchanges. This data comes from public professional profiles (LinkedIn, your company's website), job applications and freelance platforms, referrals, professional events or our direct exchanges, and is hosted by IONOS and backed up with Cloudflare, within the European Union. Legal basis: legitimate interest of the publisher in offering its services to professionals, in connection with their activity (GDPR art. 6-1-f). Retention: 3 years from collection or from your last contact for a prospect, the duration of the relationship for the professional network. You can object to prospecting at any time, without giving a reason, by replying "stop" to my message or by writing to the address given in section 5; only your email address and LinkedIn profile are then kept, for 3 years, so that you are not contacted again. The history of our exchanges is kept without being reused until the end of its retention period, and you can request its complete erasure at any time.
```

- [ ] **Step 3 : Mentionner l'opposition dans « Vos droits » en français**

Dans `messages/fr.json`, sous `PrivacyPolicy.rights`, remplacer la valeur de `body` par :

```json
"body": "Conformément au RGPD, vous disposez des droits suivants : accès, rectification, effacement, opposition, limitation, portabilité de vos données. Vous pouvez vous opposer à tout moment, sans justification, à la prospection. Vous pouvez exercer ces droits en écrivant à <mail>contact@thibaud-geisler.com</mail>. Vous avez également le droit d'introduire une réclamation auprès de la <cnil>CNIL</cnil> (Commission nationale de l'informatique et des libertés)."
```

- [ ] **Step 4 : Mentionner l'opposition dans « Your rights » en anglais**

Dans `messages/en.json`, sous `PrivacyPolicy.rights`, remplacer la valeur de `body` par :

```json
"body": "Under GDPR, you have the following rights: access, rectification, erasure, objection, restriction, and data portability. You can object to prospecting at any time, without giving a reason. You can exercise these rights by writing to <mail>contact@thibaud-geisler.com</mail>. You also have the right to lodge a complaint with the <cnil>CNIL</cnil> (French data protection authority)."
```

- [ ] **Step 5 : Dater la politique**

Dans `messages/fr.json`, la clé `lastUpdated` **du bloc `PrivacyPolicy`** (pas celle du bloc des mentions légales) prend la date du jour d'exécution au format existant, par exemple `"Dernière mise à jour : 28 avril 2026"`. Dans `messages/en.json`, même clé du bloc `PrivacyPolicy`, format existant, par exemple `"Last updated: April 28, 2026"`.

- [ ] **Step 6 : Vérifier la qualité**

Run: `just lint`
Expected: aucune erreur (formatage JSON et markdown compris ; si le formatage échoue, `just format` puis relancer).

Run: `just typecheck`
Expected: aucune erreur (les messages typés par next-intl gardent les mêmes clés).

Run: `just test`
Expected: suite verte, aucun test modifié.

- [ ] **Step 7 : Vérifier le rendu**

Run: `just dev`, puis ouvrir `http://localhost:3000/fr/confidentialite` et `http://localhost:3000/en/confidentialite`.
Expected, dans les deux langues :
- la section 2 compte trois puces, la troisième étant « Prospection et relations professionnelles » (« Prospecting and professional relationships »), affichée en un seul paragraphe de puce ;
- « 5. Vos droits » (« 5. Your rights ») contient la phrase sur l'opposition à la prospection, le lien email et le lien CNIL cliquables ;
- le sous-titre porte la nouvelle date ;
- `http://localhost:3000/fr/mentions-legales` garde son ancienne date.

Puis arrêter le serveur : `just stop`.

---

### Task 3 : Procédure des demandes RGPD dans PRODUCTION.md

**Files:**
- Modify: `docs/PRODUCTION.md` (nouvelle rubrique « Demandes RGPD », étape de rejeu dans « Procédure : Restauration BDD »)

**Interfaces:**
- Consumes: le Traitement 7 du registre (Task 1), le journal hors dépôt (Décision RGPD du propriétaire, 2026-09-27)
- Produces: rien pour d'autres tâches

- [ ] **Step 1 : Charger le skill et son template**

Charger `Skill[production-doc]` et lire son template avant d'écrire, pour respecter la structure et le niveau de titre attendus dans `docs/PRODUCTION.md`.

- [ ] **Step 2 : Écrire la rubrique « Demandes RGPD »**

Dans `docs/PRODUCTION.md`, ajouter une rubrique « Demandes RGPD » qui couvre, pour chaque droit du Traitement 7 (`docs/registre-traitements.md`) :
- **Accès** (réponse sous 1 mois, exigence CNIL) : procédure écrite qui rassemble tout ce qui concerne une personne (sa fiche, actions de prospection, missions, entretiens, signaux), sans écran dédié
- **Rectification** : correction directe de la fiche depuis l'écran (`08`, `13`)
- **Opposition** (art. 21) : un bouton dédié de l'écran d'administration, à tout moment et sans justification, réduit la fiche à ce qui reconnaît la personne (email, LinkedIn) et pose la date du stop une seule fois ; garde les rôles et l'historique ; une case propose d'enchaîner aussitôt l'effacement des échanges
- **Effacement** (art. 17.1.c) : à tout moment après le stop, un second geste, disponible sur une fiche déjà opposée, retire ses actions, ses signaux et sa place de correspondant d'entretien, et pose la date de l'effacement une seule fois
- **Journal des demandes RGPD** (date de la demande, nature, réponse, date de l'effacement le cas échéant) : tenu hors de ce dépôt, dans une note privée, parce qu'il contient des noms

- [ ] **Step 3 : Rejeu après restauration**

Dans `docs/PRODUCTION.md`, section « 💾 Backup & Recovery », sous-section « Procédure : Restauration BDD », ajouter une étape après le smoke test : rejouer les oppositions et les effacements survenus depuis l'horodatage de la sauvegarde restaurée, à partir de `Person.optedOutAt` et `Person.exchangesErasedAt`, et les rectifications à partir du journal des demandes RGPD (Step 2), puisque les sauvegardes gardent 30 jours et qu'une restauration peut ramener des données déjà traitées.

- [ ] **Step 4 : Vérifier**

Run: `just lint`
Expected: aucune erreur de formatage markdown.
