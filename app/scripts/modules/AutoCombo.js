function createAutoComboModule(utils) {
    return {
        name: "autoCombo",
        title: "Kick + Save",

        defaultSettings: {
            kicksPerCycle: 1,
            kickCycleSeconds: 1,
            savesPerCycle: 1,
            saveCycleSeconds: 1,

            kickList: {},   // { uid: true }
            saveList: [],   // [uid]
        },

        renderSettings(container) {
            const S = utils.loadSettings(this.name, this.defaultSettings);
            container.innerHTML = "";

            /* HELPERS */
            const shorten = n => n?.length > 8 ? n.slice(0, 8) + "…" : n;
            const saveNow = () => utils.saveSettings(this.name, S);


            /* PLAYERS */
            function getPlayers() {
                try {
                    const links = document.querySelectorAll(".player__name__link");
                    if (!links?.length) return [];

                    return [...links]
                        .map(el => {
                            const userId =
                                el.getAttribute("data-uid") ||
                                el.closest("[data-uid]")?.getAttribute("data-uid");

                            const name =
                                el.getAttribute("data-name") ||
                                el.textContent?.trim() ||
                                "?";

                            return userId ? { userId, name } : null;
                        })
                        .filter(Boolean);
                } catch {
                    return [];
                }
            }

            /* STORAGE */
            const kickIntervals = {};
            const saveIntervals = {};

            /* KICK */
            function doKick(uid) {
                try {
                    const wrap =
                        document.querySelector(`.player__wrap[data-uid='${uid}']`) ||
                        document.querySelector(`.user-list__item[data-uid='${uid}']`);
                    if (!wrap) return;

                    let menu = wrap.querySelector(".player__menu.js-player-menu");
                    if (!menu || menu.style.display === "none") {
                        wrap.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true }));
                        menu = wrap.querySelector(".player__menu.js-player-menu");
                    }

                    const kickBtn = menu?.querySelector(".player__menu__item--kick");
                    if (kickBtn) {
                        kickBtn.dispatchEvent(
                            new MouseEvent("click", { bubbles: true, cancelable: true, view: window })
                        );
                    }
                } catch {}
            }

            function startKick(uid) {
                stopKick(uid);
                S.kickList[uid] = true;
                saveNow();

                kickIntervals[uid] = setInterval(() => {
                    for (let i = 0; i < S.kicksPerCycle; i++)
                        setTimeout(() => doKick(uid), i * (1000 / S.kicksPerCycle));
                }, S.kickCycleSeconds * 1000);
            }

            function stopKick(uid) {
                clearInterval(kickIntervals[uid]);
                delete kickIntervals[uid];
                delete S.kickList[uid];
                saveNow();
            }

            /* SAVE */
            function doSave(uid) {
                try {
                    document
                        .querySelectorAll(".message__text .save-kick")
                        ?.forEach(a => {
                            if (a.getAttribute("data-user-id") === uid) a.click();
                        });
                } catch {}
            }

            function startSave(uid) {
                stopSave(uid);
                if (!S.saveList.includes(uid)) S.saveList.push(uid);
                saveNow();

                saveIntervals[uid] = setInterval(() => {
                    for (let i = 0; i < S.savesPerCycle; i++)
                        setTimeout(() => doSave(uid), i * (1000 / S.savesPerCycle));
                }, S.saveCycleSeconds * 1000);
            }

            function stopSave(uid) {
                clearInterval(saveIntervals[uid]);
                delete saveIntervals[uid];
                S.saveList = S.saveList.filter(x => x !== uid);
                saveNow();
            }


            /* UI — OPTIONS */
            const opt = utils.el("div", {
                css: {
                    marginBottom: "12px",
                    padding: "6px",
                    border: "1px solid #444",
                    borderRadius: "6px",
                    background: "#1115"
                }
            });
            container.append(opt);

            function addRow(title, v1, cb1, v2, cb2) {
                const row = utils.el("div", {
                    css: {
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "6px",
                        marginBottom: "6px"
                    }
                });

                row.append(
                    utils.el("label", {
                        text: title,
                        css: { width: "48px", opacity: 0.85 }
                    }),

                    utils.el("label", {
                        text: "adet",
                        css: { fontSize: "11px", opacity: 0.7 }
                    }),

                    utils.el("input", {
                        attrs: { type: "number", min: "1", value: v1 },
                        css: { width: "46px", textAlign: "center" },
                        oninput: e => cb1(+e.target.value || 1)
                    }),

                    utils.el("label", {
                        text: "sn",
                        css: { fontSize: "11px", opacity: 0.7 }
                    }),

                    utils.el("input", {
                        attrs: { type: "number", min: "1", value: v2 },
                        css: { width: "46px", textAlign: "center" },
                        oninput: e => cb2(+e.target.value || 1)
                    }),
                );

                opt.append(row);
            }

            addRow(
                "Kick",
                S.kicksPerCycle,
                v => { S.kicksPerCycle = v; saveNow(); },
                S.kickCycleSeconds,
                v => { S.kickCycleSeconds = v; saveNow(); },
            );

            addRow(
                "Save",
                S.savesPerCycle,
                v => { S.savesPerCycle = v; saveNow(); },
                S.saveCycleSeconds,
                v => { S.saveCycleSeconds = v; saveNow(); },
            );


            /* PLAYER LIST */
            const listRoot = utils.el("div", {
                css: {
                    maxHeight: "540px",
                    overflowY: "auto",
                    border: "1px solid #333",
                    borderRadius: "6px",
                    padding: "4px"
                }
            });
            container.append(listRoot);


            const clearBtn = utils.el("button", {
                text: "Seçimleri temizle",
                css: {
                    background: "#b11",
                    color: "#fff",
                    width: "100%",
                    marginTop: "6px",
                    padding: "6px",
                    borderRadius: "4px",
                }
            });
            clearBtn.onclick = () => {
                Object.keys(kickIntervals).forEach(stopKick);
                [...S.saveList].forEach(stopSave);
                S.kickList = {};
                S.saveList = [];
                saveNow();
                refreshList();
            };
            container.append(clearBtn);


            /* REFRESH */
            function refreshList() {
                const players = getPlayers();
                listRoot.innerHTML = "";

                if (!players.length) {
                    listRoot.append(
                        utils.el("div", {
                            text: "Oda boş…",
                            css: { opacity: 0.5, textAlign: "center", padding: "10px" }
                        })
                    );
                    return;
                }

                players.forEach(p => {
                    const uid = p.userId;

                    const row = utils.el("div", {
                        css: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                            gap: "6px",
                        }
                    });

                    row.append(
                        utils.el("span", {
                            text: shorten(p.name),
                            css: { flex: "1" }
                        })
                    );

                    const isKick = S.kickList[uid];
                    const btnKick = utils.el("button", {
                        text: isKick ? "K.DUR" : "KICK",
                        css: { minWidth: "60px", fontSize: "11px" }
                    });
                    btnKick.style.backgroundColor = isKick ? "#d32f2f" : "#388e3c";
                    btnKick.onclick = () => {
                        isKick ? stopKick(uid) : startKick(uid);
                        refreshList();
                    };
                    row.append(btnKick);

                    const isSave = S.saveList.includes(uid);
                    const btnSave = utils.el("button", {
                        text: isSave ? "S.DUR" : "SAVE",
                        css: { minWidth: "60px", fontSize: "11px" }
                    });
                    btnSave.style.backgroundColor = isSave ? "#d32f2f" : "#1976d2";
                    btnSave.onclick = () => {
                        isSave ? stopSave(uid) : startSave(uid);
                        refreshList();
                    };
                    row.append(btnSave);

                    listRoot.append(row);
                });
            }

            refreshList();


            /* AUTO-RESUME */
            function autoResume() {
                Object.keys(S.kickList).forEach(uid => startKick(uid));
                S.saveList.forEach(uid => startSave(uid));
            }
            autoResume();


            /* AUTO REFRESH */
            setInterval(refreshList, 2000);
        }
    };
}
