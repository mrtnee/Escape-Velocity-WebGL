# Escape Velocity
Pri predmetu računalniška grafika in tehnologija iger smo za prvi seminar izdelali tretjeosebno streljačino z letali imenovano **Escape Velocity**.

## Modeli
Modele vesoljskih plovil nam je izdelal študent iz ALUO, svet v katerem se igra odvija, pa smo generirali sami.

### Nalaganje modelov
Pri nalaganju modelov v našo sceno, smo se odločili, da bomo omogočili branje formata `obj`, ker je preprost za branje in ga je mogoče izvoziti iz skoraj vseh 3d modelirnih programov. Napisali smo svoj bralnik, ki zna iz datoteke prebrati vozlišča, normale in teksturne koordinate, ter vrne prebran model, ki ga je mogoče nato vključiti v sceno.
Z njegovo pomočjo smo v igro naložili modela obeh vesoljskih plovil ter model kontrolne točke (checkpoint).

Modela vesoljskih plovil smo na začetku igre postavili nad svet na naključno pozicijo. Za vsako letalo smo postavili kamero, ki mu ves čas sledi.

V obliki kroga smo nad svet postavili še 6 kontrolnih točk, ki jih morata uporabnika zadeti, da dosežeta točko. Krog smo si izbrali, ker se nam je zdelo, da je za igralca smiselno, da si vnaprej zamislita pot, po kateri se bo zapeljal skozi kontrolne točke. Razmišljali smo, da bi jih postavili na naključne lokacije, a smo po testiranju ugotovili, da je to za uporabnika preveč kaotično. Izkazalo se je, da so bitke veliko bolj dramatične, če lahko igralca vsaj delno pričakujeta nasprotnika in pripravita svojo taktiko napada.

Nad svet smo dodali še nebo, da se uporabnik pri letenju orientira, saj smo ugotovili, da je navigacija po svetu brez tega izredno zahtevna. 

### Kreacija sveta
Pri terenu smo se odločili za drugačen pristop. Zdelo se nam je, da bo igra bolj zanimiva, če se bo svet vedno ob zagonu igre generiral naključno. Teren smo generirali z uporabo nekoliko prilagojenega Perlinovega šuma. Ta nam omogoča, da ustvarimo razgibano pokrajino, ki izgleda podobna resničnemu svetu. Z razgibanostjo reliefa smo odprli pot mnogim igralskim taktikam, ker pa je ta še naključno generiran, si nobeni dve partiji nista enaki.

Ker smo želeli, da je naša igra v izgledu low-poly, smo pri tem vse tri normale trikotnika obrnili v isto smer in jih nismo interpolirali med sosednjimi trikotniki. Tako smo dobili nezvezne trikotnike.

## Fizika
V igri nismo uporabili nobenega fizikalnega pogona s spleta. Pozorni gledalec bo opazil, da letali med zavijanjem nekoliko zanaša. S tem manevrom smo želeli simulirati fizikalni pojav - vztrajnost. Telesi izgledata, kot da vztrajata v enakomernem gibanju in se upirata spremembi velikosti ali smeri hitrosti, kar naredi igro še toliko bolj realistično.

### Kamera
Igro spremljamo skozi leči dveh kamer, saj je igra namenjena dvema igralcema. Pozicija kamere ni statična, saj se premika skupaj z letalom, hkrati pa se spreminja tudi glede na hitrost plovila. S spremembo pozicije kamere glede na letalo, smo ob pospeševanju uprizorili občutek, ki ga ob istem početju doživljamo v realnosti. Če v avtu pospešimo, se naše telo zaradi vztrajnostne sile pogrezne v sedež in oddalji naš pogled od armaturne plošče in to je občutek, ki smo ga želeli uprizoriti.

### Premikanje letal
S štirimi tipkami spreminjamo smer hitrosti s še eno dodatno tipko pa lahko hitrost letala povečamo. Obe akciji, tako sprememba smeri, kot sprememba hitrosti, sta okrepljeni z vizualnimi učinki, ki igralno izkušnjo približata realnosti. Letali se na videz upirata spremembi smeri in hitrosti leta zato njuno gibanje izgleda bolj naravno. Če letalo pospešimo, se kamera pomakne dlje nazaj, kar simulira občutek pospeševanja v resničnem življenju. 

### Streljanje
Za oboževalce akcije smo v igro dodali tudi možnost streljanja. Vsako od plovil je oboroženo z laserjem, ki strelja v ravni liniji in nima omejitve dometa. Izurjeni igralec lahko torej v vsakem trenutku sestreli nasprotnikovo plovilo in si s tem pridobi nekaj časa. Če je plovilo sestreljeno, se porodi na novi naključno izbrani lokaciji, z zakasnitvijo treh sekund. Uporaba strelnega orožja je nekoliko omejena. Če držimo tipko za streljanje predolgo, laserska puška postane ne optimalna saj namesto neprestanega curka laserja, le ta strelja odsekoma, v intervalih. Če s streljanjem prenehamo, orožje zopet začne delovati optimalno.

### Zaznavanje kolizij
Objekti v igri so lahko poljubno kompleksnih oblik, kar naredi zaznavanje kolizij precej računsko zahtevno. Zato smo letali in kontrolne točke odeli v kvadre in za zaznavanje kolizij uporabili AABB (**"Axis-Aligned Bounding Box"**) algoritem.

Za zaznavanje kolizije med letalom in tlemi smo vzeli kar centralno točko letala in preverili ali je ta pod svetom. V primeru, če se letalo dotakne tal ali če leti previsoko, je to oškodovano na enak način, kot če bi bilo sestreljeno.

## Senčilniki
Za izris naše igre smo uporabili tri senčilnike. Z enim smo izrisali celoten svet in obe letali. Ker smo si za material na tleh izbrali kamen, se nam je zdelo smiselno, da za njegovo upodabljanje uporabljamo le difuzno senčenje. Nad sceno smo postavili sonce, ki sveti v podano smer in za vsak trikotnik izračunali njegovo osvetlitev. Tako so vsi objekti na sceni osvetljeni iz iste smeri. Za tla smo uporabili teksturo oranžne barve z nekaj nepravilnostmi, da izgleda bolj resnično.

Želeli smo, da kontrolne točke po videzu nekoliko izstopajo in s tem igralcu sporočijo, da so pomemben del igre. Tako smo napisali senčilnik, ki celoten objekt pobarva v eno barvo. Ko se uporabnik zapelje skozi kontrolno točko, ta spremeni barvo v barvo igralca.

Zadnji senčilnik je senčilnik za nebo. Ta je skoraj enak kot prvi senčilnik, le da ne uporablja nobene osvetlitve, saj nebo ne sme biti osvetljeno.
