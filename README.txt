LA FAB’ D’OPTIQUE — SCROLL WORLD V7

Site vitrine interactif responsive (HTML/CSS/JS), prêt pour Vercel.

VIDÉOS INTÉGRÉES (VOS NOUVELLES VIDÉOS) :
1. 1028.mp4 → façade et traversée de la boutique : 180 images WebP
2. 3D_animation_of_luxury_glasses...mp4 → monture en 3D : 144 images WebP
3. Person_putting_on_glasses...mp4 → essayage de lunettes : 120 images WebP

Chaque section est épinglée pendant le défilement. Les images réagissent au scroll souris ou au glissement tactile, dans les deux sens. Le défilement normal revient une fois la séquence terminée.

Compteurs « 01 / 03 », barres de progression et pourcentages retirés.
Logo Fab modernisé conservé. Logos de marques, coordonnées et carte Google Maps conservés.

POUR PUBLIER : importer le contenu de l'archive (pas l'archive elle-même) dans un dépôt GitHub, puis connecter le dépôt à Vercel en choisissant le framework « Other ». Aucun build nécessaire.

Pour essayer en local : python -m http.server 8000 depuis le dossier décompressé puis ouvrir http://localhost:8000. L'ouverture directe de index.html sans serveur est à éviter à cause des restrictions du navigateur.

Les versions MP4 dans assets/scene*-fallback.mp4 sont des copies légères utilisées uniquement en affiche de secours ; le rendu Scroll World utilise les séquences WebP dans assets/frames.
