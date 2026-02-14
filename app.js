
        const { useState, useEffect, useMemo, useRef } = React;

        class AppErrorBoundary extends React.Component {
            constructor(props) {
                super(props);
                this.state = { hasError: false, errorMsg: '' };
            }

            static getDerivedStateFromError(error) {
                return { hasError: true, errorMsg: error?.message || 'Unknown UI error' };
            }

            componentDidCatch(error, errorInfo) {
                console.error('NotaryOS runtime crash:', error, errorInfo);
            }

            handleReset = () => {
                try {
                    localStorage.removeItem('notary_user_profile');
                    localStorage.removeItem('notary_appointments');
                    localStorage.removeItem('notary_clients');
                    localStorage.removeItem('notary_credentials');
                    localStorage.removeItem('notary_journal');
                    localStorage.removeItem('notary_team');
                    localStorage.removeItem('notary_assignments');
                    localStorage.removeItem('notary_esignatures');
                    localStorage.removeItem('notary_active_trip');
                    localStorage.removeItem('notary_onboarded');
                    localStorage.removeItem('notary_tour_completed');
                } catch (e) {
                    console.error('Reset failed', e);
                }
                window.location.reload();
            };

            render() {
                if (this.state.hasError) {
                    return (
                        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
                            <div className="max-w-md w-full bg-white border border-red-100 rounded-2xl shadow-lg p-6 text-center">
                                <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-red-50 text-red-600 grid place-items-center text-2xl"><i className="fas fa-triangle-exclamation"></i></div>
                                <h2 className="text-xl font-bold text-slate-800 mb-2">App recovered from a crash</h2>
                                <p className="text-sm text-slate-500 mb-4">We detected unstable local data or runtime state. You can reset local app data and reopen a stable session.</p>
                                <p className="text-xs text-slate-400 mb-4">Error: {this.state.errorMsg}</p>
                                <button onClick={this.handleReset} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold">Reset to Stable Mode</button>
                            </div>
                        </div>
                    );
                }
                return this.props.children;
            }
        }

        // --- TOAST CONTEXT ---
        window.addToastFn = null;
        
        const useIsDesktop = () => {
            const [isDesktop, setIsDesktop] = React.useState(() => window.innerWidth >= 1024);
            React.useEffect(() => {
                const onResize = () => setIsDesktop(window.innerWidth >= 1024);
                window.addEventListener('resize', onResize);
                return () => window.removeEventListener('resize', onResize);
            }, []);
            return isDesktop;
        };

        const getWorkspaceMode = () => {
            try{ return localStorage.getItem('notary_workspace_mode') === 'true'; }catch(e){ return false; }
        };
        const setWorkspaceMode = (val) => {
            try{ localStorage.setItem('notary_workspace_mode', val ? 'true' : 'false'); }catch(e){}
        };

const showToast = (msg, type = 'success') => { if (window.addToastFn) window.addToastFn(msg, type); };
const TRIAL_DAYS = 14;

        const ToastContainer = () => {
            const [toasts, setToasts] = useState([]);

            useEffect(() => {
                window.addToastFn = (msg, type) => {
                    const id = Date.now();
                    setToasts(prev => [...prev, { id, msg, type }]);
                    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
                };
            }, []);

            return (
                <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
                    {toasts.map(t => (
                        <div key={t.id} className={`toast-enter px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-white font-medium pointer-events-auto ${t.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                            <i className={`fas ${t.type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`}></i>
                            {t.msg}
                        </div>
                    ))}
                </div>
            );
        };

        // --- HELPER FUNCTIONS ---

        const applyTheme = (theme) => {
            const t = (theme || localStorage.getItem('notary_theme') || 'default').toLowerCase();
            document.body.setAttribute('data-theme', t);
            try { localStorage.setItem('notary_theme', t); } catch(e) {}
        };
        applyTheme();


        // Added simple feature access check to prevent undefined errors
        const hasFeatureAccess = (user, feature) => {
            if (!user) return false;
            const plan = user.plan || 'free';
            const role = user.role || 'solo';

            if (feature === 'agency') return plan === 'team' || role === 'agency';
            if (feature === 'pro') return plan === 'pro' || plan === 'team';

            return true;
        };


        // --- ADMIN / PREVIEW MODE ---
        const getAdminPreview = () => {
            try { return localStorage.getItem('notary_admin_preview') === '1'; } catch(e) { return false; }
        };
        const setAdminPreview = (enabled) => {
            try { localStorage.setItem('notary_admin_preview', enabled ? '1' : '0'); } catch(e) {}
        };
        const isAdminPreview = (user) => {
            // Demo-only admin preview. Enable via Settings or by adding ?admin=1 to the URL once.
            const urlHasAdmin = (typeof window !== 'undefined') && new URLSearchParams(window.location.search).get('admin') === '1';
            if (urlHasAdmin) { setAdminPreview(true); return true; }
            return getAdminPreview() === true;
        };

        // Unified access check used across the app (paywall + admin preview)
        const canAccess = (feature, user) => {
            if (isAdminPreview(user)) return true;
            return hasFeatureAccess(user, feature);
        };

        // Added mock encryption/decryption to prevent ReferenceErrors in Journal
        const encryptPayload = (str) => {
            try { return btoa(str); } catch (e) { return str; }
        };
        const decryptPayload = (str) => {
            try { return atob(str); } catch (e) { return str; }
        };

        const safeStorageGet = (key, fallback = null) => {
            try {
                const value = localStorage.getItem(key);
                return value === null ? fallback : value;
            } catch (e) {
                return fallback;
            }
        };

        const safeStorageSet = (key, value) => {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                return false;
            }
        };

        const safeParse = (value, fallback) => {
            if (value === null || value === undefined) return fallback;
            try {
                return JSON.parse(value);
            } catch (err) {
                return fallback;
            }
        };

        const downloadCSV = (rows, filename='export.csv') => {
            try{
                const csv = rows.map(r => r.map(v => {
                    const s = (v === null || v === undefined) ? '' : String(v);
                    const escaped = s.replace(/"/g, '""');
                    return (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) ? `"${escaped}"` : escaped;
                }).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
            }catch(e){
                console.error(e);
                showToast('Unable to export CSV', 'error');
            }
        };


        const buildSmsLink = (phone, message) => {
            const p = String(phone || '').trim();
            if(!p) return null;
            const body = encodeURIComponent(message || '');
            // iOS supports sms:&body= ; Android often uses ?body=
            return `sms:${encodeURIComponent(p)}?&body=${body}`;
        };

        const buildMailtoLink = (email, subject, body) => {
            const e = String(email || '').trim();
            if(!e) return null;
            const params = new URLSearchParams();
            if(subject) params.set('subject', subject);
            if(body) params.set('body', body);
            return `mailto:${encodeURIComponent(e)}?${params.toString()}`;
        };



        // --- Phase 4 Step A: Read-only Setup Checklist (no writes, no effects) ---
        const computeSetupChecklistReadOnly = ({ user, appointments }) => {
            const profileName = (user && (user.name || user.displayName)) ? (user.name || user.displayName) : '';
            const profileCompany = (user && (user.company || user.businessName)) ? (user.company || user.businessName) : '';
            const profileDone = !!profileName && !!profileCompany;

            const apptDone = Array.isArray(appointments) && appointments.length > 0;

            const journal = safeParse(localStorage.getItem('notary_journal'), []);
            const expenses = safeParse(localStorage.getItem('notary_expenses'), []);
            const mileage = safeParse(localStorage.getItem('notary_mileage'), []);

            const journalDone = Array.isArray(journal) && journal.length > 0;
            const expenseDone = Array.isArray(expenses) && expenses.length > 0;

            // Step A is read-only; GPS "enabled" is inferred if we have at least one saved mileage trip.
            const gpsDone = Array.isArray(mileage) && mileage.length > 0;

            // If future steps set a flag, we reflect it; otherwise false.
            const exportDone = (localStorage.getItem('notary_exported_once') === 'true');

            return {
                profile: { done: profileDone, name: !!profileName, company: !!profileCompany },
                appointment: { done: apptDone },
                journal: { done: journalDone },
                expense: { done: expenseDone },
                gps: { done: gpsDone },
                export: { done: exportDone }
            };
        };

        
        const persistSetupChecklistLocal = (user, appointments) => {
            try{
                const computed = computeSetupChecklistReadOnly({ user, appointments });
                const payload = {
                    version: 1,
                    updatedAt: Date.now(),
                    steps: computed
                };
                localStorage.setItem('notary_setup_checklist_v1', JSON.stringify(payload));
                return payload;
            }catch(e){
                return null;
            }
        };

        const markExportedOnce = () => {
            try{ localStorage.setItem('notary_exported_once','true'); }catch(e){}
        };

        const markGpsEnabled = () => {
            try{ localStorage.setItem('notary_gps_enabled','true'); }catch(e){}
        };

const SetupChecklistCard = ({ user, appointments, setView, onOpenSettings }) => {
            const persisted = safeParse(localStorage.getItem('notary_setup_checklist_v1'), null);
            const c = (persisted && persisted.steps) ? persisted.steps : computeSetupChecklistReadOnly({ user, appointments });

            const steps = [
                { key:'profile', title:'Profile', subtitle:'Name + company', done:c.profile.done,
                  cta: c.profile.done ? null : { label:'Update Profile', onClick: () => { onOpenSettings && onOpenSettings(); } } },
                { key:'appointment', title:'First Appointment', subtitle:'Add your first appointment', done:c.appointment.done,
                  cta: c.appointment.done ? null : { label:'Go to Schedule', onClick: () => setView('schedule') } },
                { key:'journal', title:'First eJournal Entry', subtitle:'Record your first entry', done:c.journal.done,
                  cta: c.journal.done ? null : { label:'Go to eJournal', onClick: () => setView('journal') } },
                { key:'expense', title:'First Expense', subtitle:'Track business costs', done:c.expense.done,
                  cta: c.expense.done ? null : { label:'Go to Finances', onClick: () => setView('finances') } },
                { key:'gps', title:'GPS Mileage', subtitle:'Start + stop a trip', done:c.gps.done,
                  cta: c.gps.done ? null : { label:'Open GPS', onClick: () => { setView('finances'); showToast('Go to Finances → GPS Mileage to start a trip.', 'info'); } } },
                { key:'export', title:'Export Preview', subtitle:'Download CSV for taxes', done:c.export.done,
                  cta: c.export.done ? null : { label:'Open Export', onClick: () => { setView('finances'); showToast('Go to Finances → Export to download a CSV.', 'info'); } } },
            ];

            const doneCount = steps.filter(s => s.done).length;
            const pct = Math.round((doneCount / steps.length) * 100);

            return (
                <div className="card" style={{marginTop:12}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                        <div>
                            <div style={{fontWeight:900}}>Setup Checklist</div>
                            <div className="theme-text-muted" style={{fontSize:13}}>Finish setup to unlock the full workflow.</div>
                        </div>
                        <div className="net-pill" title="Progress"><span className="net-dot"></span>{doneCount}/{steps.length} • {pct}%</div>
                    </div>

                    <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:10, marginTop:12}}>
                        {steps.map(s => (
                            <div key={s.key} className="card card-tight" style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10}}>
                                <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
                                    <span style={{
                                        width:24, height:24, borderRadius:999,
                                        display:'inline-flex', alignItems:'center', justifyContent:'center',
                                        background: s.done ? 'rgba(16,185,129,.18)' : 'rgba(255,255,255,.08)',
                                        border: '1px solid rgba(255,255,255,.12)'
                                    }}>
                                        <i className={("fas " + (s.done ? "fa-check" : "fa-circle") + " text-[11px]")}></i>
                                    </span>
                                    <div style={{minWidth:0}}>
                                        <div style={{fontWeight:900, lineHeight:1.2}}>{s.title}</div>
                                        <div className="theme-text-muted" style={{fontSize:12, marginTop:2}}>{s.subtitle}</div>
                                    </div>
                                </div>
                                {!s.done && s.cta && (
                                    <button className="btn btn-secondary" style={{height:36, whiteSpace:'nowrap'}} onClick={s.cta.onClick}>
                                        {s.cta.label}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>

                    {!c.profile.done && (
                        <div className="theme-text-muted" style={{fontSize:12, marginTop:10}}>
                            Profile completion requires <b>Name</b> and <b>Company</b>. (We’ll add the company field in the next step.)
                        </div>
                    )}
                </div>
            );
        };
        // --- End Phase 4 Step A ---



        const viewLabel = (key) => {
            const map = {
                dashboard: 'Dashboard',
                schedule: 'Schedule',
                journal: 'eJournal',
                clients: 'Client Directory',
                finances: 'Finances',
                credentials: 'Credentials',
                compliance: 'Compliance',
                training: 'Training',
                trainer: 'Training',
                settings: 'Settings',
            };
            if (map[key]) return map[key];
            const s = String(key || '').replace(/[-_]/g,' ').replace(/([a-z])([A-Z])/g,'$1 $2');
            return s.split(' ').map(w => w ? (w[0].toUpperCase()+w.slice(1)) : '').join(' ').trim();
        };



        // --- ONBOARDING PROGRESS (Phase 4, Step 1: Profile) ---
        const ONBOARDING_KEY = 'notary_onboarding_progress_v1';

        const computeProfileProgress = (profile) => {
            const name = (profile && (profile.name || profile.displayName)) ? (profile.name || profile.displayName) : '';
            const phone = (profile && profile.phone) ? String(profile.phone).trim() : '';
            const completed = !!name && !!phone;
            return { completed, name: !!name, phone: !!phone };
        };

        const loadOnboardingProgress = () => {
            return safeParse(safeStorageGet(ONBOARDING_KEY, null), {
                profile: { completed: false, completedAt: null }
            });
        };

        const persistOnboardingProgress = (userProfile) => {
            const existing = loadOnboardingProgress();
            const p = computeProfileProgress(userProfile);
            const now = Date.now();

            const next = {
                ...existing,
                updatedAt: now,
                profile: {
                    completed: p.completed,
                    completedAt: p.completed ? (existing?.profile?.completedAt || now) : null
                }
            };

            safeStorageSet(ONBOARDING_KEY, JSON.stringify(next));

            // Persist onto the user profile as well (for cross-device persistence when/if cloud auth is used)
            const mergedUser = {
                ...userProfile,
                onboarding: {
                    ...(userProfile && userProfile.onboarding ? userProfile.onboarding : {}),
                    profile: next.profile,
                    updatedAt: now,
                    version: 1
                }
            };

            return { nextProgress: next, mergedUser };
        };



        // --- DATA MANAGER ---
        const DataManager = {
            isCloud: () => typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser !== null,
            get: async (collectionName) => {
                if (DataManager.isCloud()) {
                    try {
                        const uid = firebase.auth().currentUser.uid;
                        const snapshot = await firebase.firestore().collection(collectionName).where("userId", "==", uid).get();
                        if (snapshot.empty) return DataManager.getLocal(collectionName);
                        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    } catch (e) { return DataManager.getLocal(collectionName); }
                } else { return DataManager.getLocal(collectionName); }
            },
            save: async (collectionName, item) => {
                const now = Date.now();
                item = { ...item, updatedAt: item.updatedAt || now };
                const localData = DataManager.saveLocal(collectionName, item);
                if (DataManager.isCloud()) {
                    try {
                        const uid = firebase.auth().currentUser.uid;
                        const itemWithUser = { ...item, userId: uid };
                        const docId = item.id || Date.now().toString();
                        const docRef = firebase.firestore().collection(collectionName).doc(docId);

                        // Conflict resolution (Last Edit Wins): only overwrite if incoming is newer
                        const existingSnap = await docRef.get();
                        if (existingSnap.exists) {
                            const existing = existingSnap.data() || {};
                            const exUpdated = existing.updatedAt || 0;
                            const inUpdated = itemWithUser.updatedAt || 0;
                            if (inUpdated < exUpdated) {
                                // Keep cloud version
                                const snapshot = await firebase.firestore().collection(collectionName).where("userId", "==", uid).get();
                                return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
                            }
                        }
                        await docRef.set(itemWithUser);

                        const snapshot = await firebase.firestore().collection(collectionName).where("userId", "==", uid).get();
                        return { success: true, data: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) };
                    } catch (e) { return { success: false, data: localData }; }
                }
                return { success: false, data: localData };
            },
            saveLocal: (key, item) => {
                const now = Date.now();
                item = { ...item, updatedAt: item.updatedAt || now };
                const list = safeParse(localStorage.getItem(key), []);
                const index = list.findIndex(i => i.id === item.id);
                if (index >= 0) list[index] = item; else list.push(item);
                localStorage.setItem(key, JSON.stringify(list));
                return list;
            },
            getLocal: (key) => safeParse(localStorage.getItem(key), []),
             delete: async (collectionName, id) => {
                const localData = DataManager.deleteLocal(collectionName, id);
                if (DataManager.isCloud()) { try { await firebase.firestore().collection(collectionName).doc(id).delete(); } catch(e) {} }
                return localData;
            },
            deleteLocal: (key, id) => {
                const list = safeParse(localStorage.getItem(key), []);
                const newList = list.filter(i => i.id !== id);
                localStorage.setItem(key, JSON.stringify(newList));
                return newList;
            }
        };

        // --- PDF GENERATORS ---
        const PDFGenerator = {
            createInvoice: (appt, user) => {
                if (!window.jspdf) { showToast("PDF Library Loading...", 'error'); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                const primaryColor = [37, 99, 235];
                const businessName = user.businessName || user.name || "Notary Public";
                doc.setFontSize(22); doc.setTextColor(...primaryColor); doc.text("INVOICE", 160, 20);
                doc.setFontSize(10); doc.setTextColor(100); doc.text(`ID: ${appt.id.substring(0,8)}`, 160, 26); doc.text(`Date: ${new Date().toLocaleDateString()}`, 160, 31);
                doc.setFontSize(12); doc.setTextColor(0); doc.text(businessName.toUpperCase(), 20, 20);
                doc.setFontSize(10); doc.setTextColor(100); doc.text(user.phone || "", 20, 26); doc.text(user.email || "", 20, 31);
                if(user.address) doc.text(user.address, 20, 36);
                doc.setTextColor(0); doc.text("BILL TO:", 20, 55);
                doc.setFontSize(14); doc.text(appt.clientName, 20, 62);
                doc.setFontSize(10); doc.text(appt.location, 20, 68);
                doc.autoTable({ startY: 80, head: [['Description', 'Date', 'Amount']], body: [[appt.type || 'Notary Service', appt.date, `$${appt.fee}`]], theme: 'grid', headStyles: { fillColor: primaryColor } });
                const finalY = doc.lastAutoTable.finalY + 10;
                doc.setFontSize(12); doc.text(`Total Due: $${appt.fee}`, 160, finalY, { align: 'right' });

                // --- BUSINESS LOGO/SEAL IF UPLOADED ---
                if(user.logoUrl) {
                    try {
                        doc.addImage(user.logoUrl, 'PNG', 20, 5, 30, 30);
                    } catch(e) { console.log("Image error", e); }
                }

                doc.save(`invoice_${appt.clientName}.pdf`);
                showToast("Invoice Downloaded");
            },
            createSignedAgreement: ({ clientName, clientEmail, signature, signedAt, title, body }) => {
                if (!window.jspdf) { showToast("PDF Library Loading...", 'error'); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(18); doc.text(title, 14, 20);
                doc.setFontSize(10); doc.text(`Client: ${clientName}`, 14, 28);
                doc.text(`Email: ${clientEmail}`, 14, 34);
                doc.text(`Signed: ${new Date(signedAt).toLocaleString()}`, 14, 40);
                doc.setFontSize(11);
                doc.text(body, 14, 52, { maxWidth: 180 });
                doc.setFontSize(12);
                doc.text(`Signature: ${signature}`, 14, 120);
                doc.save(`signed_${title.replace(/\s+/g, '_').toLowerCase()}.pdf`);
                showToast("Signed Document Downloaded");
            },
            createReport: (title, columns, data, filename) => {
                if (!window.jspdf) { showToast("PDF Library Loading...", 'error'); return; }
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();
                doc.setFontSize(18); doc.text(title, 14, 22);
                doc.setFontSize(10); doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 28);
                doc.autoTable({ startY: 35, head: [columns], body: data, theme: 'striped' });
                doc.save(filename);
                showToast("Report Downloaded");
            }
        };

        const STATE_DATABASE = {
            "AL": { "state": "Alabama", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Not specified" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "AK": { "state": "Alaska", "fees": { "acknowledgment": "$25.00", "jurat": "$25.00", "oath": "$25.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Not specified" }, "red_flags": ["Conflict of Interest"], "specialized": { "loan_signing": "Allowed", "apostille": "Lt. Governor", "marriage": "No" }},
            "AZ": { "state": "Arizona", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "1 or 2 allowed", "expired_id_rule": "Not allowed" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "AR": { "state": "Arkansas", "fees": { "acknowledgment": "Reasonable", "jurat": "Reasonable", "oath": "Reasonable" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Not specified" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "CA": { "state": "California", "fees": { "acknowledgment": "$15.00", "jurat": "$15.00", "oath": "$15.00" }, "id_requirements": { "credible_witnesses": "1 known OR 2 with ID", "expired_id_rule": "5 years" }, "red_flags": ["Thumbprint mandatory for Deeds/POA"], "specialized": { "loan_signing": "Background Check Required", "apostille": "Secretary of State", "marriage": "No" }},
            "CO": { "state": "Colorado", "fees": { "acknowledgment": "$15.00", "jurat": "$15.00", "oath": "$15.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "1 year" }, "red_flags": ["No Seal Embosser"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "CT": { "state": "Connecticut", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Attorney State (Restriction)"], "specialized": { "loan_signing": "ATTORNEY STATE (Witness Only)", "apostille": "Secretary of State", "marriage": "No" }},
            "DE": { "state": "Delaware", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Attorney State"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "Secretary of State", "marriage": "No" }},
            "DC": { "state": "District of Columbia", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Office of Notary", "marriage": "No" }},
            "FL": { "state": "Florida", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "1 known OR 2 with ID", "expired_id_rule": "5 years" }, "red_flags": ["No Family"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "YES ($30 Fee)" }},
            "GA": { "state": "Georgia", "fees": { "acknowledgment": "$2.00", "jurat": "$2.00", "oath": "$2.00" }, "id_requirements": { "credible_witnesses": "Not specified", "expired_id_rule": "Not specified" }, "red_flags": ["Attorney State"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "GSCCCA", "marriage": "No" }},
            "HI": { "state": "Hawaii", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Lt. Governor", "marriage": "No" }},
            "ID": { "state": "Idaho", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "IL": { "state": "Illinois", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Cook County Record"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "IN": { "state": "Indiana", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["Title Producer License for LSA"], "specialized": { "loan_signing": "REQUIRES TPL LICENSE", "apostille": "Secretary of State", "marriage": "No" }},
            "IA": { "state": "Iowa", "fees": { "acknowledgment": "Reasonable", "jurat": "Reasonable", "oath": "Reasonable" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "KS": { "state": "Kansas", "fees": { "acknowledgment": "Reasonable", "jurat": "Reasonable", "oath": "Reasonable" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "KY": { "state": "Kentucky", "fees": { "acknowledgment": "Not set", "jurat": "Not set", "oath": "Not set" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "LA": { "state": "Louisiana", "fees": { "acknowledgment": "Not set", "jurat": "Not set", "oath": "Not set" }, "id_requirements": { "credible_witnesses": "2 witnesses", "expired_id_rule": "Current" }, "red_flags": ["Civil Law Notary"], "specialized": { "loan_signing": "Civil Law Notary Exam Required", "apostille": "Secretary of State", "marriage": "No" }},
            "ME": { "state": "Maine", "fees": { "acknowledgment": "Reasonable", "jurat": "Reasonable", "oath": "Reasonable" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "YES" }},
            "MD": { "state": "Maryland", "fees": { "acknowledgment": "$4.00", "jurat": "$4.00", "oath": "$4.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["TIP License Required"], "specialized": { "loan_signing": "REQUIRES TIP LICENSE", "apostille": "Secretary of State", "marriage": "No" }},
            "MA": { "state": "Massachusetts", "fees": { "acknowledgment": "Not set", "jurat": "Not set", "oath": "Not set" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Attorney State"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "Secretary of the Commonwealth", "marriage": "No" }},
            "MI": { "state": "Michigan", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "MN": { "state": "Minnesota", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["Closing Agent License"], "specialized": { "loan_signing": "REQUIRES CLOSING LICENSE", "apostille": "Secretary of State", "marriage": "No" }},
            "MS": { "state": "Mississippi", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "5 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "MO": { "state": "Missouri", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "MT": { "state": "Montana", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "YES" }},
            "NE": { "state": "Nebraska", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$2.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "NV": { "state": "Nevada", "fees": { "acknowledgment": "$15.00", "jurat": "$15.00", "oath": "$7.50" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Notary Discretion" }, "red_flags": ["Escrow License for LSA"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "YES (Specific Cert Required)" }},
            "NH": { "state": "New Hampshire", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Not specified" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "NJ": { "state": "New Jersey", "fees": { "acknowledgment": "$2.50", "jurat": "$2.50", "oath": "$2.50" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Treasury Division", "marriage": "No" }},
            "NM": { "state": "New Mexico", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "1 year" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "NY": { "state": "New York", "fees": { "acknowledgment": "$2.00", "jurat": "$2.00", "oath": "$2.00" }, "id_requirements": { "credible_witnesses": "Not specified", "expired_id_rule": "Not specified" }, "red_flags": ["No Initials in Name"], "specialized": { "loan_signing": "Allowed", "apostille": "Dept of State", "marriage": "No" }},
            "NC": { "state": "North Carolina", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "ND": { "state": "North Dakota", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Valid" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "OH": { "state": "Ohio", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Not specified" }, "red_flags": ["Conflict of Interest"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "OK": { "state": "Oklahoma", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "OR": { "state": "Oregon", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "PA": { "state": "Pennsylvania", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of the Commonwealth", "marriage": "No" }},
            "RI": { "state": "Rhode Island", "fees": { "acknowledgment": "$25.00", "jurat": "$25.00", "oath": "$25.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "SC": { "state": "South Carolina", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Attorney Supervision"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "Secretary of State", "marriage": "YES" }},
            "SD": { "state": "South Dakota", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "TN": { "state": "Tennessee", "fees": { "acknowledgment": "$0", "jurat": "$0", "oath": "$0" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["Reasonable Fees"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "YES" }},
            "TX": { "state": "Texas", "fees": { "acknowledgment": "$6.00", "jurat": "$6.00", "oath": "$6.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "UT": { "state": "Utah", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Valid" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Lt. Governor", "marriage": "No" }},
            "VT": { "state": "Vermont", "fees": { "acknowledgment": "No limit", "jurat": "No limit", "oath": "No limit" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["Attorney Supervision"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "Secretary of State", "marriage": "No" }},
            "VA": { "state": "Virginia", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "Current" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of the Commonwealth", "marriage": "No" }},
            "WA": { "state": "Washington", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "WV": { "state": "West Virginia", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["Attorney State"], "specialized": { "loan_signing": "ATTORNEY STATE", "apostille": "Secretary of State", "marriage": "No" }},
            "WI": { "state": "Wisconsin", "fees": { "acknowledgment": "$5.00", "jurat": "$5.00", "oath": "$5.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "WY": { "state": "Wyoming", "fees": { "acknowledgment": "$10.00", "jurat": "$10.00", "oath": "$10.00" }, "id_requirements": { "credible_witnesses": "Allowed", "expired_id_rule": "3 years" }, "red_flags": ["No Notarios"], "specialized": { "loan_signing": "Allowed", "apostille": "Secretary of State", "marriage": "No" }},
            "certificates": { "acknowledgment_text": "State of [State]...", "jurat_text": "Subscribed and sworn..." }
        };
        const COURSE_MODULES = [ { id: 1, title: "Authority", topic: "Commissioning authority." } ];
        const PERSONA = `ROLE: NOTARY MENTOR. TONE: Helpful.`;

        // --- FOOTER CONTENT DATA ---
        const FOOTER_CONTENT = {
            privacy: {
                title: "Privacy Policy",
                content: `
                    <p><strong>Effective Date:</strong> February 2026</p>
                    <h3 class="font-bold mt-4 mb-2">1. Information We Collect</h3>
                    <p>We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us. This information may include: name, email, phone number, postal address, profile picture, payment method, and other information you choose to provide.</p>
                    <h3 class="font-bold mt-4 mb-2">2. How We Use Information</h3>
                    <p>We may use the information we collect about you to provide, maintain, and improve our services, including to facilitate payments, send receipts, provide products and services you request (and send related information), develop new features, provide customer support to Users and Notaries, develop safety features, authenticate users, and send product updates and administrative messages.</p>
                    <h3 class="font-bold mt-4 mb-2">3. Local Storage vs Cloud Sync</h3>
                    <p>By default, NotaryOS operates in a "local-first" mode. Client data, journal entries, and appointments are stored locally in your browser/device. If you opt into Pro or Agency tiers and enable Cloud Sync, data is securely transmitted and encrypted at rest on our servers.</p>
                `
            },
            terms: {
                title: "Terms of Service",
                content: `
                    <p><strong>Effective Date:</strong> February 2026</p>
                    <h3 class="font-bold mt-4 mb-2">1. Acceptance of Terms</h3>
                    <p>By accessing and using NotaryOS, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.</p>
                    <h3 class="font-bold mt-4 mb-2">2. Not Legal Advice</h3>
                    <p>NotaryOS is a management and educational tool. The AI Trainer and compliance alerts provide information based on general state data. This tool does NOT constitute legal advice. You are a commissioned public official and must always verify procedures with your official state handbook and commissioning authority.</p>
                    <h3 class="font-bold mt-4 mb-2">3. User Responsibility</h3>
                    <p>You are solely responsible for all notarial acts performed. NotaryOS is not liable for any errors, omissions, rejected documents, lost fees, or legal actions resulting from your use of this software or your performance as a notary public.</p>
                `
            },
            security: {
                title: "Data Security",
                content: `
                    <h3 class="font-bold mt-4 mb-2">Bank-Grade Security</h3>
                    <p>Security is built into NotaryOS at multiple layers. All data transmitted between your device and our cloud servers (if Cloud Sync is enabled) is encrypted using TLS 1.3. Data at rest is encrypted using AES-256 encryption.</p>
                    <h3 class="font-bold mt-4 mb-2">Local-First Privacy</h3>
                    <p>For users on our Starter plan, or those who opt out of Cloud Sync, your journal entries and client PII remain strictly on your local device's storage. We cannot access, read, or recover this data.</p>
                    <h3 class="font-bold mt-4 mb-2">Audit Capture</h3>
                    <p>Images of IDs or thumbprints captured for your journal are lightly encrypted before being stored. These are retained purely for your compliance audit requirements and are not used for any external processing or machine learning.</p>
                `
            },
            compliance: {
                title: "Compliance Commitment",
                content: `
                    <h3 class="font-bold mt-4 mb-2">50-State Architecture</h3>
                    <p>NotaryOS is designed to support the diverse and ever-changing landscape of US notary laws. Our state database provides contextual hints for maximum fees, credible witness rules, and ID expiration allowances.</p>
                    <h3 class="font-bold mt-4 mb-2">Journal Requirements</h3>
                    <p>Our digital journal workflow is built to capture the standard requirements of the most stringent states (like California and Texas), including signer signatures, ID details, fee tracking, and thumbprint/ID capture where legally mandated or permitted.</p>
                    <h3 class="font-bold mt-4 mb-2">Your Duty as a Notary</h3>
                    <p>While we strive for accuracy, laws change. The ultimate responsibility for compliance rests with the commissioned notary. NotaryOS serves as an organizational aid, not a substitute for knowing your state's laws.</p>
                `
            },
            help: {
                title: "Help Center & Support",
                content: `
                    <h3 class="font-bold mt-4 mb-2">Welcome to NotaryOS Support</h3>
                    <p>If you need assistance with your account, billing, or technical issues, our team is here to help.</p>
                    <ul class="list-disc pl-5 mt-4 space-y-2">
                        <li><strong>Email Support:</strong> support@notaryos.com (24-48 hr response time)</li>
                        <li><strong>Pro/Agency Priority:</strong> Access live chat directly inside the app dashboard.</li>
                        <li><strong>Feature Requests:</strong> Visit our Community board to upvote new features!</li>
                    </ul>
                `
            },
            handbooks: {
                title: "State Handbooks",
                content: `
                    <p>Quick access to official state commissioning authorities is available directly inside the NotaryOS application via the <strong>Admin & Curriculum</strong> modules. Please log in or sign up to access our directory of 50-state handbook links and regulatory portals.</p>
                `
            },
            community: {
                title: "NotaryOS Community",
                content: `
                    <h3 class="font-bold mt-4 mb-2">Join the Conversation</h3>
                    <p>Our community forum is currently in beta and available to Pro and Agency users. Inside, you can:</p>
                    <ul class="list-disc pl-5 mt-2 space-y-1">
                        <li>Discuss state-specific edge cases with other experienced notaries.</li>
                        <li>Share marketing strategies for loan signing agents.</li>
                        <li>Provide direct feedback to the NotaryOS development team.</li>
                    </ul>
                    <p class="mt-4">Log in to your account and navigate to the Community tab to get started.</p>
                `
            },
            contact: {
                title: "Contact Us",
                content: `
                    <div class="space-y-4">
                        <p><strong>General Inquiries:</strong> hello@notaryos.com</p>
                        <p><strong>Technical Support:</strong> support@notaryos.com</p>
                        <p><strong>Enterprise & Agency Sales:</strong> sales@notaryos.com</p>
                        <p><strong>Mailing Address:</strong><br/>NotaryOS Inc.<br/>100 Innovation Drive<br/>Suite 300<br/>San Francisco, CA 94111</p>
                    </div>
                `
            }
        };

        // --- COMPONENTS ---

        // 1. Modals & Helpers
        const TermsModal = ({ onClose }) => (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[100]">
                <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in font-sans">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className="fas fa-balance-scale text-blue-600"></i> Terms of Service</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="text-sm text-gray-600 mb-6 space-y-3 max-h-[60vh] overflow-y-auto">
                        <p className="font-bold">Last Updated: February 2026</p>
                        <p><strong>1. Acceptance of Terms:</strong> By accessing and using NotaryOS, you accept and agree to be bound by the terms and provision of this agreement.</p>
                        <p><strong>2. Not Legal Advice:</strong> NotaryOS is a management and educational tool. The AI Trainer provides information based on general data. This tool does not constitute legal advice. Always verify with your official state handbook.</p>
                        <p><strong>3. User Responsibility:</strong> You are responsible for all notarial acts performed. NotaryOS is not liable for any errors, omissions, or legal actions resulting from your use of this software.</p>
                        <p><strong>4. Data Privacy:</strong> In this version, business data is stored locally on your device unless Cloud Sync is explicitly enabled.</p>
                    </div>
                    <button onClick={onClose} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">I Understand & Agree</button>
                </div>
            </div>
        );


        const LEGAL_DOCS = {
            privacy: {
                title: 'Privacy Policy',
                icon: 'fa-user-shield',
                updated: 'February 2026',
                sections: [
                    'We collect account, usage, and business record data only to operate NotaryOS features you enable.',
                    'Core records may be stored locally in your browser for MVP workflows unless cloud sync is enabled and authenticated.',
                    'AI prompts are sent to the configured model provider only when AI features are used.',
                    'You may export backups at any time and request account-data deletion through support.'
                ]
            },
            dataProcessing: {
                title: 'Data Processing',
                icon: 'fa-database',
                updated: 'February 2026',
                sections: [
                    'NotaryOS acts as a processor for business records you create in the platform.',
                    'Data is scoped to authenticated user accounts when cloud mode is active.',
                    'Retention follows your active account lifecycle and deletion/export actions.',
                    'Subprocessors are limited to infrastructure and AI providers required for requested features.'
                ]
            },
            security: {
                title: 'Security Standards',
                icon: 'fa-shield-alt',
                updated: 'February 2026',
                sections: [
                    'We use authenticated access controls and account-scoped records for cloud collections.',
                    'Transport-level encryption is enforced for external API and provider requests.',
                    'Least-privilege design is applied across product features and data access patterns.',
                    'Users remain responsible for endpoint security on devices storing local records.'
                ]
            },
            compliance: {
                title: 'Compliance Center',
                icon: 'fa-balance-scale',
                updated: 'February 2026',
                sections: [
                    'NotaryOS supports 50-state notarial workflows with guided data capture and compliance prompts.',
                    'Content is educational and operational; it does not replace legal advice or state handbooks.',
                    'Teams should maintain jurisdiction-specific SOPs and annual legal review procedures.',
                    'Compliance artifacts can be exported for recordkeeping and internal audit processes.'
                ]
            },
            subscription: {
                title: 'Subscription Terms',
                icon: 'fa-credit-card',
                updated: 'February 2026',
                sections: [
                    'Plans renew on the billing interval selected at purchase until cancelled.',
                    'Upgrades apply immediately; downgrades take effect at the next billing period.',
                    'Feature access is plan-gated and may be limited after cancellation or failed payment.',
                    'Pricing and packaging updates will be announced before taking effect.'
                ]
            },
            acceptableUse: {
                title: 'Acceptable Use',
                icon: 'fa-gavel',
                updated: 'February 2026',
                sections: [
                    'Do not use NotaryOS for unlawful activity, fraud, identity abuse, or unauthorized data access.',
                    'You must not upload malicious code, attempt service disruption, or bypass plan restrictions.',
                    'Only store and process information you are authorized to handle.',
                    'Violations may result in account suspension or termination.'
                ]
            },
            cookie: {
                title: 'Cookie Policy',
                icon: 'fa-cookie-bite',
                updated: 'February 2026',
                sections: [
                    'Essential browser storage is used to keep sessions and product preferences functioning.',
                    'Analytics and marketing cookies are minimized in MVP mode and may expand with consent tooling.',
                    'You can clear local browser data at any time, which may remove saved offline records.',
                    'By continuing to use NotaryOS, you consent to required operational storage mechanisms.'
                ]
            }
        };

        const LegalDocModal = ({ doc, onClose }) => {
            const content = LEGAL_DOCS[doc];
            if (!content) return null;

            return (
                <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 animate-fade-in font-sans max-h-[85vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 border-b pb-4">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2"><i className={`fas ${content.icon} text-blue-600`}></i> {content.title}</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                        </div>
                        <p className="text-xs text-gray-500 mb-4">Last Updated: {content.updated}</p>
                        <div className="text-sm text-gray-600 space-y-3">
                            {content.sections.map((item, idx) => (
                                <p key={idx}><strong>{idx + 1}.</strong> {item}</p>
                            ))}
                        </div>
                        <button onClick={onClose} className="w-full mt-6 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition-colors">Close</button>
                    </div>
                </div>
            );
        };

        const PricingModal = ({ onClose, onUpgrade }) => (

            <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 backdrop-blur-sm z-[100]">
                <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center font-sans">
                    <h2 className="text-2xl font-bold mb-2">Upgrade to Pro</h2>
                    <p className="text-gray-500 mb-6">Unlock Unlimited AI, secure audit capture, payment processing, and client portal access.</p>
                    <div className="space-y-2 text-left text-sm text-gray-600 bg-gray-50 rounded-xl p-3 mb-4">
                        <p><i className="fas fa-check text-emerald-600 mr-2"></i>Pro: AI Trainer, Payments, Client Portal, Audit Capture</p>
                        <p><i className="fas fa-check text-indigo-600 mr-2"></i>Team: Agency mode with assignments & master calendar</p>
                    </div>
                    <button onClick={() => onUpgrade('pro')} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mb-2">Get Pro - $19/mo</button>
                    <button onClick={() => onUpgrade('team')} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold mb-2">Get Team - $49/mo</button>
                    <button onClick={onClose} className="text-gray-400 text-sm">Close</button>
                </div>
            </div>
        );

        const SettingsModal = ({ user, onClose, onSave, onOpenBillingPortal }) => {
            const [data, setData] = useState(user || {});
            const [adminPreviewEnabled, setAdminPreviewEnabled] = useState(isAdminPreview(user));


            useEffect(() => { if (typeof applyTheme === "function") applyTheme((user && user.theme) || data.theme); }, []);

            const handleLogoUpload = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onloadend = () => setData({ ...data, logoUrl: reader.result });
                reader.readAsDataURL(file);
            };

            const handleExportData = () => {
                const exportData = {};
                const keys = [
                    'notary_user_profile', 'notary_clients', 'notary_appointments', 'notary_journal',
                    'notary_expenses', 'notary_mileage', 'notary_credentials', 'notary_team',
                    'notary_assignments', 'notary_esignatures', 'gemini_api_key',
                    'notary_onboarded', 'notary_tour_completed'
                ];
                keys.forEach(key => {
                    const value = localStorage.getItem(key);
                    if (value) exportData[key] = value;
                });
                const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `notaryos_backup_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Backup downloaded successfully');
            };

            const handleImportData = (event) => {
                const file = event.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        Object.keys(importedData).forEach(key => {
                            if (key.startsWith('notary_') || key === 'gemini_api_key') localStorage.setItem(key, importedData[key]);
                        });
                        showToast('Data restored! Reloading...');
                        setTimeout(() => window.location.reload(), 1500);
                    } catch (err) {
                        showToast('Failed to restore data. Invalid file.', 'error');
                    }
                };
                reader.readAsText(file);
            };


            const handleOpenBilling = () => {
                if (typeof onOpenBillingPortal === 'function') return onOpenBillingPortal();
                if (STRIPE_BILLING_PORTAL_URL) window.open(STRIPE_BILLING_PORTAL_URL, '_blank');
                else showToast('Billing portal not configured', 'error');
            };

            const handleDeleteAccount = async () => {
                const ok = confirm('Delete account and all data? This will remove local data and attempt to delete cloud data (if signed in).');
                if (!ok) return;
                try {
                    // Best-effort cloud wipe
                    if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                        const uid = firebase.auth().currentUser.uid;
                        const collections = ['notary_clients','notary_appointments','notary_journal','notary_expenses','notary_mileage','notary_credentials','notary_team','notary_assignments','notary_esignatures'];
                        const db = firebase.firestore();
                        for (const c of collections) {
                            try {
                                const snap = await db.collection(c).where('userId','==',uid).get();
                                const batch = db.batch();
                                snap.docs.forEach(d => batch.delete(d.ref));
                                if (!snap.empty) await batch.commit();
                            } catch (e) {}
                        }
                        try { await firebase.auth().currentUser.delete(); } catch (e) { /* may require recent login */ }
                        try { await firebase.auth().signOut(); } catch (e) {}
                    }
                } catch (e) {}
                try {
                    localStorage.clear();
                } catch (e) {}
                showToast('Account deleted (local data cleared). Reloading...');
                setTimeout(() => window.location.reload(), 1200);
            };

            const handleSave = (e) => {
                e.preventDefault();
                onSave(data);
                onClose();
                showToast('Profile Updated');
            };

            return (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="theme-surface rounded-2xl shadow-2xl border theme-border max-w-3xl w-full max-h-[92vh] overflow-y-auto font-sans">
                        <div className="p-6 border-b theme-border flex items-center justify-between">
                            <div>
                                <h3 className="text-2xl font-bold theme-text">Settings & Workspace</h3>
                                <p className="theme-text-muted text-sm">Manage profile, branding, AI setup, and backup controls.</p>
                            </div>
                            <button onClick={onClose} className="theme-text-muted"><i className="fas fa-times"></i></button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold theme-text-muted uppercase mb-1">Your Name</label>
                                    <input className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" value={data.name || ''} onChange={e => setData({ ...data, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold theme-text-muted uppercase mb-1">Phone Number</label>
                                    <input className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"
                                        inputMode="tel"
                                        placeholder="(555) 555-5555"
                                        value={data.phone || ''}
                                        onChange={e => setData({ ...data, phone: e.target.value })} />
                                    <div className="theme-text-muted" style={{fontSize:12, marginTop:6}}>Used for confirmations and exports.</div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold theme-text-muted uppercase mb-1">Business Name</label>
                                    <input className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" value={data.businessName || ''} onChange={e => setData({ ...data, businessName: e.target.value })} />
                                
                                <div>
                                    <label className="block text-xs font-bold theme-text-muted uppercase mb-1">Theme</label>
                                    <select className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"
                                        value={data.theme || 'default'}
                                        onChange={e => { const t=e.target.value; setData({ ...data, theme: t }); try { if (typeof applyTheme==='function') applyTheme(t); } catch(err){} }}>
                                        <option value="default">Default</option>
                                        <option value="dark">Dark</option>
                                        <option value="classic">Classic</option>
                                        <option value="midnight">Midnight</option>
                                    </select>
                        <div className="mt-4">
                            <div className="font-bold theme-text mb-1">Workspace Mode (Desktop Beta)</div>
                            <div className="theme-text-muted mb-2" style={{fontSize:13}}>Enable an OS-style desktop workspace with draggable windows + taskbar.</div>
                            <label style={{display:'flex', alignItems:'center', gap:10}}>
                                <input type="checkbox" defaultChecked={getWorkspaceMode()} onChange={(e)=>{ setWorkspaceMode(e.target.checked); showToast(e.target.checked ? 'Workspace Mode enabled (reload to apply)' : 'Workspace Mode disabled (reload to apply)'); }} />
                                <span className="theme-text">Enable Workspace Mode</span>
                            </label>
                            <div className="mt-2">
                                <button className="btn btn-secondary" style={{height:36}} onClick={()=>window.location.reload()}>
                                    Reload Now
                                </button>
                            </div>
                        </div>

                                </div>
</div>
                            </div>

                            <div className="theme-surface-muted border theme-border rounded-xl p-4">
                                <label className="block text-xs font-bold theme-text-muted uppercase mb-2">Branding (Logo / Seal)</label>
                                <div className="flex flex-wrap items-center gap-4">
                                    {data.logoUrl && <img src={data.logoUrl} alt="Logo Preview" className="w-12 h-12 object-contain border theme-border rounded" />}
                                    <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm theme-text-muted" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold theme-text-muted uppercase mb-1">AI Coach API Key (Gemini)</label>
                                <input
                                    type="password"
                                    className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"
                                    value={data.geminiKey || localStorage.getItem('gemini_api_key') || ''}
                                    onChange={e => {
                                        setData({ ...data, geminiKey: e.target.value });
                                        localStorage.setItem('gemini_api_key', e.target.value);
                                    }}
                                    placeholder="Paste API key"
                                />
                            </div>

                            <div className="theme-surface-muted border theme-border rounded-xl p-4 space-y-3">
                                
<div className="rounded-xl border theme-border p-4 bg-white/60 mb-4">
    
                            <p className="text-xs font-bold theme-text-muted uppercase mt-1">Preferences</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-semibold theme-text mb-1">Theme</label>
                                    <select
                                        value={(data.theme || (user && user.theme) || 'default')}
                                        onChange={(e) => { const v = e.target.value; setData({ ...data, theme: v }); if (typeof applyTheme === 'function') applyTheme(v); }}
                                        className="w-full px-3 py-2 rounded-lg border theme-border theme-bg theme-text"
                                    >
                                        <option value="default">Default</option>
                                        <option value="dark">Dark</option>
                                        <option value="classic">Classic</option>
                                        <option value="midnight">Midnight</option>
                                    </select>
                                    <div className="text-xs theme-text-muted mt-1">Applies instantly and saves to your profile.</div>
                                </div>

                                <div className="rounded-xl border theme-border p-3 theme-bg">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold theme-text">Admin Preview</div>
                                            <div className="text-xs theme-text-muted">Unlock Pro features for testing (demo).</div>
                                        </div>
                                        <label className="inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only"
                                                checked={adminPreviewEnabled}
                                                onChange={(e) => { const on = !!e.target.checked; setAdminPreviewEnabled(on); setAdminPreview(on); showToast(on ? 'Admin preview enabled (Pro unlocked)' : 'Admin preview disabled'); }}
                                            />
                                            <span className={`w-12 h-7 flex items-center rounded-full p-1 transition-all duration-200 ${adminPreviewEnabled ? 'bg-green-600' : 'bg-gray-300'}`}>
                                                <span className={`bg-white w-5 h-5 rounded-full shadow transform transition-all duration-200 ${adminPreviewEnabled ? 'translate-x-5' : ''}`}></span>
                                            </span>
                                        </label>
                                    </div>
                                    <div className="text-xs theme-text-muted mt-2">Tip: add <span className="font-semibold">?admin=1</span> to the URL once to enable automatically.</div>
                                </div>
                            </div>

<p className="text-xs font-bold theme-text-muted uppercase">Billing</p>
    <div className="mt-2 flex flex-col gap-2">
        <div className="text-sm theme-text">
            <span className="font-semibold">Current plan:</span> {String(user?.plan || 'free').toUpperCase()}
        </div>
        <div className="text-sm theme-text-muted">
            {user?.plan === 'free' && user?.trialEndsAt
                ? <>Trial ends: <span className="font-semibold theme-text">{new Date(user.trialEndsAt).toLocaleDateString()}</span></>
                : (user?.plan === 'free' ? <>Trial ends: <span className="font-semibold theme-text">Not set</span></> : <>Your subscription is active.</>)
            }
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
            {user?.plan === 'free' && (
                <>
                    <button type="button" onClick={() => window.location.href = (STRIPE_PAYMENT_LINKS.pro || STRIPE_PAYMENT_LINK)} className="px-3 py-2 rounded-lg theme-accent-btn text-sm font-semibold">
                        Upgrade to Pro
                    </button>
                    <button type="button" onClick={() => window.location.href = (STRIPE_PAYMENT_LINKS.team || STRIPE_PAYMENT_LINK)} className="px-3 py-2 rounded-lg border theme-border theme-text text-sm font-semibold">
                        Upgrade to Team
                    </button>
                </>
            )}
            <button
                type="button"
                onClick={() => {
                    if (!onOpenBillingPortal) {
                        alert('Billing portal not configured in this build.');
                        return;
                    }
                    onOpenBillingPortal();
                }}
                className="px-3 py-2 rounded-lg border theme-border theme-text text-sm"
                title="Manage subscription (cancel, update card, invoices)"
            >
                <i className="fas fa-credit-card mr-2"></i>Manage Billing
            </button>
        </div>
        <div className="text-xs theme-text-muted">
            Tip: In Stripe, set your Payment Link <span className="font-semibold">success_url</span> to include <span className="font-semibold">?paid=1&amp;plan=pro</span> (or <span className="font-semibold">team</span>) so the app can unlock automatically in this demo build.
        </div>
    </div>
</div>
                            <p className="text-xs font-bold theme-text-muted uppercase">Data Management</p>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={handleExportData} className="px-3 py-2 rounded-lg border theme-border theme-text text-sm"><i className="fas fa-download mr-2"></i>Export Backup</button>
                                    <label className="px-3 py-2 rounded-lg border theme-border theme-text text-sm cursor-pointer"><i className="fas fa-upload mr-2"></i>Import Backup<input type="file" accept="application/json" className="hidden" onChange={handleImportData} /></label>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border theme-border theme-text">Cancel</button>
                                <button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Save Settings</button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        };

        const AIHelperModal = ({ onClose }) => {
            const [input, setInput] = useState('');
            const [messages, setMessages] = useState([{ role: 'assistant', content: "👋 Hi! Ask me about notary laws." }]);
            const [loading, setLoading] = useState(false);

            const handleSend = async () => {
                if (!input.trim()) return;
                const newMsgs = [...messages, { role: 'user', content: input }];
                setMessages(newMsgs);
                setInput('');
                setLoading(true);

                const apiKey = localStorage.getItem('gemini_api_key');
                if (!apiKey) {
                      setTimeout(() => {
                        setMessages([...newMsgs, { role: 'assistant', content: "Please add your API Key in Settings to enable AI responses." }]);
                        setLoading(false);
                    }, 800);
                    return;
                }

                try {
                     const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: `You are a helpful Notary Assistant. Answer concisely. User Query: ${input}` }] }] }) });
                     const data = await response.json();
                     const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Error.";
                     setMessages([...newMsgs, { role: 'assistant', content: aiText }]);
                } catch(e) { setMessages([...newMsgs, { role: 'assistant', content: "Error connecting to AI." }]); }
                setLoading(false);
            };

            return (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center pointer-events-none font-sans">
                    <div className="bg-white w-full sm:w-96 h-[60vh] shadow-2xl rounded-t-2xl sm:rounded-2xl flex flex-col pointer-events-auto border border-gray-200">
                        <div className="p-4 border-b flex justify-between bg-indigo-600 text-white rounded-t-2xl"><h3 className="font-bold">Quick Assist</h3><button onClick={onClose}>x</button></div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                            {messages.map((m, i) => <div key={i} className={`p-3 rounded-lg text-sm ${m.role === 'user' ? 'bg-indigo-100 ml-8' : 'bg-white mr-8 border'}`}>{m.content}</div>)}
                            {loading && <div className="text-xs text-gray-400">Thinking...</div>}
                        </div>
                        <div className="p-3 border-t bg-white flex gap-2"><input className="flex-1 p-2 border rounded" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} /><button onClick={handleSend} className="bg-indigo-600 text-white w-10 rounded">></button></div>
                    </div>
                </div>
            );
        };

        const InfoModal = ({ title, content, onClose }) => (
            <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] flex items-center justify-center p-4 backdrop-blur-sm font-sans">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col auth-fade-in">
                    <div className="flex justify-between items-center mb-4 border-b pb-4">
                        <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><i className="fas fa-times"></i></button>
                    </div>
                    <div className="text-sm text-gray-600 space-y-4 overflow-y-auto pr-2" dangerouslySetInnerHTML={{ __html: content }}></div>
                    <div className="mt-6 pt-4 border-t border-gray-100 text-right">
                        <button onClick={onClose} className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors">Close</button>
                    </div>
                </div>
            </div>
        );

        const EmptyState = ({ icon, title, description, actionLabel, onAction, colorClass = "text-blue-600", bgClass = "bg-blue-50" }) => (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center auth-fade-in bg-white rounded-2xl border border-gray-100 shadow-sm font-sans">
                <div className={`w-20 h-20 ${bgClass} ${colorClass} rounded-full flex items-center justify-center mb-6 text-3xl shadow-inner`}><i className={`fas ${icon}`}></i></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 max-w-xs mb-8 leading-relaxed text-sm">{description}</p>
                {onAction && <button onClick={onAction} className={`${String(colorClass||'').startsWith('theme-') ? 'theme-accent-btn' : (colorClass.replace('text','bg') + ' text-white')} px-8 py-3 rounded-xl font-bold shadow-lg transform transition-all hover:scale-105 active:scale-95`}>{actionLabel}</button>}
            </div>
        );

        const OnboardingTour = ({ onComplete, stateDB }) => {
            const [step, setStep] = useState(1);
            const [data, setData] = useState({
                roleDesc: 'Mobile Notary',
                name: '',
                state: 'CA',
                apiKey: ''
            });

            const handleNext = () => setStep(s => Math.min(s + 1, 4));
            const handleBack = () => setStep(s => Math.max(s - 1, 1));
            
            const handleFinish = (skipApiKey = false) => {
                const finalData = { ...data };
                if (skipApiKey) finalData.apiKey = '';
                onComplete(finalData);
            };

            const stepsContent = [
                { id: 1, title: 'Welcome' },
                { id: 2, title: 'Identity' },
                { id: 3, title: 'Features' },
                { id: 4, title: 'AI Setup' }
            ];

            return (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col min-h-[500px] auth-fade-in font-sans border border-slate-200/50">
                        {/* Header / Progress */}
                        <div className="px-8 pt-8 pb-4 flex flex-col items-center">
                            <div className="flex gap-2 mb-6">
                                {stepsContent.map((s) => (
                                    <div key={s.id} className={`h-1.5 rounded-full transition-all duration-300 ${step >= s.id ? 'w-8 bg-blue-600' : 'w-4 bg-slate-200'}`}></div>
                                ))}
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 px-4 sm:px-8 overflow-y-auto">
                            {step === 1 && (
                                <div className="auth-fade-in space-y-6">
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner text-3xl">
                                            <i className="fas fa-rocket"></i>
                                        </div>
                                        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">Welcome to NotaryOS.</h2>
                                        <p className="text-slate-500 text-base sm:text-lg">Let's set up your command center. How do you primarily work?</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                                        {['Mobile Notary', 'Loan Signing Agent', 'Signing Agency'].map(role => (
                                            <button 
                                                key={role}
                                                onClick={() => setData({...data, roleDesc: role})}
                                                className={`p-5 rounded-2xl border-2 text-left transition-all group ${data.roleDesc === role ? 'border-blue-600 bg-blue-50/50 shadow-md shadow-blue-500/10' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                                            >
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 transition-colors ${data.roleDesc === role ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                                    <i className={`fas ${role === 'Mobile Notary' ? 'fa-car' : role === 'Loan Signing Agent' ? 'fa-home' : 'fa-building'}`}></i>
                                                </div>
                                                <h4 className="font-bold text-slate-900 mb-1">{role}</h4>
                                                <p className="text-xs text-slate-500">
                                                    {role === 'Mobile Notary' && 'I travel to clients for general notary work.'}
                                                    {role === 'Loan Signing Agent' && 'I specialize in real estate closings.'}
                                                    {role === 'Signing Agency' && 'I manage a team of notaries.'}
                                                </p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="auth-fade-in space-y-6 max-w-md mx-auto">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Business Identity</h2>
                                        <p className="text-slate-500">Personalize your dashboard and set up state compliance.</p>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                                            <input 
                                                type="text" 
                                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-900"
                                                placeholder="Your legal commissioned name"
                                                value={data.name}
                                                onChange={e => setData({...data, name: e.target.value})}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Commissioned State</label>
                                            <select 
                                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-900 bg-white"
                                                value={data.state}
                                                onChange={e => setData({...data, state: e.target.value})}
                                            >
                                                {Object.keys(stateDB).filter(k => k !== 'certificates').map(k => (
                                                    <option key={k} value={k}>{stateDB[k].state}</option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-slate-500 mt-2"><i className="fas fa-info-circle text-blue-500 mr-1"></i> Critical for AI Coach accuracy and fee limits.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="auth-fade-in space-y-6">
                                    <div className="text-center mb-8">
                                        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Your New Superpowers</h2>
                                        <p className="text-slate-500">What you can do with NotaryOS:</p>
                                    </div>
                                    <div className="space-y-4 max-w-lg mx-auto">
                                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">🪄</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg mb-1">Smart Fill</h4>
                                                <p className="text-sm text-slate-600">Turn messy emails and texts into booked appointments instantly using AI extraction.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">⚖️</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg mb-1">AI Compliance Coach</h4>
                                                <p className="text-sm text-slate-600">Get instant, reliable answers to state-specific questions without flipping through handbooks.</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                                            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-xl shrink-0 group-hover:scale-110 transition-transform">📊</div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-lg mb-1">Automated Dashboard</h4>
                                                <p className="text-sm text-slate-600">Track revenue, manage client portals, and monitor credential expirations effortlessly.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="auth-fade-in space-y-6 max-w-md mx-auto text-center">
                                    <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner text-4xl">
                                        <i className="fas fa-robot"></i>
                                    </div>
                                    <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Activate Your AI Assistant</h2>
                                    <p className="text-slate-500 mb-8 text-sm sm:text-base">
                                        Unlock Smart Fill and the Compliance Coach by entering your secure Gemini API key. Your key stays locally on your device.
                                    </p>
                                    <div className="text-left space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Gemini API Key</label>
                                            <input 
                                                type="password" 
                                                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none text-slate-900 font-mono tracking-widest placeholder-slate-400 placeholder-tracking-normal"
                                                placeholder="AIzaSy..."
                                                value={data.apiKey}
                                                onChange={e => setData({...data, apiKey: e.target.value})}
                                            />
                                            <p className="text-xs text-slate-500 mt-2 flex justify-between">
                                                <span><i className="fas fa-lock text-slate-400 mr-1"></i> Stored securely on device</span>
                                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Get a free key</a>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer / Actions */}
                        <div className="px-4 sm:px-8 py-6 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 mt-4 rounded-b-3xl">
                            {step > 1 ? (
                                <button onClick={handleBack} className="px-4 sm:px-6 py-3 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">
                                    Back
                                </button>
                            ) : <div></div>}
                            
                            {step < 4 ? (
                                <button 
                                    onClick={handleNext} 
                                    disabled={step === 2 && !data.name.trim()}
                                    className="px-6 sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 ml-auto"
                                >
                                    Continue
                                </button>
                            ) : (
                                <div className="flex items-center gap-3 sm:gap-4 ml-auto">
                                    <button onClick={() => handleFinish(true)} className="text-sm font-bold text-slate-500 hover:text-slate-700">
                                        Skip for now
                                    </button>
                                    <button 
                                        onClick={() => handleFinish()} 
                                        className="px-6 sm:px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all transform active:scale-95"
                                    >
                                        Finish Setup
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const WelcomeTour = ({ onComplete }) => {
            const [step, setStep] = useState(1);
            const totalSteps = 5;

            const steps = [
                { id: 1, icon: 'fa-rocket', color: 'text-blue-600', bg: 'bg-blue-50', title: 'Welcome to NotaryOS', desc: 'Your all-in-one operating system for running a modern notary business.' },
                { id: 2, icon: 'fa-chart-pie', color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'Business Dashboard', desc: 'Track your monthly income, upcoming jobs, and get alerts for expiring credentials.' },
                { id: 3, icon: 'fa-calendar-check', color: 'text-purple-600', bg: 'bg-purple-50', title: 'Schedule & Journal', desc: 'Manage appointments with Calendar view and log every signing for state compliance.' },
                { id: 4, icon: 'fa-robot', color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'AI Training Center', desc: 'Get instant answers to state laws and practice difficult scenarios with your AI Coach.' },
                { id: 5, icon: 'fa-cog', color: 'text-slate-600', bg: 'bg-slate-50', title: 'You\'re All Set', desc: 'Customize your profile, set up your branding, and start accepting appointments!' }
            ];

            const current = steps[step - 1];

            return (
                <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center relative overflow-hidden font-sans">
                        <div className="absolute top-0 left-0 h-1 bg-gray-100 w-full">
                            <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
                        </div>
                        <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl mb-6 shadow-sm ${current.bg} ${current.color} transition-colors duration-300`}>
                            <i className={`fas ${current.icon}`}></i>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-3 transition-opacity duration-300">{current.title}</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed h-16">{current.desc}</p>
                        <div className="flex items-center gap-3">
                            {step > 1 && (
                                <button onClick={() => setStep(s => s - 1)} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50">Back</button>
                            )}
                            <button onClick={() => step < totalSteps ? setStep(s => s + 1) : onComplete()} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all">
                                {step < totalSteps ? 'Next Step' : 'Get Started'}
                            </button>
                        </div>
                        <button onClick={onComplete} className="mt-6 text-xs text-gray-400 font-semibold uppercase tracking-wide hover:text-gray-600">Skip Tour</button>
                    </div>
                </div>
            );
        };

        const LandingPage = ({ onNavigate }) => {
            const [activeTab, setActiveTab] = useState('before');
            const [weeklyAppts, setWeeklyAppts] = useState(5);
            const [adminMins, setAdminMins] = useState(20);
            const [billing, setBilling] = useState('monthly');
            const [demoQuestion, setDemoQuestion] = useState("");
            const [demoResponse, setDemoResponse] = useState(null);
            const [openFaqIndex, setOpenFaqIndex] = useState(0);
            const [infoContent, setInfoContent] = useState(null);

            const faqItems = [
                {
                    question: "Does NotaryOS support state-specific journal and compliance requirements?",
                    answer: "Yes. NotaryOS is designed as a guided workflow to help you capture the details typically required in notary journals (signer identity evidence, timestamp, document type, and audit notes). Because laws vary by state and can change, we pair in-app guidance with your final review so you can confidently stay aligned with your current handbook and commission rules."
                },
                {
                    question: "Is my client data secure?",
                    answer: "Security is built in at multiple layers: encrypted transport (HTTPS), authenticated access controls, and scoped data access by account. Sensitive signing details are displayed in role-appropriate views and your records stay tied to your account. We also emphasize least-privilege access patterns in the product architecture."
                },
                {
                    question: "How does the Gemini API key work inside NotaryOS?",
                    answer: "Your Gemini API key enables AI-powered compliance and workflow assistance. You provide your own key, which means usage and billing remain under your control. NotaryOS uses the key only to process the AI requests you initiate (for example, compliance Q&A or drafting help) and does not change your key ownership."
                },
                {
                    question: "What is the difference between Local Storage and Cloud Sync?",
                    answer: "Local Storage keeps data on your current device/browser only—great for quick starts but vulnerable if the device is lost, reset, or switched. Cloud Sync stores records to your secure account so you can continue work across phone and desktop, recover history, and keep your team aligned in real time."
                },
                {
                    question: "Can I start on mobile and finish work later on desktop?",
                    answer: "Absolutely. The product is built around real field operations: start the appointment in the car or at the table, capture signer details and evidence on mobile, then complete invoicing, follow-ups, and reporting on desktop without losing context."
                },
                {
                    question: "Will this reduce support and setup confusion for my team?",
                    answer: "Yes. The FAQ, guided onboarding, and explicit in-app explanations (especially around AI key setup and sync behavior) are meant to reduce ambiguity before users even contact support. That translates into faster activation and fewer repetitive troubleshooting requests."
                }
            ];
            
            const hoursSaved = Math.round((weeklyAppts * adminMins * 52) / 60);
            const dollarsSaved = (hoursSaved * 50).toLocaleString();

            const handleDemoAsk = (e) => {
                e.preventDefault();
                setDemoResponse("loading");
                setTimeout(() => {
                    setDemoResponse("In California, the maximum fee for a jurat is $15 per signature, including the oath or affirmation. Always check the latest handbook!");
                }, 1500);
            };

            return (
                <div className="min-h-screen landing-bg text-white font-inter flex flex-col relative overflow-x-hidden">
                    {infoContent && <InfoModal title={infoContent.title} content={infoContent.content} onClose={() => setInfoContent(null)} />}
                    <div className="w-full p-6 flex justify-between items-center z-20 container mx-auto">
                        <div className="flex items-center gap-2">
                            <i className="fas fa-file-signature text-xl text-teal-400"></i>
                            <h1 className="text-xl font-bold tracking-tight font-sans">NotaryOS</h1>
                        </div>
                        <button onClick={onNavigate} className="text-gray-300 hover:text-white font-medium text-sm transition-colors border border-gray-600 hover:border-gray-400 px-4 py-2 rounded-lg font-sans">Log In</button>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center text-center px-6 relative z-10 py-20">
                        <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight tracking-tight max-w-5xl drop-shadow-2xl font-sans">
                            Drowning in paperwork? <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500">Chasing payments?</span>
                        </h1>
                        <p className="text-lg text-slate-300 mb-10 max-w-2xl leading-relaxed">
                            Stop worrying about state compliance. NotaryOS handles it all—so you can focus on signings, not spreadsheets.
                        </p>
                        <button onClick={onNavigate} className="bg-teal-500 hover:bg-teal-600 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-xl shadow-teal-500/20 transition-all transform hover:-translate-y-1 font-sans">
                            Start Free Trial
                        </button>
                    </div>

                    {/* Trust & Security Banner */}
                    <div className="w-full px-6 pb-8">
                        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-3 bg-slate-900/70 border border-slate-700 rounded-2xl p-4 md:p-5 font-sans">
                            <div className="flex items-center gap-3 text-slate-200"><i className="fas fa-lock text-teal-400"></i><span className="font-semibold">100% Local Privacy</span></div>
                            <div className="flex items-center gap-3 text-slate-200"><i className="fas fa-brain text-indigo-400"></i><span className="font-semibold">Powered by Advanced AI</span></div>
                            <div className="flex items-center gap-3 text-slate-200"><i className="fas fa-shield-alt text-emerald-400"></i><span className="font-semibold">50-State Compliant</span></div>
                        </div>
                    </div>

                    {/* RESTORED AI Hero Feature Section */}
                    <div className="w-full bg-slate-900/50 border-y border-slate-800 py-20 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>
                        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center relative z-10">
                            <div className="text-left">
                                <div className="inline-block bg-teal-900/30 text-teal-300 px-3 py-1 rounded-full text-xs font-bold mb-4 border border-teal-500/30 font-sans">
                                    NEW: AI COMPLIANCE COACH
                                </div>
                                <h2 className="text-3xl md:text-4xl font-bold mb-4 leading-tight font-sans">
                                    Your personal compliance expert, <span className="text-teal-400">available 24/7.</span>
                                </h2>
                                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                    Not just software—it's a mentor. Get instant answers to state-specific questions, fee limits, and ID rules without searching through a 100-page handbook.
                                </p>
                                <form onSubmit={handleDemoAsk} className="relative font-sans">
                                    <input
                                        type="text"
                                        placeholder="e.g. What's the fee for a jurat in California?"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-6 text-white focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all shadow-lg"
                                        value={demoQuestion}
                                        onChange={(e) => setDemoQuestion(e.target.value)}
                                    />
                                    <button type="submit" className="absolute right-2 top-2 bg-teal-500 hover:bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                                        Ask AI
                                    </button>
                                </form>
                            </div>

                            <div className="ai-glow-box bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 shadow-2xl relative">
                                <div className="flex items-center gap-3 mb-6 border-b border-slate-700 pb-4">
                                    <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white"><i className="fas fa-robot"></i></div>
                                    <div>
                                        <h4 className="font-bold text-white font-sans">NotaryOS AI</h4>
                                        <div className="flex items-center gap-1.5 font-sans">
                                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                            <span className="text-xs text-slate-400">Online Now</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 font-sans">
                                    <div className="flex justify-end">
                                        <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-none text-sm max-w-[80%] shadow-md">
                                            What's the fee for a jurat in California?
                                        </div>
                                    </div>

                                    {(demoResponse || true) && (
                                        <div className="flex justify-start">
                                             <div className="bg-slate-700 text-slate-200 px-4 py-3 rounded-2xl rounded-tl-none text-sm max-w-[90%] shadow-md border border-slate-600">
                                                {demoResponse === "loading" ? (
                                                    <div className="flex gap-1.5 py-1">
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                                                        <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                                                    </div>
                                                ) : (
                                                    demoResponse || "That depends on your state laws. For California, the maximum fee for a jurat is $15 per signature, including the oath or affirmation."
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pain vs Power Section - Alternating Background: Dark Slate 800 */}
                    <div className="bg-slate-800 py-20 border-t border-slate-700 font-sans">
                        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                            <div className="space-y-6">
                                <h3 className="text-3xl font-bold text-white">Before & After</h3>
                                <div className="flex bg-slate-900/50 p-1 rounded-xl mb-6 w-fit border border-slate-700">
                                    <button onClick={() => setActiveTab('before')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'before' ? 'bg-red-500/20 text-red-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>The Old Way</button>
                                    <button onClick={() => setActiveTab('after')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'after' ? 'bg-teal-500/20 text-teal-400 shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>With NotaryOS</button>
                                </div>

                                {activeTab === 'before' ? (
                                    <div className="space-y-4 auth-fade-in">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-red-900/10 border border-red-900/30">
                                            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 shrink-0"><i className="fas fa-file-invoice-dollar"></i></div>
                                            <div><h4 className="font-bold text-red-200">Lost Invoices</h4><p className="text-sm text-slate-400">Tracking payments in Excel or paper logs leads to missed revenue.</p></div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-red-900/10 border border-red-900/30">
                                            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 shrink-0"><i className="fas fa-exclamation-triangle"></i></div>
                                            <div><h4 className="font-bold text-red-200">Compliance Risks</h4><p className="text-sm text-slate-400">Guessing fees or ID rules can cost you your commission.</p></div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-red-900/10 border border-red-900/30">
                                            <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center text-red-400 shrink-0"><i className="fas fa-clock"></i></div>
                                            <div><h4 className="font-bold text-red-200">Admin Overload</h4><p className="text-sm text-slate-400">Spending hours manually entering journal data after every signing.</p></div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 auth-fade-in">
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-900/10 border border-teal-900/30">
                                            <div className="w-10 h-10 rounded-full bg-teal-900/30 flex items-center justify-center text-teal-400 shrink-0"><i className="fas fa-magic"></i></div>
                                            <div><h4 className="font-bold text-teal-200">One-Click Invoicing</h4><p className="text-sm text-slate-400">Generate professional PDF invoices instantly from your appointment data.</p></div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-900/10 border border-teal-900/30">
                                            <div className="w-10 h-10 rounded-full bg-teal-900/30 flex items-center justify-center text-teal-400 shrink-0"><i className="fas fa-robot"></i></div>
                                            <div><h4 className="font-bold text-teal-200">AI Coach</h4><p className="text-sm text-slate-400">Your personal compliance coach answers state law questions 24/7.</p></div>
                                        </div>
                                        <div className="flex items-start gap-4 p-4 rounded-xl bg-teal-900/10 border border-teal-900/30">
                                            <div className="w-10 h-10 rounded-full bg-teal-900/30 flex items-center justify-center text-teal-400 shrink-0"><i className="fas fa-cloud-upload-alt"></i></div>
                                            <div><h4 className="font-bold text-teal-200">Cloud Sync</h4><p className="text-sm text-slate-400">Start on your phone at the signing table, finish on your laptop at home.</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl">
                                <h4 className="text-xl font-bold text-white mb-6 text-center">Calculate Your Lost Time</h4>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Weekly Appointments</label>
                                            <span className="text-teal-400 font-bold">{weeklyAppts}</span>
                                        </div>
                                        <input type="range" min="1" max="50" value={weeklyAppts} onChange={e=>setWeeklyAppts(e.target.value)} className="w-full accent-teal-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-xs font-bold text-slate-400 uppercase">Admin Mins per Appt</label>
                                            <span className="text-teal-400 font-bold">{adminMins} min</span>
                                        </div>
                                        <input type="range" min="5" max="60" value={adminMins} onChange={e=>setAdminMins(e.target.value)} className="w-full accent-teal-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
                                    </div>
                                    <div className="pt-6 border-t border-slate-700 mt-4 text-center">
                                        <p className="text-sm text-slate-400">You could save</p>
                                        <div className="text-4xl font-extrabold text-white mb-2">{hoursSaved} Hours<span className="text-lg text-slate-500 font-normal">/yr</span></div>
                                        <div className="inline-block bg-teal-900/30 text-teal-400 px-3 py-1 rounded-full text-xs font-bold border border-teal-500/30">
                                            That's ${dollarsSaved} in billable time!
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Mobile-First Demo Section - Alternating Background: Dark Slate 900 */}
                    <div className="py-24 bg-slate-900 w-full border-t border-slate-800 font-sans">
                        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-[1.2fr_1fr] gap-16 items-center">
                            <div className="order-2 lg:order-1">
                                <div className="phone-stack">
                                    <div className="phone-mockup phone-stack-card left w-[285px] h-[575px] md:w-[300px] md:h-[600px] bg-white border-8 border-gray-900 rounded-[3rem] shadow-2xl overflow-hidden">
                                        <div className="phone-notch"></div>
                                        <div className="h-full bg-gray-50 pt-10 px-4">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-bold text-lg text-gray-800">Today's Route</h3>
                                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-xs font-bold">JD</div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-xs font-bold text-blue-500 bg-blue-50 px-2 py-1 rounded">LOAN SIGNING</span>
                                                        <span className="text-xs text-gray-400">2:00 PM</span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-800">Sarah Johnson</h4>
                                                    <p className="text-xs text-gray-500 mt-1"><i className="fas fa-map-marker-alt text-red-400 mr-1"></i> 123 Maple Dr, Seattle</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                    <div className="flex justify-between mb-2">
                                                        <span className="text-xs font-bold text-purple-500 bg-purple-50 px-2 py-1 rounded">DEED</span>
                                                        <span className="text-xs text-gray-400">4:30 PM</span>
                                                    </div>
                                                    <h4 className="font-bold text-gray-800">Mike Chen</h4>
                                                    <p className="text-xs text-gray-500 mt-1"><i className="fas fa-map-marker-alt text-gray-300 mr-1"></i> Starbucks, 4th Ave</p>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Coverage</p>
                                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                                                        <span><i className="fas fa-signal text-emerald-500 mr-1"></i> Data: Unlimited</span>
                                                        <span><i className="fas fa-phone text-blue-500 mr-1"></i> Calls: Unlimited</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="phone-mockup phone-stack-card right w-[285px] h-[575px] md:w-[300px] md:h-[600px] bg-white border-8 border-gray-900 rounded-[3rem] shadow-2xl overflow-hidden">
                                        <div className="phone-notch"></div>
                                        <div className="h-full bg-gray-50 pt-10 px-4">
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="font-bold text-lg text-gray-800">Payments</h3>
                                                <button className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">Send Invoice</button>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                                                    <p className="text-xs text-gray-500">April Revenue</p>
                                                    <p className="text-2xl font-bold text-gray-800 mt-1">$3,420</p>
                                                    <div className="text-[11px] text-emerald-600 mt-1 font-semibold"><i className="fas fa-arrow-up"></i> 18% vs last month</div>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between border-l-4 border-l-emerald-500">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">Invoice #2948</p>
                                                        <p className="text-[11px] text-gray-500">Paid by Sarah Johnson</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-full">Paid</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">Invoice #2951</p>
                                                        <p className="text-[11px] text-gray-500">Pending • Mike Chen</p>
                                                    </div>
                                                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">Pending</span>
                                                </div>
                                                <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                                                    <p className="text-[10px] uppercase font-bold text-slate-400">Inbox</p>
                                                    <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                                                        <span><i className="fas fa-envelope text-indigo-500 mr-1"></i> Client follow-up</span>
                                                        <span className="text-indigo-600 font-semibold">New</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="order-1 lg:order-2">
                                <h3 className="text-3xl font-bold text-white mb-6">Run your business from your pocket.</h3>
                                <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                                    From booking to signature capture to final payout, NotaryOS mirrors how real mobile appointments happen. Start with your daily schedule, complete ID/journal checks at the table, then send and track payment before you drive to the next stop.
                                </p>
                                <ul className="space-y-4">
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs"><i className="fas fa-mobile-alt"></i></div>
                                        1) Confirm today's route and appointment details
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs"><i className="fas fa-map-marker-alt"></i></div>
                                        2) Capture signer details and journal proof on site
                                    </li>
                                    <li className="flex items-center gap-3 text-slate-300">
                                        <div className="w-6 h-6 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs"><i className="fas fa-bell"></i></div>
                                        3) Send invoice and track paid/pending status instantly
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* How NotaryOS Works Section */}
                    <div className="bg-slate-900/80 py-24 w-full border-t border-slate-800 font-sans">
                        <div className="max-w-6xl mx-auto px-6">
                            <div className="text-center mb-16">
                                <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">How NotaryOS works</h3>
                                <p className="text-slate-400 text-lg max-w-3xl mx-auto">
                                    A streamlined workflow from booking to payout—designed for mobile-first notaries.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Step 1: Book the Job */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="mb-4">
                                        <span className="text-teal-400 text-sm font-bold tracking-wide">STEP 1</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                                            <i className="fas fa-check-square text-xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Book the Job</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Capture client info quickly with Smart Fill and appointment templates.
                                    </p>
                                </div>

                                {/* Step 2: Do the Signing */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="mb-4">
                                        <span className="text-blue-400 text-sm font-bold tracking-wide">STEP 2</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                            <i className="fas fa-mobile-alt text-xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Do the Signing</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Use Mobile Journal flow for ID capture, proof, and compliant on-site execution.
                                    </p>
                                </div>

                                {/* Step 3: Get Paid */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="mb-4">
                                        <span className="text-emerald-400 text-sm font-bold tracking-wide">STEP 3</span>
                                    </div>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                                            <i className="fas fa-dollar-sign text-xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Get Paid</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Auto-generate invoices, track payment status, and close the loop instantly.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Built for Every Modern Notary Business Model Section */}
                    <div className="bg-slate-950/80 py-24 w-full border-t border-slate-800 font-sans">
                        <div className="max-w-6xl mx-auto px-6">
                            <div className="text-center mb-16">
                                <h3 className="text-4xl md:text-5xl font-bold text-white mb-4">Built for every modern notary business model</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Mobile Notaries */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                                            <i className="fas fa-car text-2xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Mobile Notaries</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Run route-based signings, capture compliant entries on-site, and complete admin later from desktop.
                                    </p>
                                </div>

                                {/* Loan Signing Agents */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                                            <i className="fas fa-home text-2xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Loan Signing Agents</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Manage high-volume closings with reliable documentation, invoicing, and audit-ready workflows.
                                    </p>
                                </div>

                                {/* Signing Agencies */}
                                <div className="visual-card rounded-2xl p-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                                            <i className="fas fa-users text-2xl"></i>
                                        </div>
                                        <h4 className="text-xl font-bold text-white">Signing Agencies</h4>
                                    </div>
                                    <p className="text-slate-300 leading-relaxed">
                                        Coordinate team dispatch, centralize records, and scale with standardized processes.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* FAQ Section - Trust, Security & Clarity */}
                    <div className="bg-slate-900/80 py-24 w-full border-t border-slate-800 font-sans">
                        <div className="max-w-5xl mx-auto px-6">
                            <div className="text-center mb-12">
                                <div className="inline-flex items-center gap-2 bg-slate-900/80 border border-slate-700 text-teal-300 px-4 py-2 rounded-full text-xs font-bold tracking-wide">
                                    <i className="fas fa-shield-alt"></i>
                                    TRUST & COMPLIANCE FAQ
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold text-white mt-5 mb-4">Questions every serious notary asks first.</h3>
                                <p className="text-slate-400 max-w-3xl mx-auto">
                                    Built for risk-aware professionals: get clear answers on compliance workflows, data security, AI key usage, and local vs cloud storage without cluttering the interface.
                                </p>
                            </div>

                            <div className="space-y-4">
                                {faqItems.map((item, index) => {
                                    const isOpen = openFaqIndex === index;
                                    return (
                                        <div key={item.question} className="bg-slate-900/70 border border-slate-700 rounded-2xl overflow-hidden shadow-lg shadow-black/20">
                                            <button
                                                type="button"
                                                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 hover:bg-slate-800/60 transition-colors"
                                                onClick={() => setOpenFaqIndex(isOpen ? -1 : index)}
                                                aria-expanded={isOpen}
                                            >
                                                <span className="text-white font-semibold leading-snug">{item.question}</span>
                                                <span className={`text-teal-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
                                                    <i className="fas fa-chevron-down"></i>
                                                </span>
                                            </button>
                                            {isOpen && (
                                                <div className="px-6 pb-6 text-slate-300 leading-relaxed border-t border-slate-800">
                                                    <p className="pt-4">{item.answer}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Pricing Section - Alternating Background: Dark Slate 800 */}
                    <div className="bg-slate-800 py-24 w-full border-t border-slate-700 font-sans">
                        <div className="max-w-6xl mx-auto px-6">
                            <div className="text-center mb-10">
                                <h3 className="text-3xl font-bold text-white mb-4">Simple, Transparent Pricing</h3>
                                <p className="text-slate-400 mb-8">Everything you need to grow your business.</p>

                                <div className="max-w-3xl mx-auto mb-8 bg-slate-900/70 border border-slate-700 rounded-xl px-5 py-4 text-left flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-slate-400 text-sm font-semibold">Current plan</p>
                                        <p className="text-slate-200">You are currently on the <span className="font-bold text-white">Starter Plan</span>.</p>
                                    </div>
                                    <button type="button" onClick={onNavigate} className="shrink-0 px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:text-white hover:border-slate-400 transition-colors text-sm">
                                        Manage
                                    </button>
                                </div>

                                {/* Billing Toggle */}
                                <div className="inline-flex bg-slate-900 p-1 rounded-xl border border-slate-700 relative">
                                    <button onClick={() => setBilling('monthly')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${billing === 'monthly' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Monthly</button>
                                    <button onClick={() => setBilling('yearly')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${billing === 'yearly' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-white'}`}>Yearly</button>
                                    {billing === 'yearly' && <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">SAVE 20%</span>}
                                </div>
                            </div>
                            <div className="grid md:grid-cols-3 gap-8 items-center">
                                {/* Free Plan */}
                                <div className="visual-card p-8 rounded-2xl flex flex-col bg-slate-900/50 border border-slate-700 h-fit">
                                    <h4 className="text-xl font-bold text-white mb-2">Starter</h4>
                                    <p className="text-xs text-slate-400 mb-4">For the side-hustle notary.</p>
                                    <div className="text-4xl font-bold text-white mb-6">$0<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                                    <ul className="space-y-3 mb-8 text-slate-300 text-sm flex-1">
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> 5 Appointments/mo</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> Basic Journal</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> Local Storage Only</li>
                                    </ul>
                                    <button onClick={onNavigate} className="w-full py-3 rounded-xl border border-slate-600 text-white hover:bg-slate-700 transition-colors">Get Started</button>
                                </div>

                                {/* Pro Plan */}
                                <div className="visual-card p-8 rounded-2xl flex flex-col relative border-teal-500 bg-slate-900 shadow-2xl shadow-teal-900/20 transform scale-105 z-10">
                                    <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">MOST POPULAR</div>
                                    <h4 className="text-xl font-bold text-white mb-2">Pro</h4>
                                    <p className="text-xs text-slate-400 mb-4">For the full-time professional.</p>
                                    <div className="text-4xl font-bold text-white mb-6">${billing === 'monthly' ? '19' : '15'}<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                                    <ul className="space-y-3 mb-8 text-slate-300 text-sm flex-1">
                                        <li className="flex gap-2"><i className="fas fa-check text-teal-400"></i> Unlimited Appointments</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-teal-400"></i> Cloud Sync & Backups</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-teal-400"></i> AI Compliance Coach</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-teal-400"></i> GPS Mileage</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-teal-400"></i> Basic Signer Portal</li>
                                    </ul>
                                    <button onClick={onNavigate} className="w-full py-3 rounded-xl bg-teal-500 text-white hover:bg-teal-600 transition-colors font-bold shadow-lg shadow-teal-500/20">Start 14-Day Trial</button>
                                </div>

                                {/* Enterprise */}
                                <div className="visual-card p-8 rounded-2xl flex flex-col bg-slate-900/50 border border-slate-700 h-fit">
                                    <h4 className="text-xl font-bold text-white mb-2">Agency</h4>
                                    <p className="text-xs text-slate-400 mb-4">For scaling your signing service.</p>
                                    <div className="text-4xl font-bold text-white mb-6">${billing === 'monthly' ? '49' : '39'}<span className="text-sm text-slate-400 font-normal">/mo</span></div>
                                    <ul className="space-y-3 mb-8 text-slate-300 text-sm flex-1">
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> Multi-Notary Dispatch</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> Stripe Integration</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> QuickBooks Sync</li>
                                        <li className="flex gap-2"><i className="fas fa-check text-green-400"></i> White-labeled Portal</li>
                                    </ul>
                                    <button className="w-full py-3 rounded-xl border border-slate-600 text-white hover:bg-slate-700 transition-colors">Contact Sales</button>
                                </div>
                            </div>

                            <div className="mt-14 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-900/50">
                                <table className="min-w-full text-sm text-left text-slate-300">
                                    <thead className="bg-slate-900/90 text-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold">Compare plans</th>
                                            <th className="px-4 py-3 font-semibold">Starter</th>
                                            <th className="px-4 py-3 font-semibold">Pro</th>
                                            <th className="px-4 py-3 font-semibold">Agency</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">Appointments per month</td>
                                            <td className="px-4 py-3">5</td>
                                            <td className="px-4 py-3">Unlimited</td>
                                            <td className="px-4 py-3">Unlimited + team routing</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">Journal workflows</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-emerald-400 mr-2"></i>Basic</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-emerald-400 mr-2"></i>Advanced + templates</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-emerald-400 mr-2"></i>Team oversight</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">Storage & sync</td>
                                            <td className="px-4 py-3">Local only</td>
                                            <td className="px-4 py-3">Cloud sync + backups</td>
                                            <td className="px-4 py-3">Cloud sync + multi-user</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">AI compliance coach</td>
                                            <td className="px-4 py-3 text-slate-500">—</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-teal-400 mr-2"></i>Included</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-teal-400 mr-2"></i>Included</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">API access</td>
                                            <td className="px-4 py-3 text-slate-500">—</td>
                                            <td className="px-4 py-3 text-slate-500">—</td>
                                            <td className="px-4 py-3"><i className="fas fa-check text-teal-400 mr-2"></i>Included</td>
                                        </tr>
                                        <tr>
                                            <td className="px-4 py-3 text-slate-400">Best for</td>
                                            <td className="px-4 py-3">Getting started</td>
                                            <td className="px-4 py-3">Full-time solo notary</td>
                                            <td className="px-4 py-3">Growing signing teams</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <footer className="bg-slate-950 border-t border-slate-800 pt-16 pb-8 w-full font-sans relative z-10">
                        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
                            <div className="col-span-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <i className="fas fa-file-signature text-xl text-teal-400"></i>
                                    <span className="text-xl font-bold tracking-tight text-white">NotaryOS</span>
                                </div>
                                <p className="text-slate-400 text-sm mb-6 leading-relaxed pr-4 max-w-sm">
                                    The complete operating system for modern mobile notaries and signing agents. Focus on your signings, we handle the compliance.
                                </p>
                                <div className="flex gap-4">
                                    <button type="button" className="text-slate-400 hover:text-teal-400 transition-colors text-lg" aria-label="Twitter"><i className="fab fa-twitter"></i></button>
                                    <button type="button" className="text-slate-400 hover:text-teal-400 transition-colors text-lg" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></button>
                                    <button type="button" className="text-slate-400 hover:text-teal-400 transition-colors text-lg" aria-label="Facebook"><i className="fab fa-facebook"></i></button>
                                    <button type="button" className="text-slate-400 hover:text-teal-400 transition-colors text-lg" aria-label="Instagram"><i className="fab fa-instagram"></i></button>
                                </div>
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-4">Product</h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li><button type="button" onClick={onNavigate} className="hover:text-teal-400 transition-colors">Features</button></li>
                                    <li><button type="button" onClick={onNavigate} className="hover:text-teal-400 transition-colors">Pricing</button></li>
                                    <li><button type="button" onClick={onNavigate} className="hover:text-teal-400 transition-colors">AI Mentor</button></li>
                                    <li><button type="button" onClick={onNavigate} className="hover:text-teal-400 transition-colors">Client Portal</button></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-4">Support</h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.help)} className="hover:text-teal-400 transition-colors">Help Center</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.handbooks)} className="hover:text-teal-400 transition-colors">State Handbooks</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.community)} className="hover:text-teal-400 transition-colors">Community</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.contact)} className="hover:text-teal-400 transition-colors">Contact Us</button></li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="text-white font-bold mb-4">Legal</h4>
                                <ul className="space-y-3 text-sm text-slate-400">
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.privacy)} className="hover:text-teal-400 transition-colors">Privacy Policy</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.terms)} className="hover:text-teal-400 transition-colors">Terms of Service</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.security)} className="hover:text-teal-400 transition-colors">Data Security</button></li>
                                    <li><button type="button" onClick={() => setInfoContent(FOOTER_CONTENT.compliance)} className="hover:text-teal-400 transition-colors">Compliance</button></li>
                                </ul>
                            </div>
                        </div>
                        <div className="max-w-6xl mx-auto px-6 border-t border-slate-800 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                            <p>&copy; {new Date().getFullYear()} NotaryOS Inc. All rights reserved.</p>
                            <p>Designed with <i className="fas fa-heart text-red-500/70 mx-1"></i> for Notaries Public.</p>
                        </div>
                    </footer>
                </div>
            );
        };


const TrialExpiredScreen = ({ trialEndsAt, onUpgrade, onOpenBillingPortal, onLogout }) => {
    const endDate = trialEndsAt ? new Date(trialEndsAt).toLocaleDateString() : '—';
    return (
        <div className="min-h-screen flex items-center justify-center p-6 theme-app-bg">
            <div className="max-w-xl w-full rounded-2xl border theme-border bg-white shadow-xl p-6">
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(79,70,229,.12)" }}>
                        <i className="fas fa-lock theme-text" style={{ color: "var(--accent-color)" }}></i>
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-extrabold theme-text">Your free trial has ended</h2>
                        <p className="mt-1 theme-text-muted">
                            Trial end date: <span className="font-semibold theme-text">{endDate}</span>
                        </p>
                        <p className="mt-3 theme-text-muted">
                            To keep using NotaryOS, upgrade to a paid plan. You can also manage/cancel your subscription in the billing portal.
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-col gap-2">
                    <button onClick={() => onUpgrade('pro')} className="theme-accent-btn px-4 py-3 rounded-xl font-semibold">
                        Upgrade to Pro
                    </button>
                    <button onClick={() => onUpgrade('team')} className="px-4 py-3 rounded-xl border theme-border theme-text font-semibold">
                        Upgrade to Team
                    </button>
                    <button
                        onClick={() => onOpenBillingPortal && onOpenBillingPortal()}
                        className="px-4 py-3 rounded-xl border theme-border theme-text"
                        title="Cancel, update card, invoices"
                    >
                        Manage Billing
                    </button>
                    <button onClick={onLogout} className="px-4 py-3 rounded-xl theme-text-muted hover:underline">
                        Log out
                    </button>
                </div>

                <div className="mt-4 text-xs theme-text-muted">
                    Demo note: this build can optionally unlock after Stripe redirects back with <span className="font-semibold">?paid=1&amp;plan=pro</span> (or <span className="font-semibold">team</span>) in the URL.
                </div>
            </div>
        </div>
    );
};


        const AuthScreen = ({ onAuth, onBack }) => {
            const [isLogin, setIsLogin] = useState(true);
            const [formData, setFormData] = useState({ name: '', email: '', password: '' });
            const [showTermsModal, setShowTermsModal] = useState(false);
            const [error, setError] = useState('');
            const [isLoading, setIsLoading] = useState(false);
            const [showPassword, setShowPassword] = useState(false);
            const [agreedToTerms, setAgreedToTerms] = useState(false);

            const handleAuth = async (e) => {
                e.preventDefault();
                setError('');

                if (!isLogin && !agreedToTerms) {
                    setError('You must agree to the Terms of Service and Privacy Policy to continue.');
                    return;
                }

                setIsLoading(true);

                // Simulate network request for enterprise UI feel
                setTimeout(() => {
                    setIsLoading(false);
                    onAuth({ id: '1', name: isLogin ? 'User' : formData.name, email: formData.email, plan: 'free', role: 'solo' });
                }, 800);
            };

            const handleGoogleAuth = async () => {
                setError('');
                setIsLoading(true);
                try {
                    if (!window.firebase || !firebase.auth) {
                        throw new Error('Google sign-in is not configured on this device.');
                    }
                    const provider = new firebase.auth.GoogleAuthProvider();
                    const result = await firebase.auth().signInWithPopup(provider);
                    const fbUser = result?.user || firebase.auth().currentUser;
                    if (!fbUser) {
                        throw new Error('Google sign-in did not return a user profile. Please try again.');
                    }
                    onAuth({
                        id: fbUser.uid || 'google-user',
                        name: fbUser.displayName || 'User',
                        email: fbUser.email || formData.email || '',
                        plan: 'free',
                        role: 'solo'
                    });
                } catch (err) {
                    setError(err?.message || 'Google sign-in failed. Please try again.');
                } finally {
                    setIsLoading(false);
                }
            };

            return (
                <div className="min-h-screen flex bg-white font-sans">
                    {showTermsModal && <TermsModal onClose={() => setShowTermsModal(false)} onAccept={() => { setShowTermsModal(false); setAgreedToTerms(true); }} />}

                    {/* Left Panel - Branding & Trust (Hidden on Mobile) */}
                    <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative overflow-hidden flex-col justify-between p-12 text-white">
                        {/* Animated Background Elements */}
                        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/30 rounded-full blur-[100px] animate-pulse"></div>
                        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

                        {/* Top Section */}
                        <div className="relative z-10">
                            <button onClick={onBack} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium mb-12 transition-colors w-fit">
                                <i className="fas fa-arrow-left"></i> Back to Home
                            </button>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/30">
                                    <i className="fas fa-file-signature"></i>
                                </div>
                                <h1 className="text-2xl font-bold tracking-tight">NotaryOS</h1>
                            </div>
                            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight max-w-lg">
                                The Operating System for Modern Notaries.
                            </h2>
                            <ul className="space-y-4 text-slate-300 text-lg">
                                <li className="flex items-center gap-3"><i className="fas fa-check-circle text-blue-400"></i> Seamless Invoicing & Payments</li>
                                <li className="flex items-center gap-3"><i className="fas fa-check-circle text-blue-400"></i> Smart 50-State Journal</li>
                                <li className="flex items-center gap-3"><i className="fas fa-check-circle text-blue-400"></i> AI Compliance Coach</li>
                            </ul>
                        </div>

                        {/* Bottom Section: Testimonial & Badges */}
                        <div className="relative z-10 space-y-8">
                            {/* Testimonial Card (Glassmorphism) */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-2xl max-w-md shadow-2xl">
                                <div className="flex gap-1 text-amber-400 mb-3 text-sm">
                                    <i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i><i className="fas fa-star"></i>
                                </div>
                                <p className="text-slate-200 text-sm leading-relaxed mb-4">
                                    "NotaryOS saves my signing agency 15 hours a week. The automated invoicing and compliant digital journal completely changed how we operate."
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-sm">SJ</div>
                                    <div>
                                        <p className="font-bold text-sm text-white">Sarah Jenkins</p>
                                        <p className="text-xs text-slate-400">Owner, Jenkins Mobile Notary</p>
                                    </div>
                                </div>
                            </div>

                            {/* Security Badges */}
                            <div className="flex items-center gap-6 text-slate-400 text-sm font-medium">
                                <div className="flex items-center gap-2"><i className="fas fa-lock text-slate-500"></i> 256-bit Encryption</div>
                                <div className="flex items-center gap-2"><i className="fas fa-shield-alt text-slate-500"></i> SOC2 Compliant</div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Form (Full width on mobile) */}
                    <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-white">
                        {/* Mobile Back Button & Logo (Visible only on mobile) */}
                        <div className="lg:hidden absolute top-6 left-6 right-6 flex justify-between items-center">
                            <button onClick={onBack} className="text-slate-500 hover:text-slate-800 flex items-center gap-2 text-sm font-medium">
                                <i className="fas fa-arrow-left"></i> Back
                            </button>
                            <div className="flex items-center gap-2 text-slate-900 font-bold">
                                <i className="fas fa-file-signature text-blue-600"></i> NotaryOS
                            </div>
                        </div>

                        <div className="w-full max-w-[400px] auth-fade-in mt-12 lg:mt-0">
                            <div className="mb-8 text-center lg:text-left">
                                <h2 className="text-3xl font-extrabold text-slate-900 mb-2">
                                    {isLogin ? 'Welcome back' : 'Create an account'}
                                </h2>
                                <p className="text-slate-500">
                                    {isLogin ? 'Enter your details to access your dashboard.' : 'Get started free. No credit card required.'}
                                </p>
                            </div>

                            {/* Error State UI */}
                            {error && (
                                <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-600 p-4 rounded-xl flex items-start gap-3 text-sm auth-fade-in">
                                    <i className="fas fa-exclamation-triangle mt-0.5"></i>
                                    <span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleAuth} className="space-y-5">
                                {!isLogin && (
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                            value={formData.name}
                                            onChange={e => setFormData({...formData, name: e.target.value})}
                                            placeholder="Jane Doe"
                                            disabled={isLoading}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-900 placeholder-slate-400"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                        placeholder="name@example.com"
                                        disabled={isLoading}
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between items-center mb-1.5">
                                        <label className="block text-sm font-medium text-slate-700">Password</label>
                                        {isLogin && (
                                            <a href="#" onClick={(e) => { e.preventDefault(); showToast("Password reset link sent!", "success"); }} className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline">
                                                Forgot password?
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none text-slate-900 placeholder-slate-400 pr-12"
                                            value={formData.password}
                                            onChange={e => setFormData({...formData, password: e.target.value})}
                                            placeholder="••••••••"
                                            disabled={isLoading}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                            tabIndex="-1"
                                        >
                                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                        </button>
                                    </div>
                                </div>

                                {!isLogin && (
                                    <div className="flex items-start gap-3 mt-4">
                                        <div className="flex items-center h-5">
                                            <input
                                                id="terms"
                                                type="checkbox"
                                                checked={agreedToTerms}
                                                onChange={(e) => setAgreedToTerms(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                                disabled={isLoading}
                                            />
                                        </div>
                                        <label htmlFor="terms" className="text-sm text-slate-600">
                                            I agree to the <button type="button" onClick={() => setShowTermsModal(true)} className="font-medium text-blue-600 hover:underline">Terms of Service</button> and <button type="button" onClick={() => setShowTermsModal(true)} className="font-medium text-blue-600 hover:underline">Privacy Policy</button>.
                                        </label>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex justify-center items-center h-[52px] mt-2"
                                >
                                    {isLoading ? (
                                        <i className="fas fa-spinner fa-spin text-xl"></i>
                                    ) : (
                                        isLogin ? 'Sign In' : 'Create Account'
                                    )}
                                </button>
                                
                                {!isLogin && (
                                    <p className="text-xs text-slate-500 text-center mt-3 leading-relaxed">
                                        By signing up, you agree to our{' '}
                                        <button type="button" onClick={() => setShowTermsModal(true)} className="font-medium text-slate-700 hover:text-blue-600 hover:underline">
                                            Terms of Service
                                        </button>
                                        {' '}and{' '}
                                        <button type="button" onClick={() => setShowTermsModal(true)} className="font-medium text-slate-700 hover:text-blue-600 hover:underline">
                                            Privacy Policy
                                        </button>.
                                    </p>
                                )}
                            </form>

                            <div className="relative flex items-center py-6">
                                <div className="flex-grow border-t border-slate-200"></div>
                                <span className="shrink-0 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">OR</span>
                                <div className="flex-grow border-t border-slate-200"></div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    type="button"
                                    onClick={handleGoogleAuth}
                                    disabled={isLoading}
                                    className="w-full bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex justify-center items-center gap-3 h-[52px] disabled:opacity-70"
                                >
                                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        <path fill="none" d="M1 1h22v22H1z" />
                                    </svg>
                                    Continue with Google
                                </button>
                                <button
                                    type="button"
                                    disabled={isLoading}
                                    className="w-full bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-all flex justify-center items-center gap-3 h-[52px] disabled:opacity-70"
                                    onClick={(e) => { e.preventDefault(); showToast("Apple/Microsoft auth coming soon!", "success"); }}
                                >
                                    <i className="fab fa-apple text-xl mb-1"></i>
                                    Continue with Apple
                                </button>
                            </div>

                            <div className="mt-8 text-center text-sm text-slate-600">
                                {isLogin ? "Don't have an account?" : "Already have an account?"}
                                <button
                                    onClick={() => { setIsLogin(!isLogin); setError(''); setFormData({name: '', email: '', password: ''}); setAgreedToTerms(false); }}
                                    className="font-semibold text-blue-600 hover:text-blue-700 hover:underline ml-1.5"
                                    disabled={isLoading}
                                >
                                    {isLogin ? 'Sign up' : 'Log in'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const Sidebar = ({ currentView, setView, isOpen, onClose, onLogout, userName, userPlan, userRole, onSettings, onUpgrade, onLockedFeature }) => {
            const [isCollapsed, setIsCollapsed] = useState(false);
            const menuItems = [
                { id: 'dashboard', icon: 'fa-chart-pie', label: 'Dashboard', color: 'text-blue-400' },
                { id: 'schedule', icon: 'fa-calendar-alt', label: 'Schedule', color: 'text-green-400' },
                { id: 'clients', icon: 'fa-address-book', label: 'Clients', color: 'text-pink-400' },
                { id: 'portal', icon: 'fa-door-open', label: 'Signer Portal', color: 'text-cyan-400', access: 'pro', badge: 'PRO' },
                { id: 'journal', icon: 'fa-book', label: 'Journal', color: 'text-purple-400' },
                { id: 'finances', icon: 'fa-wallet', label: 'Finances', color: 'text-emerald-400' },
                { id: 'credentials', icon: 'fa-id-card', label: 'Credentials', color: 'text-orange-400' },
                { id: 'agency', icon: 'fa-building', label: 'Team Dispatch', color: 'text-sky-400', access: 'agency', badge: 'AGENCY' },
                { id: 'trainer', icon: 'fa-robot', label: 'AI Trainer', color: 'text-indigo-400', access: 'pro', badge: 'PRO' },
                { id: 'admin', icon: 'fa-shield-alt', label: 'Admin', color: 'text-red-500' }
            ];

            return (
                <>
                    <div className={`fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden ${isOpen ? 'block' : 'hidden'}`} onClick={onClose}></div>
                    <div className={`sidebar-shell fixed inset-y-0 left-0 pb-safe px-safe overflow-y-auto bg-slate-950 text-white z-50 transform transition-all duration-300 ease-in-out lg:static lg:flex lg:flex-col border-r border-slate-800/60 ${isOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-72'} lg:translate-x-0 shadow-2xl lg:shadow-none`}>
                        <div className="px-6 py-5 flex justify-between items-center border-b border-slate-800/60 h-18">
                            {!isCollapsed && (
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                        <span className="text-white font-bold text-sm">N</span>
                                    </div>
                                    <span className="font-semibold text-lg tracking-tight text-white">NotaryOS</span>
                                </div>
                            )}
                            <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:block text-slate-400 hover:text-slate-200 transition-colors p-1.5 hover:bg-slate-800/50 rounded-lg"><i className={`fas ${isCollapsed ? 'fa-chevron-right' : 'fa-chevron-left'} text-sm`}></i></button>
                            <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-200 transition-colors p-1.5"><i className="fas fa-times"></i></button>
                        </div>
                        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                            {menuItems.map(item => {
                                const locked = !!item.access && !hasFeatureAccess({ plan: userPlan, role: userRole }, item.access);
                                return (
                                    <button key={item.id} onClick={() => { if (locked) { onLockedFeature(item.id); onClose(); } else { setView(item.id); onClose(); } }} className={`sidebar-item group w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg transition-all duration-200 relative ${currentView === item.id ? 'sidebar-item--active bg-slate-800/80 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'} ${isCollapsed ? 'justify-center' : ''}`} title={locked ? `${item.label} (Upgrade required)` : item.label}>
                                            {currentView === item.id && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-indigo-500 rounded-r-full"></div>}
                                            <i className={`fas ${item.icon} text-base ${currentView === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} transition-colors`}></i>
                                            {!isCollapsed && <span className="text-sm font-medium tracking-wide">{item.label}</span>}
                                            {!isCollapsed && item.badge && (
                                                <span className={`ml-auto text-[9px] px-2 py-0.5 rounded-md font-semibold ${item.badge === 'AGENCY' ? 'bg-slate-700/80 text-slate-200' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>{item.badge}</span>
                                            )}
                                            {!isCollapsed && locked && <i className="fas fa-lock text-[10px] text-amber-400 ml-1"></i>}
                                    </button>
                                );
                            })}
                        </nav>
                        <div className="p-4 border-t border-slate-800/60 space-y-3">
                            {!isCollapsed && userPlan === 'free' && (
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-500/20 rounded-xl p-4 mb-3">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                                            <i className="fas fa-crown text-white text-sm"></i>
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-white mb-0.5">Upgrade to Pro</p>
                                            <p className="text-xs text-slate-400 leading-relaxed">Unlock premium features and workflows</p>
                                        </div>
                                    </div>
                                    <button onClick={() => onUpgrade('pro')} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold py-2.5 rounded-lg shadow-lg shadow-indigo-900/30 transition-all duration-200 hover:shadow-xl">Upgrade Now</button>
                                </div>
                            )}
                             <button onClick={onSettings} className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-slate-800/60 rounded-lg transition-all duration-200 group ${isCollapsed ? 'justify-center' : ''}`}>
                                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-semibold text-indigo-300 flex-shrink-0 border border-slate-700/50">{userName ? userName.substring(0,2).toUpperCase() : 'US'}</div>
                                {!isCollapsed && (
                                    <div className="flex-1 overflow-hidden text-left">
                                        <p className="text-sm font-medium truncate text-slate-200 group-hover:text-white transition-colors">{userName || 'User'}</p>
                                        <p className="text-xs text-slate-500 capitalize">{userPlan} Plan</p>
                                    </div>
                                )}
                                {!isCollapsed && <i className="fas fa-cog text-slate-500 group-hover:text-slate-300 transition-colors text-sm"></i>}
                            </button>
                             <button onClick={onLogout} className={`w-full flex items-center gap-3 px-3 py-2.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/40 rounded-lg transition-all duration-200 text-sm font-medium ${isCollapsed ? 'justify-center' : ''}`}><i className="fas fa-sign-out-alt"></i> {!isCollapsed && "Logout"}</button>
                        </div>
                    </div>
                </>
            );
        };

        const MobileNav = ({ setView, onOpenMenu, user, onLockedFeature }) => {
            const trainerLocked = !hasFeatureAccess(user, 'pro');
            return (
                <div className="md:hidden fixed bottom-0 w-full bg-white/70 border-t border-slate-200/70 p-2 flex justify-around z-30 safe-area-pb shadow-sm backdrop-blur">
                    <button onClick={() => setView('dashboard')}><i className="fas fa-home text-slate-400 text-lg"></i></button>
                    <button onClick={() => setView('schedule')}><i className="fas fa-calendar-alt text-slate-400 text-lg"></i></button>
                    <button onClick={() => setView('Add Appointment')} className="-mt-8 bg-blue-600 text-white rounded-full p-4 shadow-xl border-4 border-white active:scale-95 transition-transform"><i className="fas fa-plus text-2xl"></i></button>
                    <button onClick={() => trainerLocked ? onLockedFeature('trainer') : setView('trainer')} className="relative">
                        <i className="fas fa-robot text-slate-400 text-lg"></i>
                        <span className="absolute -top-2 -right-4 text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold">PRO</span>
                    </button>
                    <button onClick={onOpenMenu}><i className="fas fa-bars text-slate-400 text-lg"></i></button>
                </div>
            );
        };

        const PaywallState = ({ featureKey = 'pro', onUpgrade }) => {
            const copy = {
                portal: {
                    title: 'Unlock the Signer Portal',
                    tier: 'PRO',
                    desc: 'Give clients a polished signing experience with secure document access, status visibility, and less back-and-forth.'
                },
                trainer: {
                    title: 'Unlock AI Trainer',
                    tier: 'PRO',
                    desc: 'Access premium compliance simulations and adaptive coaching to improve confidence before every appointment.'
                },
                agency: {
                    title: 'Unlock Team Dispatch',
                    tier: 'AGENCY',
                    desc: 'Coordinate multi-notary operations with dispatch controls, team routing, and centralized oversight.'
                },
                pro: {
                    title: 'Upgrade to Pro',
                    tier: 'PRO',
                    desc: 'Get advanced workflows, cloud sync, and AI-assisted compliance for serious notary growth.'
                }
            };
            const item = copy[featureKey] || copy.pro;
            return (
                <div className="p-6 md:p-10">
                    <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-xl p-8 md:p-10 text-center">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold mb-4 ${item.tier === 'AGENCY' ? 'bg-slate-800 text-white' : 'bg-amber-100 text-amber-800'}`}>{item.tier} FEATURE</span>
                        <h3 className="text-3xl font-bold text-slate-900 mb-4">{item.title}</h3>
                        <p className="text-slate-600 mb-8">{item.desc}</p>
                        <div className="grid sm:grid-cols-3 gap-3 text-left mb-8">
                            <div className="bg-slate-50 rounded-xl p-3 text-sm"><i className="fas fa-check text-emerald-500 mr-2"></i>Premium workflows</div>
                            <div className="bg-slate-50 rounded-xl p-3 text-sm"><i className="fas fa-check text-emerald-500 mr-2"></i>Secure cloud sync</div>
                            <div className="bg-slate-50 rounded-xl p-3 text-sm"><i className="fas fa-check text-emerald-500 mr-2"></i>Priority support</div>
                        </div>
                        <button onClick={() => onUpgrade('pro')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-7 py-3 rounded-xl shadow-lg">Upgrade for $19/mo</button>
                    </div>
                </div>
            );
        };

        const Header = ({ title, onNotify, onSyncNow }) => {
            const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
            useEffect(() => {
                const onOnline = () => setIsOnline(true);
                const onOffline = () => setIsOnline(false);
                window.addEventListener('online', onOnline);
                window.addEventListener('offline', onOffline);
                return () => {
                    window.removeEventListener('online', onOnline);
                    window.removeEventListener('offline', onOffline);
                };
            }, []);
            return (
                <div className="theme-surface theme-border border-b p-4 flex justify-between items-center z-20">
                    <h2 className="font-bold theme-text text-lg">{title}</h2>
                    <div className="flex gap-2 items-center">
                        <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full theme-pill border"><i className="fas fa-shield-alt"></i> Trusted Workflow</span>
                        <button onClick={onSyncNow} className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${isOnline ? 'theme-pill' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                            <i className={`fas ${isOnline ? 'fa-cloud' : 'fa-cloud-slash'}`}></i>
                            {isOnline ? 'Sync Online' : 'Offline Mode'}
                        </button>
                        <button onClick={onNotify} className="theme-text-muted hover:opacity-80"><i className="fas fa-bell"></i></button>
                    </div>
                </div>
            );
        };

        // --- CORE MODULES ---

        // CLIENTS MODULE
        const Clients = () => {
            const [clients, setClients] = useState([]);
            const [showForm, setShowForm] = useState(false);
            const [editingClient, setEditingClient] = useState(null);
            const [search, setSearch] = useState('');

            useEffect(() => { DataManager.get('notary_clients').then(setClients); }, []);

            const handleSave = async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await DataManager.save('notary_clients', {
                    id: editingClient?.id || Date.now().toString(),
                    name: fd.get('name'),
                    phone: fd.get('phone'),
                    email: fd.get('email'),
                    address: fd.get('address'),
                    notes: fd.get('notes')
                });
                setShowForm(false);
                setEditingClient(null);
                setClients(await DataManager.get('notary_clients'));
                showToast(editingClient ? "Client Updated" : "Client Saved");
            };

            const handleDelete = async (id) => {
                await DataManager.delete('notary_clients', id);
                setClients(await DataManager.get('notary_clients'));
                showToast("Client Deleted", 'error');
            };

            const filteredClients = clients.filter(c => (c.name || '').toLowerCase().includes(search.toLowerCase()));

            // STATUS: Calculate key metrics
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            const totalClients = clients.length;
            const avgRevenue = totalClients > 0 ? Math.round(clients.reduce((sum, c) => sum + Math.max(150, ((c.name || '').length * 37) + 200), 0) / totalClients) : 0;

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    {/* STATUS SECTION */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                                <i className="fas fa-users text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold theme-text">Client Directory</h3>
                                <p className="text-xs theme-text-muted">Your lightweight CRM for repeat business</p>
                            </div>
                        </div>
                        <button onClick={() => { setEditingClient(null); setShowForm(true); }} className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                            <i className="fas fa-plus mr-2"></i>Add Client
                        </button>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Total Clients</p>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <i className="fas fa-user-friends text-blue-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{totalClients}</p>
                            <p className="text-xs theme-text-muted mt-1">In your directory</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Avg Revenue</p>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <i className="fas fa-dollar-sign text-emerald-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">${avgRevenue}</p>
                            <p className="text-xs theme-text-muted mt-1">Per client lifetime</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Active</p>
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <i className="fas fa-star text-amber-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">{Math.max(1, Math.floor(totalClients * 0.6))}</p>
                            <p className="text-xs theme-text-muted mt-1">This month</p>
                        </div>
                    </div>

                    {/* CONTEXT SECTION */}
                    <div className="relative flex-1 max-w-md mb-4">
                        <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted text-sm"></i>
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search clients by name..."
                            className="w-full pl-10 pr-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text text-sm"
                        />
                    </div>

                    {/* ACTION SECTION */}
                    {filteredClients.length === 0 ? (
                        <div className="theme-surface theme-border border rounded-2xl p-10 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
                                <i className="fas fa-users theme-text-muted text-2xl"></i>
                            </div>
                            <h4 className="theme-text text-lg font-semibold mb-2">No clients found</h4>
                            <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">Build your CRM by adding client profiles. Track contact info, history, and revenue all in one place.</p>
                            <button onClick={() => setShowForm(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
                                <i className="fas fa-plus mr-2"></i>Add Client
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredClients.map(c => {
                                const initials = (c.name || 'NA').split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase();
                                const totalRevenue = Math.max(150, ((c.name || '').length * 37) + 200);
                                return (
                                    <div key={c.id} className="theme-surface theme-border border rounded-2xl p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md overflow-hidden">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex items-center gap-3">
                                                <div className="w-11 h-11 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold flex-shrink-0">{initials}</div>
                                                <div className="min-w-0">
                                                    <p className="font-bold theme-text truncate">{c.name || 'Unnamed Client'}</p>
                                                    <p className="text-xs theme-text-muted truncate">Client Profile</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 flex-shrink-0">
                                                <button onClick={() => { setEditingClient(c); setShowForm(true); }} className="w-8 h-8 rounded-lg border theme-border theme-text-muted hover:theme-text transition-all"><i className="fas fa-ellipsis"></i></button>
                                                <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg border theme-border text-red-500 hover:bg-red-500/10 transition-all"><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>

                                        <div className="mt-4 space-y-2 text-sm">
                                            <p className="theme-text-muted truncate"><i className="fas fa-phone mr-2"></i>{c.phone || 'No phone'}</p>
                                            <p className="theme-text-muted truncate"><i className="fas fa-envelope mr-2"></i>{c.email || 'No email'}</p>
                                            <p className="theme-text-muted truncate"><i className="fas fa-map-marker-alt mr-2"></i>{c.address || 'No address on file'}</p>
                                        </div>

                                        <div className="mt-4 pt-4 border-t theme-border text-sm">
                                            <p className="theme-text"><span className="theme-text-muted">Total Revenue:</span> <span className="font-semibold">${totalRevenue}</span></p>
                                            <p className="theme-text-muted mt-1">Last Appointment: Oct 12</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showForm && (
                        <div className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <form onSubmit={handleSave} className="w-full max-w-xl theme-surface rounded-2xl shadow-2xl border theme-border p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xl font-bold theme-text">{editingClient ? 'Edit Client' : 'Add Client'}</h4>
                                    <button type="button" onClick={() => { setShowForm(false); setEditingClient(null); }} className="theme-text-muted"><i className="fas fa-times"></i></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="name" defaultValue={editingClient?.name || ''} placeholder="Full Name" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" required />
                                    <input name="phone" defaultValue={editingClient?.phone || ''} placeholder="Phone" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="email" defaultValue={editingClient?.email || ''} placeholder="Email" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2" />
                                    <input name="address" defaultValue={editingClient?.address || ''} placeholder="Address" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2" defaultValue={editingClient ? (editingClient.address || '') : ''} />
                                    <textarea name="notes" defaultValue={editingClient?.notes || ''} placeholder="Notes" rows={3} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2">{editingClient ? (editingClient.notes || "") : ""}</textarea>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setShowForm(false); setEditingClient(null); }} className="px-4 py-2 rounded-lg border theme-border theme-text">Cancel</button>
                                    <button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">{editingClient ? 'Save Changes' : 'Create Client'}</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            );
        };

        // Feature #1: Income Chart
        const IncomeChart = ({ appointments }) => {
            const canvasRef = useRef(null);

            useEffect(() => {
                if (!canvasRef.current) return;
                const ctx = canvasRef.current.getContext('2d');

                const monthlyData = {};
                const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                monthOrder.forEach(m => monthlyData[m] = 0);

                (appointments || []).forEach(a => {
                    if (a.status !== 'Paid') return;
                    const date = new Date(a.date);
                    if (isNaN(date.getTime())) return;
                    const m = date.toLocaleString('default', { month: 'short' });
                    if (monthlyData[m] !== undefined) monthlyData[m] += parseFloat(a.fee || 0);
                });

                const chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: monthOrder,
                        datasets: [{
                            label: 'Revenue',
                            data: Object.values(monthlyData),
                            borderColor: '#4f46e5',
                            backgroundColor: 'rgba(79, 70, 229, 0.10)',
                            pointRadius: 0,
                            pointHoverRadius: 3,
                            borderWidth: 3.5,
                            fill: true,
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { intersect: false, mode: 'index' } },
                        scales: {
                            y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.18)', drawBorder: false }, ticks: { color: '#64748b' } },
                            x: { grid: { display: false, drawBorder: false }, ticks: { color: '#64748b' } }
                        }
                    }
                });

                return () => chart.destroy();
            }, [appointments]);

            return <div className="h-64 w-full"><canvas ref={canvasRef}></canvas></div>;
        };

                const Dashboard = ({ appointments, credentials, setView, user, onOpenSettings }) => {
            const now = new Date();
            const hour = now.getHours();
            const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
            const dateLabel = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
            const today = now.toISOString().split('T')[0];

            const safeAppointments = Array.isArray(appointments) ? appointments : [];
            const safeCredentials = Array.isArray(credentials) ? credentials : [];

            const paidAppointments = safeAppointments.filter(a => a.status === 'Paid');
            const ytdRevenue = paidAppointments.reduce((sum, a) => sum + parseFloat(a.fee || 0), 0);

            const scheduled = safeAppointments.filter(a => a.status === 'Scheduled');
            const nextScheduled = [...scheduled]
                .map(a => ({ ...a, dt: new Date(`${a.date || ''}T${a.time || '00:00'}`) }))
                .filter(a => !isNaN(a.dt.getTime()) && a.dt >= now)
                .sort((a, b) => a.dt - b.dt)[0] || null;

            const expiringCreds = safeCredentials
                .map(c => ({ ...c, expDate: new Date(c.expiry) }))
                .filter(c => !isNaN(c.expDate.getTime()))
                .map(c => ({ ...c, daysLeft: Math.ceil((c.expDate - now) / (1000 * 60 * 60 * 24)) }))
                .filter(c => c.daysLeft <= 60);

            const urgentCred = expiringCreds.sort((a, b) => a.daysLeft - b.daysLeft)[0] || null;
            const complianceState = urgentCred ? (urgentCred.daysLeft <= 30 ? 'critical' : 'warning') : 'clear';

            const todaysJobs = safeAppointments.filter(a => a.date === today);
            const unpaidInvoices = safeAppointments.filter(a => a.status === 'Completed').length;

            const recentActivity = [...safeAppointments]
                .map(a => ({ ...a, dt: new Date(`${a.date || ''}T${a.time || '00:00'}`) }))
                .sort((a, b) => b.dt - a.dt)
                .slice(0, 5);

            const statusPill = (status) => {
                if (status === 'Paid') return 'bg-emerald-100 text-emerald-700';
                if (status === 'Completed') return 'bg-blue-100 text-blue-700';
                if (status === 'Cancelled') return 'bg-red-100 text-red-700';
                return 'bg-amber-100 text-amber-700';
            };

            const quickActions = [
                { label: 'New Appointment', icon: 'fa-calendar-plus', gradient: 'from-blue-500 to-indigo-500', onClick: () => setView('Add Appointment') },
                { label: 'Log Journal Entry', icon: 'fa-pen-to-square', gradient: 'from-purple-500 to-violet-500', onClick: () => setView('journal') },
                { label: 'Add Expense', icon: 'fa-receipt', gradient: 'from-emerald-500 to-teal-500', onClick: () => setView('finances') },
                { label: 'Ask AI Coach', icon: 'fa-robot', gradient: 'from-amber-500 to-orange-500', onClick: () => setView('trainer') }
            ];

            const dailyBrief = {
                jobsToday: todaysJobs.length,
                potentialRevenue: todaysJobs.reduce((sum, a) => sum + parseFloat(a.fee || 0), 0),
                openRisks: (urgentCred ? 1 : 0) + (unpaidInvoices > 0 ? 1 : 0)
            };

            const appointmentsNeedingFollowup = safeAppointments.filter(a => a.status === 'Completed' && !a.followupDone).length;
            const missingClientInfo = safeAppointments.filter(a => !a.phone || !a.email).length;
            
            const actionItems = [
                {
                    key: 'credentials',
                    priority: urgentCred ? (urgentCred.daysLeft <= 30 ? 100 : urgentCred.daysLeft <= 45 ? 85 : 70) : 20,
                    onClick: () => setView('credentials'),
                    icon: urgentCred ? 'fas fa-triangle-exclamation' : 'fas fa-shield-check',
                    iconClass: urgentCred ? (urgentCred.daysLeft <= 30 ? 'text-red-600' : urgentCred.daysLeft <= 45 ? 'text-orange-600' : 'text-amber-600') : 'text-emerald-600',
                    iconBg: urgentCred ? (urgentCred.daysLeft <= 30 ? 'bg-red-50' : urgentCred.daysLeft <= 45 ? 'bg-orange-50' : 'bg-amber-50') : 'bg-emerald-50',
                    title: urgentCred ? `${urgentCred.name || 'Credential'} expires in ${urgentCred.daysLeft} days` : 'All credentials valid',
                    subtitle: urgentCred ? 'Renew now to avoid service disruption' : 'Compliance status healthy',
                    badge: urgentCred ? (urgentCred.daysLeft <= 30 ? 'URGENT' : urgentCred.daysLeft <= 45 ? 'SOON' : 'WARNING') : null
                },
                {
                    key: 'finances',
                    priority: unpaidInvoices > 0 ? 90 : 30,
                    onClick: () => setView('finances'),
                    icon: unpaidInvoices > 0 ? 'fas fa-file-invoice-dollar' : 'fas fa-check-circle',
                    iconClass: unpaidInvoices > 0 ? 'text-red-600' : 'text-emerald-600',
                    iconBg: unpaidInvoices > 0 ? 'bg-red-50' : 'bg-emerald-50',
                    title: unpaidInvoices > 0 ? `${unpaidInvoices} invoice${unpaidInvoices === 1 ? '' : 's'} unpaid` : 'All invoices paid',
                    subtitle: unpaidInvoices > 0 ? 'Follow up on outstanding payments' : 'Revenue collection on track',
                    badge: unpaidInvoices > 0 ? 'ACTION NEEDED' : null
                },
                {
                    key: 'followup',
                    priority: appointmentsNeedingFollowup > 0 ? 60 : 10,
                    onClick: () => setView('schedule'),
                    icon: appointmentsNeedingFollowup > 0 ? 'fas fa-user-clock' : 'fas fa-check-double',
                    iconClass: appointmentsNeedingFollowup > 0 ? 'text-amber-600' : 'text-slate-400',
                    iconBg: appointmentsNeedingFollowup > 0 ? 'bg-amber-50' : 'bg-slate-50',
                    title: appointmentsNeedingFollowup > 0 ? `${appointmentsNeedingFollowup} client${appointmentsNeedingFollowup === 1 ? '' : 's'} need follow-up` : 'All follow-ups complete',
                    subtitle: appointmentsNeedingFollowup > 0 ? 'Send thank you or request review' : 'Client relations current',
                    badge: appointmentsNeedingFollowup > 0 ? 'FOLLOW-UP' : null
                },
                {
                    key: 'clientinfo',
                    priority: missingClientInfo > 0 ? 50 : 10,
                    onClick: () => setView('schedule'),
                    icon: missingClientInfo > 0 ? 'fas fa-address-card' : 'fas fa-users',
                    iconClass: missingClientInfo > 0 ? 'text-blue-600' : 'text-slate-400',
                    iconBg: missingClientInfo > 0 ? 'bg-blue-50' : 'bg-slate-50',
                    title: missingClientInfo > 0 ? `${missingClientInfo} appointment${missingClientInfo === 1 ? '' : 's'} missing contact info` : 'All client records complete',
                    subtitle: missingClientInfo > 0 ? 'Complete records for better service' : 'Client database up to date',
                    badge: missingClientInfo > 0 ? 'INCOMPLETE' : null
                }
            ].sort((a, b) => b.priority - a.priority).filter(item => item.priority >= 40 || item.badge !== null);

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-6 font-sans dash-bg-mesh">

                    {/* === GREETING HEADER === */}
                    <div className="anim-fade-up anim-delay-1 overflow-hidden">
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div>
                                <h2 className="text-3xl sm:text-4xl font-extrabold theme-text tracking-tight">{greeting}, <span className="gradient-text-indigo">{user?.name || 'Notary'}</span>.</h2>
                                <p className="theme-text-muted mt-1.5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                                    {dateLabel}
                                </p>
                            </div>
                            <button onClick={() => setView('Add Appointment')} className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
                                <i className="fas fa-plus"></i> New Appointment
                            </button>
                        </div>
                    </div>

                    {/* === SETUP CHECKLIST (preserved) === */}
                    <div className="anim-fade-up anim-delay-2">
                        <SetupChecklistCard user={user} appointments={appointments} setView={setView} onOpenSettings={onOpenSettings} />
                    </div>

                    {/* === PROFILE COMPLETION (preserved) === */}
                    {(() => {
                        const p = computeProfileProgress(user);
                        if (p.completed) return null;
                        return (
                            <div className="anim-fade-up anim-delay-2 glass-card rounded-2xl p-5">
                                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, flexWrap:'wrap'}}>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                                                <i className="fas fa-user-pen text-white text-sm"></i>
                                            </div>
                                            <span style={{fontWeight:900}} className="theme-text">Complete Your Profile</span>
                                        </div>
                                        <div className="theme-text-muted" style={{fontSize:13, marginTop:6}}>Add your name and phone so confirmations and exports are ready when you are.</div>
                                    </div>
                                    <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-lg shadow-amber-500/20 hover:-translate-y-0.5 transition-all duration-300" onClick={() => { if(onOpenSettings) onOpenSettings(); }}>
                                        Update Profile
                                    </button>
                                </div>
                                <div style={{marginTop:10}}>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                        Name: {p.name ? '✓' : '—'} &middot; Phone: {p.phone ? '✓' : '—'}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* === DAILY BRIEF — Hero Card === */}
                    <div className="anim-fade-scale anim-delay-3 rounded-2xl p-6 overflow-hidden gradient-mesh-indigo glass-card" style={{border: '1px solid rgba(99, 102, 241, 0.12)'}}>
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                    <i className="fas fa-bolt text-white text-lg"></i>
                                </div>
                                <div>
                                    <h3 className="text-lg font-extrabold theme-text tracking-tight">Daily Brief</h3>
                                    <p className="text-xs theme-text-muted">{dateLabel}</p>
                                </div>
                            </div>
                            <button onClick={() => setView('schedule')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-colors">
                                View Schedule <i className="fas fa-arrow-right"></i>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <button onClick={() => setView('schedule')} className="text-left p-4 rounded-xl glass-card glow-border group cursor-pointer">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="kpi-icon-ring w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                                        <i className="fas fa-briefcase text-white text-sm"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-3xl font-extrabold text-blue-600 leading-none">{dailyBrief.jobsToday}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Jobs Today</p>
                                {dailyBrief.jobsToday > 0 && nextScheduled && (
                                    <p className="text-xs theme-text-muted mt-1 truncate">
                                        <i className="fas fa-clock mr-1 text-blue-400"></i>
                                        Next: {nextScheduled.time || 'TBD'}
                                    </p>
                                )}
                            </button>

                            <button onClick={() => setView('finances')} className="text-left p-4 rounded-xl glass-card glow-border group cursor-pointer">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="kpi-icon-ring w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center shadow-md">
                                        <i className="fas fa-coins text-white text-sm"></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-3xl font-extrabold text-emerald-600 leading-none">${dailyBrief.potentialRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Potential Revenue</p>
                                <p className="text-xs theme-text-muted mt-1">
                                    <i className="fas fa-chart-line mr-1 text-emerald-400"></i>
                                    From today's jobs
                                </p>
                            </button>

                            <button onClick={() => dailyBrief.openRisks > 0 ? setView('credentials') : null} className="text-left p-4 rounded-xl glass-card glow-border group cursor-pointer">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={`kpi-icon-ring w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${dailyBrief.openRisks > 0 ? 'bg-gradient-to-br from-amber-500 to-orange-400' : 'bg-gradient-to-br from-emerald-500 to-green-400'}`}>
                                        <i className={`fas ${dailyBrief.openRisks > 0 ? 'fa-exclamation-triangle' : 'fa-shield-check'} text-white text-sm`}></i>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-3xl font-extrabold leading-none ${dailyBrief.openRisks > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{dailyBrief.openRisks}</p>
                                    </div>
                                </div>
                                <p className="text-xs font-bold theme-text-muted uppercase tracking-wider">Open Risks</p>
                                <p className="text-xs theme-text-muted mt-1">
                                    <i className={`fas ${dailyBrief.openRisks > 0 ? 'fa-bell text-amber-400' : 'fa-check text-emerald-400'} mr-1`}></i>
                                    {dailyBrief.openRisks > 0 ? 'Needs attention' : 'All clear'}
                                </p>
                            </button>
                        </div>
                    </div>

                    {/* === QUICK ACTIONS BAR === */}
                    <div className="anim-fade-up anim-delay-4 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {quickActions.map((action, i) => (
                            <button
                                key={action.label}
                                onClick={action.onClick}
                                className="action-pill flex-shrink-0 px-4 py-2.5 rounded-xl font-semibold theme-text text-sm flex items-center gap-2.5 group"
                            >
                                <span className={`w-7 h-7 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                                    <i className={`fas ${action.icon} text-white text-[11px]`}></i>
                                </span>
                                {action.label}
                            </button>
                        ))}
                    </div>

                    {/* === MAIN GRID === */}
                    <div className="dashboard-flow grid grid-cols-1 xl:grid-cols-3 gap-6">

                        {/* --- LEFT COLUMN (2/3) --- */}
                        <div className="xl:col-span-2 space-y-6">

                            {/* KPI Cards Row */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Revenue YTD */}
                                <div className="anim-fade-scale anim-delay-4 kpi-enhanced glass-card p-5 gradient-mesh-emerald">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="theme-text-muted text-[11px] font-bold uppercase tracking-widest">Revenue (YTD)</p>
                                        <div className="kpi-icon-ring bg-gradient-to-br from-emerald-500 to-teal-400 shadow-md">
                                            <i className="fas fa-dollar-sign text-white text-sm"></i>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-extrabold gradient-text-emerald truncate">${ytdRevenue.toLocaleString()}</p>
                                    <div className="mt-3 flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">
                                            <i className="fas fa-arrow-trend-up"></i> +12.5%
                                        </span>
                                        <span className="text-[11px] theme-text-muted">vs last month</span>
                                    </div>
                                </div>

                                {/* Upcoming Signings */}
                                <div className="anim-fade-scale anim-delay-5 kpi-enhanced glass-card p-5 gradient-mesh-indigo">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="theme-text-muted text-[11px] font-bold uppercase tracking-widest">Upcoming</p>
                                        <div className="kpi-icon-ring bg-gradient-to-br from-blue-500 to-indigo-500 shadow-md">
                                            <i className="fas fa-calendar-check text-white text-sm"></i>
                                        </div>
                                    </div>
                                    <p className="text-3xl font-extrabold gradient-text-indigo">{scheduled.length}</p>
                                    <p className="theme-text-muted text-xs mt-3 truncate">{nextScheduled ? `Next: ${nextScheduled.clientName || 'Client'} \u2022 ${nextScheduled.dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}` : 'No upcoming appointments'}</p>
                                </div>

                                {/* Compliance */}
                                <button onClick={() => setView('credentials')} className="anim-fade-scale anim-delay-6 kpi-enhanced glass-card p-5 text-left gradient-mesh-amber">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="theme-text-muted text-[11px] font-bold uppercase tracking-widest">Compliance</p>
                                        <div className={`kpi-icon-ring shadow-md ${complianceState === 'clear' ? 'bg-gradient-to-br from-emerald-500 to-green-400' : complianceState === 'warning' ? 'bg-gradient-to-br from-amber-500 to-orange-400' : 'bg-gradient-to-br from-red-500 to-rose-400'}`}>
                                            <i className={`fas ${complianceState === 'clear' ? 'fa-shield-check' : 'fa-triangle-exclamation'} text-white text-sm`}></i>
                                        </div>
                                    </div>
                                    <p className={`text-2xl font-extrabold truncate ${complianceState === 'clear' ? 'text-emerald-600' : complianceState === 'warning' ? 'text-amber-600' : 'text-red-600'}`}>
                                        {complianceState === 'clear' ? 'All Clear' : complianceState === 'warning' ? 'Attention' : 'Critical'}
                                    </p>
                                    <p className="theme-text-muted text-xs mt-3 truncate">
                                        {urgentCred ? `${urgentCred.name || 'Credential'} \u2022 ${urgentCred.daysLeft}d left` : 'Valid for 60+ days'}
                                    </p>
                                </button>
                            </div>

                            {/* Revenue Chart */}
                            <div className="anim-fade-up anim-delay-6 chart-glass p-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                                            <i className="fas fa-chart-area text-white text-xs"></i>
                                        </div>
                                        <h3 className="text-lg font-extrabold theme-text tracking-tight">Revenue Trend</h3>
                                    </div>
                                    <button onClick={() => setView('finances')} className="text-xs font-bold theme-text-muted hover:text-indigo-600 transition-colors">Open Finances <i className="fas fa-arrow-right ml-1"></i></button>
                                </div>
                                <IncomeChart appointments={safeAppointments} />
                            </div>

                            {/* Recent Activity */}
                            <div className="anim-fade-up anim-delay-7 glass-card rounded-2xl p-5 overflow-hidden">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                                            <i className="fas fa-clock-rotate-left text-white text-xs"></i>
                                        </div>
                                        <h3 className="text-lg font-extrabold theme-text tracking-tight">Recent Activity</h3>
                                    </div>
                                </div>
                                {recentActivity.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed theme-border p-8 text-center">
                                        <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-50 flex items-center justify-center mb-3">
                                            <i className="fas fa-inbox text-slate-300 text-xl"></i>
                                        </div>
                                        <p className="theme-text-muted text-sm font-medium">No recent activity yet. Create your first appointment to get started.</p>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto -mx-1">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="theme-text-muted text-[10px] uppercase tracking-widest font-bold border-b theme-border">
                                                    <th className="text-left py-2.5 pr-3 pl-1">Client</th>
                                                    <th className="text-left py-2.5 pr-3">Service</th>
                                                    <th className="text-left py-2.5 pr-3">Date / Time</th>
                                                    <th className="text-left py-2.5 pr-3">Fee</th>
                                                    <th className="text-left py-2.5">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {recentActivity.map((item, idx) => {
                                                    const initials = (item.clientName || 'NA').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
                                                    return (
                                                        <tr key={item.id} className={`border-b theme-border hover:bg-indigo-50/30 transition-colors ${idx === 0 ? '' : ''}`}>
                                                            <td className="py-3.5 pr-3 pl-1">
                                                                <div className="flex items-center gap-2.5 min-w-0">
                                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-blue-100 flex items-center justify-center text-xs font-bold text-indigo-600 flex-shrink-0">{initials}</div>
                                                                    <span className="theme-text font-semibold truncate max-w-[150px]">{item.clientName || 'Unknown'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3.5 pr-3 theme-text-muted truncate max-w-[130px]">{item.type || 'Notary Service'}</td>
                                                            <td className="py-3.5 pr-3 theme-text-muted truncate max-w-[160px] font-mono text-xs">{isNaN(item.dt.getTime()) ? '\u2014' : item.dt.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                                                            <td className="py-3.5 pr-3 theme-text font-bold">${parseFloat(item.fee || 0).toFixed(2)}</td>
                                                            <td className="py-3.5"><span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${statusPill(item.status)}`}>{item.status || 'Scheduled'}</span></td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* --- RIGHT COLUMN (1/3) --- */}
                        <div className="xl:col-span-1 space-y-6">

                            {/* Today's Agenda */}
                            <div className="anim-slide-right anim-delay-5 glass-card rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <i className="fas fa-calendar-day text-white text-xs"></i>
                                        </div>
                                        <h3 className="font-extrabold theme-text tracking-tight">Today</h3>
                                    </div>
                                    <button onClick={() => setView('schedule')} className="text-[11px] font-bold theme-text-muted hover:text-indigo-600 transition-colors">View all</button>
                                </div>
                                {todaysJobs.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed theme-border p-6 text-center">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center mb-3">
                                            <i className="fas fa-sun text-indigo-400 text-lg"></i>
                                        </div>
                                        <p className="font-bold theme-text text-sm mb-1">Schedule clear!</p>
                                        <p className="text-xs theme-text-muted mb-4">Great day for marketing or admin catch-up.</p>
                                        <button onClick={() => setView('Add Appointment')} className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 hover:-translate-y-0.5 transition-all duration-200">
                                            <i className="fas fa-plus mr-1.5"></i>Add Appointment
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {todaysJobs.map((job, idx) => {
                                            const done = job.status === 'Completed' || job.status === 'Paid';
                                            return (
                                                <div key={job.id} className={`relative pl-5 ${idx < todaysJobs.length - 1 ? 'pb-3' : ''}`}>
                                                    {/* Timeline line */}
                                                    {idx < todaysJobs.length - 1 && (
                                                        <div className="absolute left-[5px] top-[14px] bottom-0 w-[2px]" style={{background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(139,92,246,0.1))'}}></div>
                                                    )}
                                                    {/* Timeline dot */}
                                                    <div className={`absolute left-0 top-[6px] w-[12px] h-[12px] rounded-full border-2 ${done ? 'bg-emerald-500 border-emerald-300' : 'bg-indigo-500 border-indigo-300'}`} style={{boxShadow: done ? '0 0 8px rgba(16,185,129,0.4)' : '0 0 8px rgba(99,102,241,0.4)'}}></div>

                                                    <div className="glass-card rounded-xl p-3.5 ml-2">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div className="min-w-0">
                                                                <p className="text-[11px] font-bold theme-text-muted">{job.time || 'TBD'}</p>
                                                                <p className="font-bold theme-text truncate text-sm">{job.clientName || 'Client'}</p>
                                                                <p className="text-[11px] theme-text-muted truncate">{job.type || 'Notary Service'}</p>
                                                            </div>
                                                            <div className="flex gap-1.5 flex-shrink-0">
                                                                <button className="w-7 h-7 rounded-lg border theme-border theme-text-muted hover:text-indigo-600 hover:border-indigo-300 transition-colors"><i className="fas fa-map-marker-alt text-[10px]"></i></button>
                                                                <button onClick={() => setView('schedule')} className="w-7 h-7 rounded-lg border theme-border theme-text-muted hover:text-indigo-600 hover:border-indigo-300 transition-colors"><i className="fas fa-pen text-[10px]"></i></button>
                                                            </div>
                                                        </div>
                                                        {done && (
                                                            <div className="mt-2 flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                <span className="text-[10px] font-bold text-emerald-600">Completed</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Action Items */}
                            <div className="anim-slide-right anim-delay-7 glass-card rounded-2xl p-5">
                                <div className="flex items-center justify-between mb-5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 flex items-center justify-center">
                                            <i className="fas fa-bolt text-white text-xs"></i>
                                        </div>
                                        <h3 className="font-extrabold theme-text tracking-tight">Actions</h3>
                                    </div>
                                    <span className="text-[11px] font-bold theme-text-muted px-2 py-0.5 rounded-full bg-slate-100">{actionItems.length}</span>
                                </div>
                                {actionItems.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed theme-border p-6 text-center">
                                        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                                            <i className="fas fa-check-circle text-emerald-500 text-xl"></i>
                                        </div>
                                        <p className="font-bold theme-text text-sm">All caught up!</p>
                                        <p className="text-xs theme-text-muted mt-1">No urgent actions needed.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2.5">
                                        {actionItems.map((item, idx) => (
                                            <button key={item.key} onClick={item.onClick} className="action-item-card w-full text-left p-3.5 group">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-9 h-9 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}>
                                                        <i className={`${item.icon} ${item.iconClass} text-sm`}></i>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="text-sm font-bold theme-text truncate">{item.title}</p>
                                                        </div>
                                                        <p className="text-[11px] theme-text-muted">{item.subtitle}</p>
                                                        {item.badge && (
                                                            <span className={`mt-1.5 inline-flex px-2 py-0.5 rounded text-[9px] font-extrabold tracking-wider ${
                                                                item.badge === 'URGENT' ? 'bg-red-100 text-red-700' :
                                                                item.badge === 'ACTION NEEDED' ? 'bg-red-100 text-red-700' :
                                                                item.badge === 'SOON' ? 'bg-orange-100 text-orange-700' :
                                                                item.badge === 'WARNING' ? 'bg-amber-100 text-amber-700' :
                                                                item.badge === 'FOLLOW-UP' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>{item.badge}</span>
                                                        )}
                                                    </div>
                                                    <i className="fas fa-chevron-right text-[10px] theme-text-muted self-center flex-shrink-0 group-hover:translate-x-0.5 transition-transform"></i>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            );
        };


        const AppointmentForm = ({ onSave, onCancel, initialData }) => {
            const [formData, setFormData] = useState({ clientName: '', date: '', time: '', fee: '', status: 'Scheduled', address: '', phone: '', email: '', type: '', notes: '' });
            const [magicInput, setMagicInput] = useState('');
            useEffect(() => {
                if (initialData) setFormData({
                    clientName: initialData.clientName || '',
                    date: initialData.date || '',
                    time: initialData.time || '',
                    fee: initialData.fee || '',
                    status: initialData.status || 'Scheduled',
                    type: initialData.type || '',
                    address: initialData.address || '',
                    phone: initialData.phone || '',
                    email: initialData.email || '',
                    notes: initialData.notes || ''
                });
            }, [initialData]);

            const handleSmartFill = async () => {
                const apiKey = localStorage.getItem('gemini_api_key');

                if (apiKey) {
                    showToast("Analyzing with Gemini AI...", "success");
                    try {
                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                contents: [{
                                    role: "user",
                                    parts: [{ text: `Extract appointment details from this text into JSON {clientName, date (YYYY-MM-DD), time (HH:MM), fee (number), address, phone, email, type}: "${magicInput}". Current year is 2026.` }]
                                }]
                            })
                        });
                        const data = await response.json();
                        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) {
                            const parsed = JSON.parse(jsonMatch[0]);
                            setFormData({
                                ...formData,
                                clientName: parsed.clientName || formData.clientName,
                                date: parsed.date || formData.date,
                                time: parsed.time || formData.time,
                                fee: parsed.fee || formData.fee,
                                address: parsed.address || formData.address,
                                phone: parsed.phone || formData.phone,
                                email: parsed.email || formData.email,
                                type: parsed.type || formData.type
                            });
                            showToast("Form Auto-Filled!");
                        } else {
                            showToast("Could not parse details.", "error");
                        }
                    } catch (e) {
                        console.error(e);
                        showToast("AI Error. Check API Key.", "error");
                    }
                } else if (magicInput.toLowerCase().includes('john')) {
                    setFormData({...formData, clientName: 'John Doe', date: '2026-12-01', time: '14:00', fee: '150', address: '123 Main St, Austin, TX 78701', phone: '555-0123', email: 'john@example.com', type: 'Loan Signing'});
                    showToast("Form Filled (Demo Mode)");
                } else {
                      alert("Please add your Gemini API Key in Settings for real AI extraction, or type 'John' to see the demo.");
                }
            };

            const handleSubmit = (e) => { e.preventDefault(); onSave({...formData, id: initialData?.id || Date.now().toString()}); showToast(initialData ? "Appointment Updated" : "Appointment Scheduled"); };

            return (
                <div className="p-6 pb-24 max-w-2xl mx-auto">
                    <div className="bg-white rounded-2xl shadow p-6">
                        <h3 className="font-bold text-lg mb-4">{initialData ? 'Edit Appointment' : 'New Appointment'}</h3>

                        <div className="mb-4" style={{display:'flex', gap:10, flexWrap:'wrap'}}>
                            <button type="button" className="btn btn-secondary" style={{height:40}}
                                onClick={() => {
                                    const msg = `Hi ${formData.clientName || ''}, confirming our Notary appointment for ${formData.date || ''} ${formData.time || ''}. Reply YES to confirm.`;
                                    const link = buildSmsLink(formData.phone, msg);
                                    if(!link){ showToast('Add a client phone number first.', 'error'); return; }
                                    window.location.href = link;
                                }}>
                                <i className="fas fa-sms mr-2"></i>Text Reminder
                            </button>

                            <button type="button" className="btn btn-secondary" style={{height:40}}
                                onClick={() => {
                                    const subject = `Notary Appointment – ${formData.clientName || 'Client'} (${formData.date || ''} ${formData.time || ''})`;
                                    const body = `Hi ${formData.clientName || ''},%0D%0A%0D%0AThanks for scheduling your notary appointment.%0D%0A%0D%0ADate/Time: ${formData.date || ''} ${formData.time || ''}%0D%0ALocation: ${formData.address || ''}%0D%0AFee: ${formData.fee || ''}%0D%0A%0D%0ASee you soon.%0D%0A`;
                                    const link = buildMailtoLink(formData.email, subject, decodeURIComponent(body));
                                    if(!link){ showToast('Add a client email first.', 'error'); return; }
                                    window.location.href = link;
                                }}>
                                <i className="fas fa-envelope mr-2"></i>Email Template
                            </button>
                        </div>

                        <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <label className="text-xs font-bold text-blue-600 uppercase block mb-2"><i className="fas fa-magic"></i> Smart Fill</label>
                            <div className="flex gap-2"><input value={magicInput} onChange={e=>setMagicInput(e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="e.g. Loan signing with Sarah tomorrow at 2pm for $150..." /><button onClick={handleSmartFill} className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-bold">Fill</button></div>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Client Name *</label>
                                <input className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" placeholder="John Doe" value={formData.clientName} onChange={e=>setFormData({...formData, clientName: e.target.value})} required />
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                                    <input type="tel" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" placeholder="(555) 123-4567" value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                                    <input type="email" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" placeholder="client@example.com" value={formData.email} onChange={e=>setFormData({...formData, email: e.target.value})} />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Address *</label>
                                <input className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" placeholder="123 Main St, City, State ZIP" value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} required />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Date *</label>
                                    <input type="date" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Time *</label>
                                    <input type="time" className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" value={formData.time} onChange={e=>setFormData({...formData, time: e.target.value})} required />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Document Type</label>
                                    <select className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" value={formData.type} onChange={e=>setFormData({...formData, type: e.target.value})}>
                                        <option value="">Select type...</option>
                                        <option value="Loan Signing">Loan Signing</option>
                                        <option value="Real Estate">Real Estate</option>
                                        <option value="Power of Attorney">Power of Attorney</option>
                                        <option value="Affidavit">Affidavit</option>
                                        <option value="Trust Documents">Trust Documents</option>
                                        <option value="Medical Documents">Medical Documents</option>
                                        <option value="General Notarization">General Notarization</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Fee ($) *</label>
                                    <input className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" type="number" placeholder="150" value={formData.fee} onChange={e=>setFormData({...formData, fee: e.target.value})} required />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
                                <textarea className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all outline-none" rows="3" placeholder="Additional details or special instructions..." value={formData.notes} onChange={e=>setFormData({...formData, notes: e.target.value})}></textarea>
                            </div>
                            
                            <div className="flex gap-3 pt-2"><button type="button" onClick={onCancel} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold transition-colors">Cancel</button><button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-colors">Save Appointment</button></div>
                        </form>
                    </div>
                </div>
            );
        };

              const Schedule = ({ appointments, setView, onMarkPaid, onEdit, onAdd }) => {
            const safeAppointments = Array.isArray(appointments) ? appointments : [];
            const [activeFilter, setActiveFilter] = useState('All');
            const [paymentTarget, setPaymentTarget] = useState(null);
            const [searchQuery, setSearchQuery] = useState('');

            const filters = ['All', 'Upcoming', 'Completed', 'Paid', 'Cancelled'];
            const now = new Date();
            const todayStr = now.toISOString().split('T')[0];

            const withDate = safeAppointments.map(appt => ({ ...appt, dt: new Date(`${appt.date || ''}T${appt.time || '00:00'}`) }));

            const filtered = withDate.filter(appt => {
                if (activeFilter === 'Paid') return appt.status === 'Paid';
                if (activeFilter === 'Completed') return appt.status === 'Completed';
                if (activeFilter === 'Cancelled') return appt.status === 'Cancelled';
                if (activeFilter === 'Upcoming') return appt.status === 'Scheduled' || (appt.dt >= now && appt.status !== 'Cancelled');
                return true;
            }).filter(appt => {
                if (!searchQuery.trim()) return true;
                const q = searchQuery.toLowerCase();
                return [appt.clientName, appt.type, appt.address, appt.date].filter(Boolean).join(' ').toLowerCase().includes(q);
            }).sort((a, b) => a.dt - b.dt);

            /* --- STATUS METRICS --- */
            const upcoming = safeAppointments.filter(a => a.status === 'Scheduled');
            const completedCount = safeAppointments.filter(a => a.status === 'Completed').length;
            const paidCount = safeAppointments.filter(a => a.status === 'Paid').length;

            const nextAppt = [...withDate]
                .filter(a => a.status === 'Scheduled' && a.dt >= now)
                .sort((a, b) => a.dt - b.dt)[0] || null;

            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay());
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 7);
            const thisWeekRevenue = safeAppointments.filter(a => {
                const d = new Date(a.date);
                return d >= weekStart && d < weekEnd;
            }).reduce((sum, a) => sum + parseFloat(a.fee || 0), 0);

            const todaysJobs = safeAppointments.filter(a => a.date === todayStr);
            const todayRevenue = todaysJobs.reduce((sum, a) => sum + parseFloat(a.fee || 0), 0);

            /* --- HELPERS --- */
            const statusClass = (status) => {
                if (status === 'Paid') return 'sched-status-paid';
                if (status === 'Completed') return 'sched-status-completed';
                if (status === 'Cancelled') return 'sched-status-cancelled';
                return 'sched-status-scheduled';
            };

            const statusDot = (status) => {
                if (status === 'Paid') return 'sched-dot-green';
                if (status === 'Completed') return 'sched-dot-blue';
                if (status === 'Cancelled') return 'sched-dot-red';
                return 'sched-dot-amber';
            };

            const typeIcon = (type) => {
                const t = (type || '').toLowerCase();
                if (t.includes('loan')) return 'fa-home';
                if (t.includes('real estate')) return 'fa-building';
                if (t.includes('power of attorney') || t.includes('poa')) return 'fa-gavel';
                if (t.includes('affidavit')) return 'fa-file-alt';
                if (t.includes('trust')) return 'fa-shield-alt';
                if (t.includes('medical')) return 'fa-heartbeat';
                return 'fa-file-signature';
            };

            const typeGradient = (type) => {
                const t = (type || '').toLowerCase();
                if (t.includes('loan')) return 'from-blue-500 to-indigo-500';
                if (t.includes('real estate')) return 'from-emerald-500 to-teal-500';
                if (t.includes('power of attorney') || t.includes('poa')) return 'from-purple-500 to-violet-500';
                if (t.includes('trust')) return 'from-amber-500 to-orange-500';
                return 'from-slate-500 to-slate-600';
            };

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-6 font-sans max-w-6xl mx-auto w-full sched-bg-mesh">

                    {/* === HEADER === */}
                    <div className="anim-fade-up anim-delay-1 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <i className="fas fa-calendar-alt text-white text-lg"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl sm:text-3xl font-extrabold theme-text tracking-tight">Schedule</h3>
                                <p className="text-xs theme-text-muted mt-0.5">Manage appointments and track your signing pipeline</p>
                            </div>
                        </div>
                        <button onClick={() => (onAdd ? onAdd(todayStr) : setView('Add Appointment'))} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all duration-300">
                            <i className="fas fa-plus"></i> New Appointment
                        </button>
                    </div>

                    {/* === KPI CARDS === */}
                    <div className="anim-fade-scale anim-delay-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Today */}
                        <div className="sched-kpi glass-card p-4 gradient-mesh-emerald">
                            <div className="flex items-center justify-between mb-2">
                                <p className="theme-text-muted text-[10px] font-bold uppercase tracking-widest">Today</p>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-green-400 flex items-center justify-center shadow-md">
                                    <i className="fas fa-sun text-white text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-extrabold gradient-text-emerald">{todaysJobs.length}</p>
                            <p className="text-[11px] theme-text-muted mt-1">{todaysJobs.length === 1 ? 'signing' : 'signings'} &middot; ${todayRevenue.toLocaleString()}</p>
                        </div>

                        {/* Upcoming */}
                        <div className="sched-kpi glass-card p-4 gradient-mesh-indigo">
                            <div className="flex items-center justify-between mb-2">
                                <p className="theme-text-muted text-[10px] font-bold uppercase tracking-widest">Upcoming</p>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-md">
                                    <i className="fas fa-calendar-check text-white text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-extrabold gradient-text-indigo">{upcoming.length}</p>
                            <p className="text-[11px] theme-text-muted mt-1 truncate">
                                {nextAppt ? `Next: ${nextAppt.clientName || 'Client'}` : 'None scheduled'}
                            </p>
                        </div>

                        {/* Week Revenue */}
                        <div className="sched-kpi glass-card p-4 gradient-mesh-amber">
                            <div className="flex items-center justify-between mb-2">
                                <p className="theme-text-muted text-[10px] font-bold uppercase tracking-widest">This Week</p>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-400 flex items-center justify-center shadow-md">
                                    <i className="fas fa-coins text-white text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-extrabold" style={{color: '#d97706'}}>${thisWeekRevenue.toLocaleString()}</p>
                            <p className="text-[11px] theme-text-muted mt-1">Potential revenue</p>
                        </div>

                        {/* Pipeline */}
                        <div className="sched-kpi glass-card p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="theme-text-muted text-[10px] font-bold uppercase tracking-widest">Pipeline</p>
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-md">
                                    <i className="fas fa-chart-bar text-white text-sm"></i>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 mt-1">
                                <div className="flex items-center gap-1.5">
                                    <span className="sched-dot sched-dot-amber"></span>
                                    <span className="text-xs font-bold theme-text">{upcoming.length}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="sched-dot sched-dot-blue"></span>
                                    <span className="text-xs font-bold theme-text">{completedCount}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="sched-dot sched-dot-green"></span>
                                    <span className="text-xs font-bold theme-text">{paidCount}</span>
                                </div>
                            </div>
                            <p className="text-[11px] theme-text-muted mt-1.5">Scheduled &middot; Done &middot; Paid</p>
                        </div>
                    </div>

                    {/* === FILTERS + SEARCH === */}
                    <div className="anim-fade-up anim-delay-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {filters.map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setActiveFilter(filter)}
                                    className={`sched-filter flex-shrink-0 ${activeFilter === filter ? 'sched-filter-active' : 'theme-text-muted theme-border'}`}
                                >
                                    {filter}
                                    {filter !== 'All' && (
                                        <span className="ml-1 opacity-60 text-[11px]">
                                            {filter === 'Upcoming' ? upcoming.length : filter === 'Completed' ? completedCount : filter === 'Paid' ? paidCount : safeAppointments.filter(a => a.status === 'Cancelled').length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                        <div className="relative w-full sm:w-64 flex-shrink-0">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted text-xs"></i>
                            <input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search client, type..."
                                className="w-full pl-9 pr-3 py-2 rounded-xl border theme-border theme-app-bg theme-text text-sm glass"
                                style={{background: 'rgba(255,255,255,0.5)', backdropFilter: 'blur(8px)'}}
                            />
                        </div>
                    </div>

                    {/* === APPOINTMENT LIST === */}
                    {filtered.length === 0 ? (
                        <div className="anim-fade-scale anim-delay-4 glass-card rounded-2xl p-12 text-center">
                            <div className="sched-empty-ring mx-auto mb-5">
                                <i className="fas fa-calendar-plus text-indigo-400 text-2xl"></i>
                            </div>
                            <h4 className="theme-text text-lg font-extrabold mb-2">
                                {searchQuery ? 'No matching appointments' : activeFilter !== 'All' ? `No ${activeFilter.toLowerCase()} appointments` : 'No appointments yet'}
                            </h4>
                            <p className="theme-text-muted text-sm mb-6 max-w-md mx-auto">
                                {searchQuery ? 'Try adjusting your search or clearing filters.' : 'Create your first appointment to start building your signing pipeline and tracking revenue.'}
                            </p>
                            {!searchQuery && (
                                <button onClick={() => (onAdd ? onAdd(todayStr) : setView('Add Appointment'))} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 transition-all duration-300">
                                    <i className="fas fa-plus mr-2"></i>Create Appointment
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((appt, idx) => {
                                const day = appt.dt && !isNaN(appt.dt) ? appt.dt.toLocaleString(undefined, { day: '2-digit' }) : '--';
                                const month = appt.dt && !isNaN(appt.dt) ? appt.dt.toLocaleString(undefined, { month: 'short' }).toUpperCase() : '---';
                                const weekday = appt.dt && !isNaN(appt.dt) ? appt.dt.toLocaleString(undefined, { weekday: 'short' }) : '';
                                const isToday = appt.date === todayStr;
                                const isPast = appt.dt < now && !isToday;
                                const isPaid = appt.status === 'Paid';
                                const initials = (appt.clientName || 'NA').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

                                return (
                                    <div
                                        key={appt.id}
                                        className={`anim-fade-up glass-card appt-row p-4 sm:p-5 ${isToday ? 'appt-row-today' : ''}`}
                                        style={{ animationDelay: `${0.05 * Math.min(idx, 10)}s` }}
                                    >
                                        <div className="flex items-center gap-4">
                                            {/* Date Badge */}
                                            <div className="appt-date-badge theme-surface-muted border theme-border">
                                                <span className="text-[10px] font-bold theme-text-muted relative z-10">{month}</span>
                                                <span className="text-xl font-extrabold theme-text leading-none relative z-10">{day}</span>
                                                <span className="text-[9px] font-semibold theme-text-muted relative z-10">{weekday}</span>
                                            </div>

                                            {/* Main Info */}
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    {isToday && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>TODAY
                                                        </span>
                                                    )}
                                                    <span className={`sched-dot ${statusDot(appt.status)}`}></span>
                                                </div>
                                                <p className="font-extrabold theme-text truncate text-[15px] tracking-tight">{appt.clientName || 'Client'}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`w-6 h-6 rounded-md bg-gradient-to-br ${typeGradient(appt.type)} flex items-center justify-center flex-shrink-0`}>
                                                        <i className={`fas ${typeIcon(appt.type)} text-white text-[9px]`}></i>
                                                    </span>
                                                    <span className="text-sm theme-text-muted truncate">{appt.type || 'Notary Service'}</span>
                                                    <span className="text-sm theme-text-muted">•</span>
                                                    <span className="text-sm theme-text-muted font-mono">{appt.time || 'TBD'}</span>
                                                </div>
                                                <p className="text-xs theme-text-muted truncate mt-1">
                                                    <i className="fas fa-map-marker-alt mr-1 text-rose-400"></i>
                                                    {appt.address || 'Address not provided'}
                                                </p>
                                            </div>

                                            {/* Right: Fee + Status + Actions */}
                                            <div className="text-right flex-shrink-0 flex flex-col items-end gap-2">
                                                <p className={`appt-fee ${isPaid ? 'appt-fee-paid' : 'appt-fee-default'}`}>
                                                    ${parseFloat(appt.fee || 0).toLocaleString()}
                                                </p>
                                                <span className={`sched-status ${statusClass(appt.status)}`}>
                                                    <i className={`fas ${appt.status === 'Paid' ? 'fa-check-circle' : appt.status === 'Completed' ? 'fa-circle-check' : appt.status === 'Cancelled' ? 'fa-ban' : 'fa-clock'} text-[9px]`}></i>
                                                    {appt.status || 'Scheduled'}
                                                </span>
                                                <div className="flex gap-1.5 mt-0.5">
                                                    {appt.status !== 'Paid' && appt.status !== 'Cancelled' && (
                                                        <button onClick={(e) => { e.stopPropagation(); setPaymentTarget(appt); }} className="appt-action-btn appt-action-btn-pay" title="Collect Payment">
                                                            <i className="fas fa-dollar-sign"></i>
                                                        </button>
                                                    )}
                                                    <button onClick={(e) => { e.stopPropagation(); onEdit(appt); }} className="appt-action-btn" title="Edit / Details">
                                                        <i className="fas fa-pen"></i>
                                                    </button>
                                                    {appt.phone && (
                                                        <a href={`tel:${appt.phone}`} className="appt-action-btn" title="Call Client">
                                                            <i className="fas fa-phone"></i>
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* === SUMMARY FOOTER === */}
                    {filtered.length > 0 && (
                        <div className="anim-fade-up anim-delay-5 glass-card rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                                <span className="text-xs font-bold theme-text-muted uppercase tracking-wide">Showing {filtered.length} of {safeAppointments.length}</span>
                                {activeFilter !== 'All' && (
                                    <button onClick={() => setActiveFilter('All')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors">
                                        Clear filter <i className="fas fa-times ml-1"></i>
                                    </button>
                                )}
                            </div>
                            <div className="text-xs font-bold theme-text-muted">
                                Total: <span className="theme-text font-extrabold">${filtered.reduce((s, a) => s + parseFloat(a.fee || 0), 0).toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {paymentTarget && (
                        <PaymentModal
                            appointment={paymentTarget}
                            onClose={() => setPaymentTarget(null)}
                            onPaid={async () => {
                                await onMarkPaid(paymentTarget);
                                setPaymentTarget(null);
                            }}
                        />
                    )}
                </div>
            );
        };

        const PaymentModal = ({ appointment, onClose, onPaid }) => {
            const handlePayLink = () => {
                if (STRIPE_PAYMENT_LINK) {
                    window.open(STRIPE_PAYMENT_LINK, '_blank', 'noopener');
                    showToast("Payment link opened");
                } else {
                    showToast("Add a Stripe payment link in configuration.", "error");
                }
            };

            return (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-semibold text-gray-800">Collect Payment</h4>
                                <p className="text-sm text-gray-500">Invoice for {appointment.clientName} • ${appointment.fee}</p>
                            </div>
                            <button onClick={onClose} className="text-gray-400"><i className="fas fa-times"></i></button>
                        </div>
                        <div className="space-y-3">
                            <button onClick={onPaid} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                                <i className="fas fa-wifi"></i> Tap to Pay (Simulated)
                            </button>
                            <button onClick={handlePayLink} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2">
                                <i className="fas fa-link"></i> Send Stripe Payment Link
                            </button>
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                                Record payments here to automatically mark invoices as paid in the journal.
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const SignerPortal = ({ appointments }) => {
            const safeAppointments = Array.isArray(appointments) ? appointments : [];

            const portalRows = safeAppointments
                .filter(a => a.status !== 'Cancelled')
                .slice(0, 8)
                .map((a, idx) => ({
                    id: a.id || `${idx}`,
                    clientName: a.clientName || 'Client',
                    apptDate: a.date || 'TBD',
                    idUploaded: idx % 2 === 0,
                    docsReviewed: true,
                    paymentDone: a.status === 'Paid'
                }));

            const copyLink = () => {
                try {
                    navigator.clipboard?.writeText('https://notaryos.app/portal/link-demo');
                } catch (e) {}
                showToast('Link Copied!');
            };

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-2xl font-bold theme-text">Signer Portals</h3>
                            <p className="theme-text-muted text-sm mt-1">Manage secure links sent to your clients for ID verification and pre-payment.</p>
                        </div>
                        <button onClick={copyLink} className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                            <i className="fas fa-link mr-2"></i>Generate New Link
                        </button>
                    </div>

                    
                    {selectedEntryIds.length > 0 && (
                        <div className="card card-tight" style={{marginTop:12}}>
                            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                                <div className="theme-text" style={{fontWeight:900}}>
                                    {selectedEntryIds.length} selected <span className="theme-text-muted" style={{fontWeight:700}}>(bulk)</span>
                                </div>
                                <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                                    <button className="btn btn-secondary" style={{height:36}} onClick={exportSelectedEntriesCSV}>
                                        <i className="fas fa-file-csv mr-2"></i>Export CSV
                                    </button>
                                    <button className="btn btn-secondary" style={{height:36}} onClick={deleteSelectedEntries}>
                                        <i className="fas fa-trash mr-2"></i>Delete
                                    </button>
                                    <button className="btn btn-secondary" style={{height:36}} onClick={clearEntrySelection}>Clear</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="theme-surface theme-border border rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b theme-border flex items-center justify-between">
                            <h4 className="font-semibold theme-text">Active Portals</h4>
                            <span className="text-xs theme-text-muted">{portalRows.length} active</span>
                        </div>

                        {portalRows.length === 0 ? (
                            <div className="p-10 text-center">
                                <i className="fas fa-shield-alt text-2xl theme-text-muted"></i>
                                <p className="theme-text mt-3 font-semibold">No active portal links yet.</p>
                                <p className="theme-text-muted text-sm">Generate a secure link from your next appointment.</p>
                            </div>
                        ) : (
                            <div className="divide-y theme-border">
                                {portalRows.map(row => (
                                    <div key={row.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center gap-4">
                                        <div className="min-w-0 lg:w-1/4">
                                            <p className="font-semibold theme-text truncate">{row.clientName}</p>
                                            <p className="text-xs theme-text-muted">Appt: {row.apptDate}</p>
                                        </div>

                                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${row.idUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                ID Uploaded: {row.idUploaded ? 'Done' : 'Pending'}
                                            </span>
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
                                                Docs Reviewed: Done
                                            </span>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full font-semibold ${row.paymentDone ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                Payment: {row.paymentDone ? 'Paid' : 'Unpaid'}
                                            </span>
                                        </div>

                                        <div className="lg:w-36 lg:text-right">
                                            <button onClick={copyLink} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border theme-border theme-text hover:theme-surface-muted transition-all duration-200">
                                                <i className="fas fa-copy"></i> Copy Link
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const Journal = ({ user, onUpgrade, quickEntry, onQuickEntryUsed }) => {
            const [entries, setEntries] = useState([]);
            const [showForm, setShowForm] = useState(false);
            const [search, setSearch] = useState('');
            const [editingEntry, setEditingEntry] = useState(null);
            const [selectedEntryIds, setSelectedEntryIds] = useState([]);

            useEffect(() => { DataManager.get('notary_journal').then(setEntries); }, []);

            const handleSave = async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const now = Date.now();
                const payload = {
                    id: (editingEntry && (editingEntry.id || editingEntry._id)) ? (editingEntry.id || editingEntry._id) : Date.now().toString(),
                    date: fd.get('date'),
                    time: fd.get('time'),
                    signer: fd.get('signer'),
                    address: fd.get('address'),
                    idType: fd.get('idType') || "Driver's License",
                    idNumber: fd.get('idNumber'),
                    docType: fd.get('docType'),
                    fee: fd.get('fee'),
                    notes: fd.get('notes'),
                    updatedAt: now
                };
                await DataManager.save('notary_journal', payload);
                setShowForm(false);
                setEditingEntry(null);
                setEntries(await DataManager.get('notary_journal'));
                showToast(editingEntry ? 'Entry Updated' : 'Entry Logged');
            };

            const handleExport = () => {
                if (user.plan !== 'pro') { onUpgrade(); return; }
                if (window.jspdf) {
                    PDFGenerator.createReport(
                        'eJournal Ledger',
                        ['Date', 'Time', 'Signer', 'ID Type', 'Document', 'Fee'],
                        entries.map(e => [e.date, e.time || '—', e.signer, e.idType || "Driver's License", e.docType, `$${e.fee}`]),
                        'ejournal.pdf'
                    );
                }
            };

            const startEditEntry = (entry) => { setEditingEntry(entry); setShowForm(true); track('ejournal_edit_open', {}); };
            const deleteEntry = async (id) => { 
                await DataManager.delete('notary_journal', id); 
                setEntries(await DataManager.get('notary_journal')); 
                showToast('Entry Deleted');
                try{ window.posthog && window.posthog.capture && window.posthog.capture('journal_deleted'); }catch(e){} 
                track('ejournal_delete', {});
            };


            const q = (search || '').trim().toLowerCase();
            const filtered = entries.filter(e => {
                if(!q) return true;
                const hay = [e.signer, e.date, e.time, e.type, e.fee, e.notes].filter(Boolean).join(' ').toLowerCase();
                return hay.includes(q);
            });

            const toggleEntrySelected = (id) => {
                setSelectedEntryIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
            };
            const allFilteredSelected = filtered.length > 0 && selectedEntryIds.length === filtered.length;
            const selectAllFiltered = () => setSelectedEntryIds(filtered.map(e => e.id));
            const clearEntrySelection = () => setSelectedEntryIds([]);

            const deleteSelectedEntries = async () => {
                if(selectedEntryIds.length === 0) return;
                const ok = confirm(`Delete ${selectedEntryIds.length} selected journal entr${selectedEntryIds.length===1?'y':'ies'}?`);
                if(!ok) return;
                for(const id of selectedEntryIds){
                    try{ await DataManager.delete('notary_journal', id); }catch(e){}
                }
                const next = await DataManager.get('notary_journal');
                setEntries(next);
                setSelectedEntryIds([]);
                showToast('Selected journal entries deleted', 'success');
                try{ track('journal_bulk_delete', { count: selectedEntryIds.length }); }catch(e){}
            };

            const exportSelectedEntriesCSV = () => {
                if(selectedEntryIds.length === 0) return;
                const selected = entries.filter(e => selectedEntryIds.includes(e.id));
                const rows = [['Date','Time','Signer','Type','Fee','Notes']].concat(
                    selected.map(e => [e.date||'', e.time||'', e.signer||'', e.type||'', e.fee||'', e.notes||''])
                );
                downloadCSV(rows, `notaryos_journal_selected_${new Date().toISOString().split('T')[0]}.csv`);
                showToast('Exported selected journal entries', 'success');
                try{ localStorage.setItem('notary_exported_once','true'); }catch(e){}
                try{ persistSetupChecklistLocal(user, (safeParse(localStorage.getItem('notary_appointments'), []) || [])); }catch(e){}
                try{ track('journal_bulk_export', { count: selectedEntryIds.length }); }catch(e){}
            };

            // STATUS: Calculate key metrics
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            const thisMonthEntries = entries.filter(e => new Date(e.date) >= thisMonth);
            const thisMonthFees = thisMonthEntries.reduce((sum, e) => sum + parseFloat(e.fee || 0), 0);
            const complianceRate = entries.length > 0 ? 100 : 0; // Simplified - could check against appointments

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    {/* STATUS SECTION */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
                                <i className="fas fa-book text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold theme-text">eJournal</h3>
                                <p className="text-xs theme-text-muted">Secure notarial act ledger</p>
                            </div>
                        </div>
                        <button onClick={() => setShowForm(true)} className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                            <i className="fas fa-plus mr-2"></i>New Entry
                        </button>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">This Month</p>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <i className="fas fa-file-alt text-blue-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{thisMonthEntries.length}</p>
                            <p className="text-xs theme-text-muted mt-1">{thisMonthEntries.length === 1 ? 'entry' : 'entries'} logged</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Fees Collected</p>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <i className="fas fa-dollar-sign text-emerald-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">${thisMonthFees.toLocaleString()}</p>
                            <p className="text-xs theme-text-muted mt-1">This month</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Compliance</p>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <i className="fas fa-shield-check text-emerald-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{complianceRate}%</p>
                            <p className="text-xs theme-text-muted mt-1">All acts documented</p>
                        </div>
                    </div>

                    {/* CONTEXT SECTION */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="relative flex-1 min-w-[200px] max-w-md">
                            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 theme-text-muted text-xs"></i>
                            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search signer or document type" className="w-full pl-8 pr-3 py-2 rounded-lg border theme-border theme-app-bg theme-text text-sm" />
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleExport} className="px-3 py-2 rounded-lg border theme-border theme-surface theme-text text-sm transition-all duration-200 hover:-translate-y-0.5">
                                <i className="fas fa-file-export mr-2"></i>Export PDF
                            </button>
                        </div>
                    </div>

                    {/* Bulk Actions Toolbar */}
                    {selectedEntryIds.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <i className="fas fa-check-circle text-blue-600"></i>
                                <span className="font-semibold text-blue-900">{selectedEntryIds.length} selected</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={exportSelectedEntriesCSV} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-semibold">
                                    <i className="fas fa-download mr-1"></i>Export CSV
                                </button>
                                <button onClick={deleteSelectedEntries} className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-semibold">
                                    <i className="fas fa-trash mr-1"></i>Delete
                                </button>
                                <button onClick={clearEntrySelection} className="px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 text-sm font-semibold">
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ACTION SECTION */}
                    {filtered.length === 0 ? (
                        <div className="theme-surface theme-border border rounded-2xl p-10 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
                                <i className="fas fa-book theme-text-muted text-2xl"></i>
                            </div>
                            <h4 className="theme-text text-lg font-semibold mb-2">No journal entries</h4>
                            <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">No notarial acts logged yet. Start your secure ledger here to maintain compliance and track all your notarizations.</p>
                            <button onClick={() => setShowForm(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
                                <i className="fas fa-plus mr-2"></i>New Entry
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="hidden md:block theme-surface theme-border border rounded-2xl overflow-hidden">
                                <div className="grid grid-cols-12 px-4 py-3 text-[11px] uppercase font-bold theme-text-muted border-b theme-border tracking-wide">
                                    <div className="col-span-2">Date / Time</div>
                                    <div className="col-span-3">Signer</div>
                                    <div className="col-span-3">Document</div>
                                    <div className="col-span-2">ID Verification</div>
                                    <div className="col-span-2 text-right">Fee</div>
                                </div>
                                {filtered.map(entry => (
                                    <div key={entry.id} className="grid grid-cols-12 px-4 py-3 border-b theme-border hover:theme-surface-muted transition-all duration-200">
                                        <div className="col-span-1 flex items-center"><input type="checkbox" checked={selectedEntryIds.includes(entry.id)} onChange={()=>toggleEntrySelected(entry.id)} /></div>
                                        <div className="col-span-1 font-mono text-sm theme-text">{entry.date}<div className="text-xs theme-text-muted">{entry.time || '—'}</div></div>
                                        <div className="col-span-3 font-semibold theme-text truncate">{entry.signer}</div>
                                        <div className="col-span-3 theme-text-muted truncate">{entry.docType || 'Notary Service'}</div>
                                        <div className="col-span-2 theme-text-muted truncate">{entry.idType || "Driver's License"}</div>
                                        <div className="col-span-2 text-right">
                                            <div className="font-semibold theme-text">${parseFloat(entry.fee || 0).toFixed(2)}</div>
                                            <div className="mt-1 flex justify-end gap-2 text-xs">
                                                <button onClick={() => startEditEntry(entry)} className="px-2 py-1 rounded-md border theme-border theme-text hover:theme-surface-muted"><i className="fas fa-pen"></i></button>
                                                <button onClick={() => deleteEntry(entry.id)} className="px-2 py-1 rounded-md border theme-border text-red-600 hover:bg-red-50"><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="md:hidden space-y-3">
                                {filtered.map(entry => (
                                    <div key={entry.id} className="theme-surface theme-border border rounded-xl p-4">
                                        <div className="flex justify-between gap-3">
                                            <p className="font-semibold theme-text truncate">{entry.signer}</p>
                                            <p className="font-semibold theme-text">${parseFloat(entry.fee || 0).toFixed(2)}</p>
                                        </div>
                                        <p className="font-mono text-xs theme-text-muted mt-1">{entry.date} • {entry.time || '—'}</p>
                                        <p className="text-sm theme-text-muted mt-1 truncate">{entry.docType || 'Notary Service'}</p>
                                        <div className="mt-3 flex gap-2">
                                            <button onClick={() => startEditEntry(entry)} className="flex-1 px-3 py-2 rounded-lg border theme-border theme-text font-semibold text-sm"><i className="fas fa-pen mr-2"></i>Edit</button>
                                            <button onClick={() => deleteEntry(entry.id)} className="px-3 py-2 rounded-lg border theme-border text-red-600 font-semibold text-sm"><i className="fas fa-trash"></i></button>
                                        </div>
                                        <p className="text-xs theme-text-muted mt-1">ID: {entry.idType || "Driver's License"}</p>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {showForm && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <form onSubmit={handleSave} className="w-full max-w-2xl theme-surface rounded-2xl shadow-2xl border theme-border p-6 space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xl font-bold theme-text">{editingEntry ? 'Edit eJournal Entry' : 'New eJournal Entry'}</h4>
                                    <button type="button" onClick={() => { setShowForm(false); setEditingEntry(null); }} className="theme-text-muted"><i className="fas fa-times"></i></button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input required name="date" type="date" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.date || '') : ''} />
                                    <input name="time" type="time" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.time || '') : ''} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input required name="signer" placeholder="Signer Name" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.signer || '') : ''} />
                                    <input name="address" placeholder="Signer Address" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <select name="idType" defaultValue={editingEntry ? (editingEntry.idType || "Driver\'s License") : "Driver\'s License"} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text">
                                        <option>Driver's License</option><option>Passport</option><option>State ID</option><option>Military ID</option>
                                    </select>
                                    <input name="idNumber" placeholder="ID Number (last 4 digits)" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.idNumber || '') : ''} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="docType" placeholder="Document Type" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.docType || '') : ''} />
                                    <input name="fee" type="number" step="0.01" placeholder="Fee" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue={editingEntry ? (editingEntry.fee || '') : ''} />
                                </div>
                                <textarea name="notes" placeholder="Additional notes or observations..." rows="2" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"></textarea>
                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => { setShowForm(false); setEditingEntry(null); }} className="px-4 py-2 rounded-lg border theme-border theme-text">Cancel</button>
                                    <button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">{editingEntry ? "Update Entry" : "Save Entry"}</button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            );
        };

        const Finances = ({ user }) => {
            const [activeTab, setActiveTab] = useState('expenses');
            const [expenses, setExpenses] = useState([]);
            const [mileage, setMileage] = useState([]);
            const [showExpenseModal, setShowExpenseModal] = useState(false);
            const [selectedExpenseIds, setSelectedExpenseIds] = useState([]);
            const [showMileageModal, setShowMileageModal] = useState(false);
            const [editingExpense, setEditingExpense] = useState(null);
            const [editingMileage, setEditingMileage] = useState(null);
            const [gpsState, setGpsState] = useState({ tracking:false, starting:false, watchId:null, start:null, last:null, meters:0, startedAt:null });

            useEffect(() => {
                const load = async () => {
                    setExpenses(await DataManager.get('notary_expenses'));
                    setMileage(await DataManager.get('notary_mileage'));
                };
                load();
            }, []);

            const saveExpense = async (e) => {
                // Free-plan monthly limits (create only)
                const __isEdit = !!editingExpense;
                if(!__isEdit && (user?.plan||'free')==='free'){
                    const g = limitGuard('expensesPerMonth', user, (expenses||[]));
                    if(!g.ok){ showToast(`Free expenses limit reached (${g.used}/${g.lim}). Upgrade to continue.`, 'error'); try{ setShowPricing(true);}catch(e){} return; }
                }
                e.preventDefault();
                const fd = new FormData(e.target);
                const now = Date.now();
                const payload = {
                    id: (editingExpense && (editingExpense.id || editingExpense._id)) ? (editingExpense.id || editingExpense._id) : Date.now().toString(),
                    date: fd.get('date'),
                    category: fd.get('category'),
                    desc: fd.get('desc'),
                    amount: fd.get('amount'),
                    updatedAt: now
                };
                await DataManager.save('notary_expenses', payload);
                setExpenses(await DataManager.get('notary_expenses'));
                setShowExpenseModal(false);
                setEditingExpense(null);
                showToast(editingExpense ? 'Expense Updated' : 'Expense Saved');
            };

            const saveMileage = async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                const now = Date.now();
                const payload = {
                    id: (editingMileage && (editingMileage.id || editingMileage._id)) ? (editingMileage.id || editingMileage._id) : Date.now().toString(),
                    date: fd.get('date'),
                    start: fd.get('start'),
                    end: fd.get('end'),
                    miles: fd.get('miles'),
                    updatedAt: now
                };
                await DataManager.save('notary_mileage', payload);
                setMileage(await DataManager.get('notary_mileage'));
                setShowMileageModal(false);
                setEditingMileage(null);
                showToast(editingMileage ? 'Mileage Trip Updated' : 'Mileage Trip Saved');
            };

            const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const totalMileage = mileage.reduce((sum, m) => sum + parseFloat(m.miles || 0), 0);

            // STATUS: Calculate key metrics
            const thisMonth = new Date();
            thisMonth.setDate(1);
            thisMonth.setHours(0, 0, 0, 0);
            const thisMonthExpenses = expenses.filter(e => new Date(e.date) >= thisMonth);
            const thisMonthTotal = thisMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const ytdExpenses = totalExpenses;
            const ytdMileage = totalMileage;


            const toggleExpenseSelected = (id) => {
                setSelectedExpenseIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.concat(id));
            };
            const allExpensesSelected = expenses.length > 0 && selectedExpenseIds.length === expenses.length;
            const selectAllExpenses = () => setSelectedExpenseIds(expenses.map(e => e.id));
            const clearExpenseSelection = () => setSelectedExpenseIds([]);

            const deleteSelectedExpenses = async () => {
                if(selectedExpenseIds.length === 0) return;
                const ok = confirm(`Delete ${selectedExpenseIds.length} selected expense${selectedExpenseIds.length===1?'':'s'}?`);
                if(!ok) return;
                for(const id of selectedExpenseIds){
                    try{ await DataManager.delete('notary_expenses', id); }catch(e){}
                }
                const next = await DataManager.get('notary_expenses');
                setExpenses(next);
                setSelectedExpenseIds([]);
                showToast('Selected expenses deleted', 'success');
                try{ track('expenses_bulk_delete', { count: selectedExpenseIds.length }); }catch(e){}
            };

            const exportSelectedExpensesCSV = () => {
                if(selectedExpenseIds.length === 0) return;
                const selected = expenses.filter(e => selectedExpenseIds.includes(e.id));
                const rows = [['Date','Category','Description','Amount']].concat(
                    selected.map(e => [e.date||'', e.category||'', e.desc||'', e.amount||''])
                );
                // reuse existing helper in this component
                exportCSV(rows, `notaryos_expenses_selected_${new Date().toISOString().split('T')[0]}.csv`);
                try{ localStorage.setItem('notary_exported_once','true'); }catch(e){}
                showToast('Exported selected expenses', 'success');
                try{ persistSetupChecklistLocal(user, safeParse(localStorage.getItem('notary_appointments'), []) || []); }catch(e){}
                try{ track('expenses_bulk_export', { count: selectedExpenseIds.length }); }catch(e){}
            };


            const categoryIcon = (category = '') => {
                const c = category.toLowerCase();
                if (c.includes('travel')) return 'fa-car';
                if (c.includes('supply')) return 'fa-paperclip';
                if (c.includes('software')) return 'fa-laptop-code';
                if (c.includes('meal')) return 'fa-utensils';
                return 'fa-receipt';
            };

            
            const startEditExpense = (item) => { setEditingExpense(item); setShowExpenseModal(true); };
            const deleteExpense = async (id) => { await DataManager.delete('notary_expenses', id); setExpenses(await DataManager.get('notary_expenses')); showToast('Expense Deleted');
                try{ window.posthog && window.posthog.capture && window.posthog.capture('expense_deleted'); }catch(e){} };

            const startEditMileage = (item) => { setEditingMileage(item); setShowMileageModal(true); };
            const deleteMileage = async (id) => { await DataManager.delete('notary_mileage', id); setMileage(await DataManager.get('notary_mileage')); showToast('Mileage Deleted');
                try{ window.posthog && window.posthog.capture && window.posthog.capture('mileage_deleted'); }catch(e){} };

            const exportCSV = (rows, filename) => {
                const esc = (v) => {
                    const s = (v === null || v === undefined) ? '' : String(v);
                    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
                };
                const csv = rows.map(r => r.map(esc).join(',')).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            };

            const exportTax = (mode) => {
                const __pro = canAccess('pro', user);
                const __watermark = __pro ? null : 'FREE PLAN EXPORT (PREVIEW) - Upgrade for full tax export';

                if (mode === 'expenses') {
                    
                    const rows = [['Date','Category','Description','Amount']].concat(expenses.map(e => [e.date||'', e.category||'', e.desc||'', e.amount||'']));
                    if(!__pro){
                        rows.unshift([__watermark,'','','']);
                        const head = rows.slice(0,2);
                        const tail = rows.slice(-26);
                        exportCSV(head.concat(tail), `notaryos_expenses_PREVIEW_${new Date().toISOString().split('T')[0]}.csv`);
                        markExportedOnce();
                        showToast('Exported preview CSV (watermarked). Upgrade for full export.', 'info');
                        persistSetupChecklistLocal(user, appointments);
                        return;
                    }
                    exportCSV([['Date','Category','Description','Amount']].concat(expenses.map(e => [e.date||'', e.category||'', e.desc||'', e.amount||''])),
                        `notaryos_expenses_${new Date().toISOString().split('T')[0]}.csv`
                    );
                    track('export_tax_csv', { type:'expenses' });
                    showToast('Expenses CSV exported');
                } else {
                    exportCSV(
                        [['Date','Start','End','Miles']].concat(mileage.map(m => [m.date||'', m.start||'', m.end||'', m.miles||''])),
                        `notaryos_mileage_${new Date().toISOString().split('T')[0]}.csv`
                    );
                    track('export_tax_csv', { type:'mileage' });
                    showToast('Mileage CSV exported');
                }
            };

            const haversineMeters = (a, b) => {
                const R = 6371000;
                const toRad = (x) => x * Math.PI / 180;
                const dLat = toRad(b.lat - a.lat);
                const dLon = toRad(b.lng - a.lng);
                const lat1 = toRad(a.lat), lat2 = toRad(b.lat);
                const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)**2;
                return 2 * R * Math.asin(Math.sqrt(h));
            };

            const startGps = async () => {
                if (!canAccess('pro', user)) { showToast('Upgrade to Pro for GPS mileage tracking', 'error'); return; }
                if (!('geolocation' in navigator)) { showToast('GPS not available on this device', 'error'); return; }
                setGpsState(prev => ({ ...prev, starting: true }));
                try {
                    const startedAt = new Date().toISOString();
                    const init = await new Promise((resolve, reject) => navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }));
                    const start = { lat: init.coords.latitude, lng: init.coords.longitude };
                    const watchId = navigator.geolocation.watchPosition((pos) => {
                        setGpsState(prev => {
                            const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                            const add = prev.last ? haversineMeters(prev.last, next) : 0;
                            return { ...prev, tracking: true, watchId, start: prev.start || start, last: next, meters: (prev.meters || 0) + add, startedAt: prev.startedAt || startedAt };
                        });
                    }, (err) => {
                        showToast('GPS error: ' + (err && err.message ? err.message : 'Unknown'), 'error');
                    }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
                    setGpsState({ tracking: true, starting: false, watchId, start, last: start, meters: 0, startedAt });
                    markGpsEnabled();
                    showToast('GPS tracking started');
                    persistSetupChecklistLocal(user, appointments);
                    track('gps_mileage_start', {});
                } catch (e) {
                    showToast('Unable to start GPS tracking', 'error');
                } finally {
                    setGpsState(prev => ({ ...prev, starting: false }));
                }
            };

            const stopGpsAndSave = async () => {
                if (!gpsState.tracking) return;
                try { navigator.geolocation.clearWatch(gpsState.watchId); } catch(e) {}
                const miles = (gpsState.meters || 0) / 1609.344;
                const trip = {
                    id: Date.now().toString(),
                    date: new Date().toISOString().split('T')[0],
                    start: gpsState.start ? `${gpsState.start.lat.toFixed(6)}, ${gpsState.start.lng.toFixed(6)}` : '',
                    end: gpsState.last ? `${gpsState.last.lat.toFixed(6)}, ${gpsState.last.lng.toFixed(6)}` : '',
                    miles: miles.toFixed(2),
                    updatedAt: Date.now()
                };
                await DataManager.save('notary_mileage', trip);
                setMileage(await DataManager.get('notary_mileage'));
                setGpsState({ tracking:false, starting:false, watchId:null, start:null, last:null, meters:0, startedAt:null });
                showToast('GPS trip saved');
                track('gps_mileage_stop_save', { miles: trip.miles });
            };

return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    {/* STATUS SECTION */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                                <i className="fas fa-chart-line text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold theme-text">Finances</h3>
                                <p className="text-xs theme-text-muted">Track expenses and mileage for tax time</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {activeTab === 'mileage' && (
                                gpsState.tracking ? (
                                    <div className="flex items-center gap-2">
                                        <div className="px-4 py-2 rounded-lg bg-green-50 border-2 border-green-500 text-green-700 font-semibold flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                            <span className="text-sm">Tracking: {(gpsState.meters / 1609.344).toFixed(2)} mi</span>
                                        </div>
                                        <button onClick={stopGpsAndSave} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-200">
                                            <i className="fas fa-stop mr-2"></i>Stop & Save
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={startGps} disabled={gpsState.starting} className={`bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg transition-all duration-200 ${gpsState.starting ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                        <i className={`fas ${gpsState.starting ? 'fa-spinner fa-spin' : 'fa-location-arrow'} mr-2`}></i>{gpsState.starting ? 'Starting…' : 'Start Trip'}
                                    </button>
                                )
                            )}
                            <button onClick={() => exportTax(activeTab)} className="px-3 py-2 rounded-lg border theme-border theme-surface theme-text text-sm transition-all duration-200 hover:-translate-y-0.5"><i className="fas fa-file-csv mr-2"></i>Export CSV</button>
                            <button onClick={() => activeTab === 'expenses' ? setShowExpenseModal(true) : setShowMileageModal(true)} className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                                <i className="fas fa-plus mr-2"></i>{activeTab === 'expenses' ? 'Add Expense' : 'Add Trip'}
                            </button>
                        </div>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">YTD Expenses</p>
                                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                    <i className="fas fa-receipt text-red-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-red-600">${ytdExpenses.toLocaleString()}</p>
                            <p className="text-xs theme-text-muted mt-1">{expenses.length} {expenses.length === 1 ? 'transaction' : 'transactions'}</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">This Month</p>
                                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                                    <i className="fas fa-calendar-alt text-amber-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-amber-600">${thisMonthTotal.toLocaleString()}</p>
                            <p className="text-xs theme-text-muted mt-1">{thisMonthExpenses.length} expenses</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">YTD Mileage</p>
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <i className="fas fa-route text-blue-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-blue-600">{ytdMileage.toLocaleString()} mi</p>
                            <p className="text-xs theme-text-muted mt-1">{mileage.length} {mileage.length === 1 ? 'trip' : 'trips'}</p>
                        </div>
                    </div>

                    {/* CONTEXT SECTION */}
                    <div className="inline-flex theme-app-bg border theme-border p-1 rounded-lg">
                        <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'expenses' ? 'theme-surface theme-text shadow-sm' : 'theme-text-muted'}`}>Expenses</button>
                        <button onClick={() => setActiveTab('mileage')} className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${activeTab === 'mileage' ? 'theme-surface theme-text shadow-sm' : 'theme-text-muted'}`}>Mileage</button>
                    </div>

                    {/* ACTION SECTION */}
                    {activeTab === 'expenses' ? (
                        expenses.length === 0 ? (
                            <div className="theme-surface theme-border border rounded-2xl p-10 text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
                                    <i className="fas fa-receipt theme-text-muted text-2xl"></i>
                                </div>
                                <h4 className="theme-text text-lg font-semibold mb-2">No expenses logged yet</h4>
                                <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">Track your business expenses here for tax deductions. Every receipt counts!</p>
                                <button onClick={() => setShowExpenseModal(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
                                    <i className="fas fa-plus mr-2"></i>Add Expense
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="card card-tight" style={{marginBottom:12}}>
                                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:10, flexWrap:'wrap'}}>
                                        <div className="theme-text" style={{fontWeight:900}}>
                                            Bulk actions <span className="theme-text-muted" style={{fontWeight:700}}>{selectedExpenseIds.length} selected</span>
                                        </div>
                                        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
                                            <button className="btn btn-secondary" style={{height:36}} onClick={() => { allExpensesSelected ? clearExpenseSelection() : selectAllExpenses(); }}>
                                                {allExpensesSelected ? 'Clear All' : 'Select All'}
                                            </button>
                                            <button className="btn btn-secondary" style={{height:36}} disabled={selectedExpenseIds.length===0} onClick={exportSelectedExpensesCSV}>
                                                <i className="fas fa-file-csv mr-2"></i>Export Selected
                                            </button>
                                            <button className="btn btn-secondary" style={{height:36}} disabled={selectedExpenseIds.length===0} onClick={deleteSelectedExpenses}>
                                                <i className="fas fa-trash mr-2"></i>Delete Selected
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="theme-surface theme-border border rounded-2xl divide-y theme-border">
                                {expenses.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:theme-surface-muted transition-all duration-200">
                                        <div className="flex items-center gap-3">
                                            <input type="checkbox" checked={selectedExpenseIds.includes(item.id)} onChange={()=>toggleExpenseSelected(item.id)} />
                                        <div className="min-w-0">
                                            <p className="text-xs theme-text-muted">{item.date}</p>
                                            <p className="font-semibold theme-text truncate"><i className={`fas ${categoryIcon(item.category)} mr-2`}></i>{item.category || 'General'}</p>
                                            <p className="text-sm theme-text-muted truncate">{item.desc || 'No description'}</p>
                                        </div>
                                    </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <p className="font-bold" style={{ color: '#dc2626' }}>-${parseFloat(item.amount || 0).toFixed(2)}</p>
                                            <button onClick={() => startEditExpense(item)} className="theme-icon-btn" title="Edit"><i className="fas fa-pen"></i></button>
                                            <button onClick={() => deleteExpense(item.id)} className="theme-icon-btn" title="Delete"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            </>
                        )
                    ) : (
                        mileage.length === 0 ? (
                            <div className="theme-surface theme-border border rounded-2xl p-10 text-center">
                                <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
                                    <i className="fas fa-route theme-text-muted text-2xl"></i>
                                </div>
                                <h4 className="theme-text text-lg font-semibold mb-2">No mileage trips logged yet</h4>
                                <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">Track deductible business mileage here. Use GPS tracking for automatic logging!</p>
                                <button onClick={() => setShowMileageModal(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
                                    <i className="fas fa-plus mr-2"></i>Add Mileage Trip
                                </button>
                            </div>
                        ) : (
                            <div className="theme-surface theme-border border rounded-2xl divide-y theme-border">
                                {mileage.map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between gap-3 hover:theme-surface-muted transition-all duration-200">
                                        <div className="min-w-0">
                                            <p className="text-xs theme-text-muted">{item.date}</p>
                                            <p className="font-semibold theme-text truncate">{item.start || 'Start'} <i className="fas fa-arrow-right mx-2"></i> {item.end || 'End'}</p>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <p className="font-bold" style={{ color: 'var(--accent-color)' }}>{parseFloat(item.miles || 0).toFixed(2)} mi</p>
                                            <button onClick={() => startEditMileage(item)} className="theme-icon-btn" title="Edit"><i className="fas fa-pen"></i></button>
                                            <button onClick={() => deleteMileage(item.id)} className="theme-icon-btn" title="Delete"><i className="fas fa-trash"></i></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {showExpenseModal && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <form onSubmit={saveExpense} className="w-full max-w-xl theme-surface rounded-2xl border theme-border shadow-2xl p-6 space-y-4">
                                <div className="flex justify-between items-center"><h4 className="text-xl font-bold theme-text">{editingExpense ? "Edit Expense" : "Add Expense"}</h4><button type="button" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }} className="theme-text-muted"><i className="fas fa-times"></i></button></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="date" type="date" required defaultValue={editingExpense?.date || new Date().toISOString().split("T")[0]} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="category" placeholder="Category (Travel, Supplies...)" required defaultValue={editingExpense?.category || ""} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="desc" placeholder="Description" defaultValue={editingExpense?.desc || ""} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2" />
                                    <input name="amount" type="number" step="0.01" placeholder="Amount" required defaultValue={editingExpense?.amount || ""} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                </div>
                                <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowExpenseModal(false); setEditingExpense(null); }} className="px-4 py-2 rounded-lg border theme-border">Cancel</button><button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Save Expense</button></div>
                            </form>
                        </div>
                    )}

                    {showMileageModal && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <form onSubmit={saveMileage} className="w-full max-w-xl theme-surface rounded-2xl border theme-border shadow-2xl p-6 space-y-4">
                                <div className="flex justify-between items-center"><h4 className="text-xl font-bold theme-text">{editingMileage ? "Edit Mileage Trip" : "Add Mileage Trip"}</h4><button type="button" onClick={() => { setShowMileageModal(false); setEditingMileage(null); }} className="theme-text-muted"><i className="fas fa-times"></i></button></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="date" type="date" required defaultValue={editingMileage?.date || new Date().toISOString().split("T")[0]} className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="miles" type="number" step="0.01" required placeholder="Miles" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="start" placeholder="Start Location" required className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2" />
                                    <input name="end" placeholder="End Location" required className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text md:col-span-2" />
                                </div>
                                <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowMileageModal(false); setEditingMileage(null); }} className="px-4 py-2 rounded-lg border theme-border">Cancel</button><button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Save Trip</button></div>
                            </form>
                        </div>
                    )}
                </div>
            );
        };

        const AgencyManagement = ({ appointments }) => {
            const [team, setTeam] = useState([]);
            const [assignments, setAssignments] = useState([]);
            const [showForm, setShowForm] = useState(false);

            useEffect(() => {
                const load = async () => {
                    setTeam(await DataManager.get('notary_team'));
                    setAssignments(await DataManager.get('notary_assignments'));
                };
                load();
            }, []);

            const safeAppointments = Array.isArray(appointments) ? appointments : [];
            const openJobs = safeAppointments.filter(appt => ['Scheduled', 'Completed'].includes(appt.status));
            const paidRevenue = safeAppointments.filter(appt => appt.status === 'Paid').reduce((sum, appt) => sum + parseFloat(appt.fee || 0), 0);

            const handleAddNotary = async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await DataManager.save('notary_team', {
                    id: Date.now().toString(),
                    name: fd.get('name'),
                    email: fd.get('email'),
                    region: fd.get('region') || 'Unassigned',
                    status: fd.get('status') || 'Available'
                });
                setTeam(await DataManager.get('notary_team'));
                setShowForm(false);
                showToast('Team Member Added');
            };

            const handleAssign = async (appointmentId, notaryId) => {
                if (!notaryId) return;
                await DataManager.save('notary_assignments', {
                    id: `${appointmentId}-${notaryId}`,
                    appointmentId,
                    notaryId,
                    assignedAt: new Date().toISOString()
                });
                setAssignments(await DataManager.get('notary_assignments'));
                showToast('Dispatch Updated');
            };

            const assignedName = (apptId) => {
                const a = assignments.find(item => item.appointmentId === apptId);
                if (!a) return 'Unassigned';
                return team.find(t => t.id === a.notaryId)?.name || 'Unassigned';
            };

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-2xl font-bold theme-text">Team Dispatch</h3>
                            <p className="theme-text-muted text-sm">Coordinate multi-notary workflows and assignments from one control panel.</p>
                        </div>
                        <button onClick={() => setShowForm(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold"><i className="fas fa-user-plus mr-2"></i>Add Notary</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="theme-surface theme-border border rounded-xl p-4"><p className="text-xs uppercase theme-text-muted">Team Size</p><p className="text-2xl font-bold theme-text mt-2">{team.length}</p></div>
                        <div className="theme-surface theme-border border rounded-xl p-4"><p className="text-xs uppercase theme-text-muted">Open Jobs</p><p className="text-2xl font-bold theme-text mt-2">{openJobs.length}</p></div>
                        <div className="theme-surface theme-border border rounded-xl p-4"><p className="text-xs uppercase theme-text-muted">Paid Revenue</p><p className="text-2xl font-bold theme-text mt-2">${paidRevenue.toLocaleString()}</p></div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        <div className="xl:col-span-1 theme-surface theme-border border rounded-2xl p-4">
                            <h4 className="font-semibold theme-text mb-3">Notary Team</h4>
                            {team.length === 0 ? <p className="theme-text-muted text-sm">No team members yet.</p> : (
                                <div className="space-y-2">
                                    {team.map(member => (
                                        <div key={member.id} className="theme-surface-muted border theme-border rounded-xl p-3">
                                            <p className="font-semibold theme-text truncate">{member.name}</p>
                                            <p className="text-xs theme-text-muted truncate">{member.email}</p>
                                            <p className="text-xs mt-1 theme-text-muted">{member.region} • {member.status}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="xl:col-span-2 theme-surface theme-border border rounded-2xl p-4">
                            <h4 className="font-semibold theme-text mb-3">Dispatch Queue</h4>
                            {openJobs.length === 0 ? <p className="theme-text-muted text-sm">No active jobs to assign.</p> : (
                                <div className="space-y-3">
                                    {openJobs.map(appt => (
                                        <div key={appt.id} className="border theme-border rounded-xl p-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="font-semibold theme-text truncate">{appt.clientName || 'Client'}</p>
                                                <p className="text-xs theme-text-muted truncate">{appt.type || 'Notary Service'} • {appt.date} {appt.time || ''}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs theme-text-muted">Assigned: {assignedName(appt.id)}</span>
                                                <select onChange={(e) => handleAssign(appt.id, e.target.value)} className="px-2 py-1.5 rounded-lg border theme-border theme-app-bg theme-text text-sm">
                                                    <option value="">Assign</option>
                                                    {team.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {showForm && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <form onSubmit={handleAddNotary} className="w-full max-w-xl theme-surface border theme-border rounded-2xl shadow-2xl p-6 space-y-4">
                                <div className="flex justify-between items-center"><h4 className="text-xl font-bold theme-text">Add Team Member</h4><button type="button" onClick={() => setShowForm(false)} className="theme-text-muted"><i className="fas fa-times"></i></button></div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="name" required placeholder="Full Name" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="email" required placeholder="Email" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="region" placeholder="Region" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <select name="status" className="px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"><option>Available</option><option>Busy</option></select>
                                </div>
                                <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border theme-border">Cancel</button><button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Add Member</button></div>
                            </form>
                        </div>
                    )}
                </div>
            );
        };

        const Credentials = ({ onUpdate }) => {
            const [creds, setCreds] = useState([]);
            const [showForm, setShowForm] = useState(false);
            const [editingCred, setEditingCred] = useState(null);

            useEffect(() => { DataManager.get('notary_credentials').then(setCreds); }, []);

            const handleSave = async (e) => {
                e.preventDefault();
                const fd = new FormData(e.target);
                await DataManager.save('notary_credentials', {
                    id: editingCred?.id || Date.now().toString(),
                    name: fd.get('name'),
                    number: fd.get('number'),
                    authority: fd.get('authority'),
                    expiry: fd.get('expiry')
                });
                setShowForm(false);
                setEditingCred(null);
                setCreds(await DataManager.get('notary_credentials'));
                if (onUpdate) onUpdate();
                showToast(editingCred ? 'Credential Updated' : 'Credential Saved');
            };

            const handleDelete = async (id) => {
                await DataManager.delete('notary_credentials', id);
                setCreds(await DataManager.get('notary_credentials'));
                if (onUpdate) onUpdate();
                showToast('Credential Deleted', 'error');
            };

            const now = new Date();
            const statusMeta = (expiry) => {
                const exp = new Date(expiry);
                if (isNaN(exp.getTime())) return { label: 'Unknown', days: 999, bar: '#94a3b8', cardBorder: 'var(--border-color)' };
                const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
                if (days < 0) return { label: 'Expired', days, bar: '#ef4444', cardBorder: '#ef4444' };
                if (days <= 30) return { label: 'Critical', days, bar: '#dc2626', cardBorder: 'var(--border-color)' };
                if (days <= 60) return { label: 'Expiring Soon', days, bar: '#f59e0b', cardBorder: 'var(--border-color)' };
                return { label: 'Active', days, bar: '#22c55e', cardBorder: 'var(--border-color)' };
            };

            // STATUS: Calculate key metrics
            const activeCreds = creds.filter(c => {
                const meta = statusMeta(c.expiry);
                return meta.label === 'Active';
            });
            const expiringSoon = creds.filter(c => {
                const meta = statusMeta(c.expiry);
                return meta.label === 'Expiring Soon' || meta.label === 'Critical';
            });
            const expired = creds.filter(c => {
                const meta = statusMeta(c.expiry);
                return meta.label === 'Expired';
            });
            const complianceStatus = expired.length > 0 ? 'critical' : expiringSoon.length > 0 ? 'warning' : 'healthy';

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    {/* STATUS SECTION */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                                <i className="fas fa-shield-alt text-white"></i>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold theme-text">Compliance & Credentials</h3>
                                <p className="text-xs theme-text-muted">Monitor every expiration before it becomes a risk</p>
                            </div>
                        </div>
                        <button onClick={() => { setEditingCred(null); setShowForm(true); }} className="theme-accent-btn px-4 py-2.5 rounded-xl font-semibold shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
                            <i className="fas fa-plus mr-2"></i>Add Credential
                        </button>
                    </div>

                    {/* Status Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Active</p>
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <i className="fas fa-check-circle text-emerald-600 text-sm"></i>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-emerald-600">{activeCreds.length}</p>
                            <p className="text-xs theme-text-muted mt-1">{activeCreds.length === 1 ? 'credential' : 'credentials'} valid</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Expiring Soon</p>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${expiringSoon.length > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                    <i className={`fas fa-exclamation-triangle text-sm ${expiringSoon.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}></i>
                                </div>
                            </div>
                            <p className={`text-2xl font-bold ${expiringSoon.length > 0 ? 'text-amber-600' : 'theme-text-muted'}`}>{expiringSoon.length}</p>
                            <p className="text-xs theme-text-muted mt-1">Need renewal (≤60 days)</p>
                        </div>
                        <div className="status-card theme-surface theme-border border rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-semibold uppercase tracking-wide theme-text-muted">Status</p>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                    complianceStatus === 'critical' ? 'bg-red-50' :
                                    complianceStatus === 'warning' ? 'bg-amber-50' : 'bg-emerald-50'
                                }`}>
                                    <i className={`fas ${complianceStatus === 'healthy' ? 'fa-shield-check' : 'fa-triangle-exclamation'} text-sm ${
                                        complianceStatus === 'critical' ? 'text-red-600' :
                                        complianceStatus === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                                    }`}></i>
                                </div>
                            </div>
                            <p className={`text-lg font-bold ${
                                complianceStatus === 'critical' ? 'text-red-600' :
                                complianceStatus === 'warning' ? 'text-amber-600' : 'text-emerald-600'
                            }`}>
                                {complianceStatus === 'critical' ? 'Critical' : complianceStatus === 'warning' ? 'Attention' : 'Healthy'}
                            </p>
                            <p className="text-xs theme-text-muted mt-1">
                                {complianceStatus === 'critical' ? 'Expired credentials' :
                                 complianceStatus === 'warning' ? 'Action needed soon' : 'All credentials valid'}
                            </p>
                        </div>
                    </div>

                    {/* ACTION SECTION */}
                    {creds.length === 0 ? (
                        <div className="theme-surface theme-border border rounded-2xl p-10 text-center">
                            <div className="w-16 h-16 mx-auto rounded-2xl theme-surface-muted flex items-center justify-center mb-4">
                                <i className="fas fa-shield-alt theme-text-muted text-2xl"></i>
                            </div>
                            <h4 className="theme-text text-lg font-semibold mb-2">No credentials added</h4>
                            <p className="theme-text-muted text-sm mb-4 max-w-md mx-auto">Track your notary commission, bond, E&O insurance, and certifications here to stay compliant and never miss a renewal.</p>
                            <button onClick={() => setShowForm(true)} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">
                                <i className="fas fa-plus mr-2"></i>Add Credential
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {creds.map(c => {
                                const meta = statusMeta(c.expiry);
                                return (
                                    <div key={c.id} className="theme-surface border rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md" style={{ borderColor: meta.cardBorder }}>
                                        <div className="flex items-start justify-between">
                                            <div className="w-10 h-10 rounded-xl theme-surface-muted flex items-center justify-center"><i className="fas fa-certificate theme-text-muted"></i></div>
                                            <div className="flex gap-2">
                                                <button onClick={() => { setEditingCred(c); setShowForm(true); }} className="w-8 h-8 rounded-lg border theme-border theme-text-muted"><i className="fas fa-ellipsis-h"></i></button>
                                                <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg border theme-border theme-text-muted"><i className="fas fa-trash"></i></button>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <p className="text-lg font-bold theme-text">{c.name}</p>
                                            <p className="text-sm theme-text-muted mt-1">Expires: {c.expiry || '—'}</p>
                                        </div>
                                        <div className="mt-4">
                                            <div className="h-1.5 rounded-full" style={{ backgroundColor: 'rgba(148,163,184,0.25)' }}>
                                                <div className={`h-full rounded-full ${meta.label === 'Expiring Soon' ? 'animate-pulse' : ''}`} style={{ width: meta.label === 'Expired' ? '100%' : meta.label === 'Expiring Soon' ? '65%' : '35%', backgroundColor: meta.bar }}></div>
                                            </div>
                                            <span className={`mt-2 inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${meta.label === 'Expiring Soon' ? 'animate-pulse' : ''}`} style={{ backgroundColor: 'rgba(15,23,42,0.08)', color: meta.bar }}>
                                                {meta.label}{meta.days < 0 ? '' : ` • ${meta.days} days`}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {showForm && (
                        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                            <form onSubmit={handleSave} className="w-full max-w-xl theme-surface rounded-2xl border theme-border shadow-2xl p-6 space-y-4">
                                <div className="flex justify-between items-center"><h4 className="text-xl font-bold theme-text">{editingCred ? 'Edit Credential' : 'Add Credential'}</h4><button type="button" onClick={() => { setShowForm(false); setEditingCred(null); }} className="theme-text-muted"><i className="fas fa-times"></i></button></div>
                                <input name="name" defaultValue={editingCred?.name || ''} placeholder="Credential Name (e.g., E&O Insurance)" required className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input name="number" defaultValue={editingCred?.number || ''} placeholder="Credential/Policy Number" className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                    <input name="authority" defaultValue={editingCred?.authority || ''} placeholder="Issuing Authority" className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                </div>
                                <input name="expiry" defaultValue={editingCred?.expiry || ''} type="date" required className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                                <div className="flex justify-end gap-2"><button type="button" onClick={() => { setShowForm(false); setEditingCred(null); }} className="px-4 py-2 rounded-lg border theme-border">Cancel</button><button className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Save Credential</button></div>
                            </form>
                        </div>
                    )}
                </div>
            );
        };

        const TrainerModule = ({ stateDB, courseMods, user, onUpgrade }) => {
            const [selectedStateKey, setSelectedStateKey] = useState('CA');
            const [mode, setMode] = useState('study');
            const [messages, setMessages] = useState([{ role: 'assistant', content: "Hello! I am your AI Coach. Ask me anything about notary laws." }]);
            const [input, setInput] = useState('');
            const [loading, setLoading] = useState(false);
            const scrollRef = useRef(null);

            useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

            const sendMessage = async () => {
                if (!input.trim()) return;
                const newMsgs = [...messages, { role: 'user', content: input }];
                setMessages(newMsgs);
                setInput('');
                setLoading(true);
                setTimeout(() => {
                    setMessages([...newMsgs, { role: 'assistant', content: "This is a simulated AI response. Please configure your API Key in Settings to enable the full AI Coach experience." }]);
                    setLoading(false);
                }, 700);
            };

            return (
                <div className="p-6 pb-24 font-sans h-full flex flex-col gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h3 className="text-2xl font-bold theme-text">AI Trainer</h3>
                            <p className="theme-text-muted text-sm">Compliance study and coaching workspace.</p>
                        </div>
                        <div className="flex gap-2">
                            <select value={selectedStateKey} onChange={e => setSelectedStateKey(e.target.value)} className="px-3 py-2 rounded-lg border theme-border theme-app-bg theme-text text-sm">
                                {Object.keys(stateDB).map(k => <option key={k} value={k}>{stateDB[k].state}</option>)}
                            </select>
                            <div className="inline-flex border theme-border rounded-lg p-1">
                                <button onClick={() => setMode('study')} className={`px-3 py-1.5 rounded-md text-sm ${mode === 'study' ? 'theme-surface theme-text' : 'theme-text-muted'}`}>Study</button>
                                <button onClick={() => setMode('chat')} className={`px-3 py-1.5 rounded-md text-sm ${mode === 'chat' ? 'theme-surface theme-text' : 'theme-text-muted'}`}>Chat</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
                        <div className="lg:col-span-1 theme-surface theme-border border rounded-2xl p-4 overflow-auto">
                            <h4 className="font-semibold theme-text mb-2">State Snapshot</h4>
                            <p className="text-sm theme-text-muted mb-3">Quick reference for {stateDB[selectedStateKey]?.state}.</p>
                            <ul className="space-y-2 text-sm theme-text-muted">
                                <li><i className="fas fa-receipt mr-2"></i>Acknowledgment Fee: ${stateDB[selectedStateKey]?.fees?.acknowledgment || '—'}</li>
                                <li><i className="fas fa-file-signature mr-2"></i>Jurat Fee: ${stateDB[selectedStateKey]?.fees?.jurat || '—'}</li>
                                <li><i className="fas fa-id-card mr-2"></i>ID Rules: {stateDB[selectedStateKey]?.id_rules?.slice(0, 55) || '—'}...</li>
                            </ul>
                        </div>

                        <div className="lg:col-span-2 theme-surface theme-border border rounded-2xl flex flex-col min-h-0">
                            <div className="p-4 border-b theme-border">
                                <h4 className="font-semibold theme-text">AI Coach Conversation</h4>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.map((m, i) => (
                                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'theme-accent-btn text-white' : 'theme-surface-muted theme-text'}`}>{m.content}</div>
                                    </div>
                                ))}
                                {loading && <p className="text-xs theme-text-muted">Thinking...</p>}
                                <div ref={scrollRef}></div>
                            </div>
                            <div className="p-4 border-t theme-border flex gap-2">
                                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="Ask AI Coach..." className="flex-1 px-3 py-2 rounded-lg border theme-border theme-app-bg theme-text" />
                                <button onClick={sendMessage} className="theme-accent-btn px-4 rounded-lg">Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const AdminPanel = ({ stateDB }) => {
            const [activeTab, setActiveTab] = useState('states');
            const [selectedState, setSelectedState] = useState('CA');
            const [ackFee, setAckFee] = useState(stateDB['CA']?.fees?.acknowledgment || '');

            useEffect(() => {
                setAckFee(stateDB[selectedState]?.fees?.acknowledgment || '');
            }, [selectedState, stateDB]);

            const saveStateChanges = () => showToast('State configuration saved (demo).');

            return (
                <div className="p-4 sm:p-6 pb-24 space-y-5 font-sans max-w-6xl mx-auto w-full">
                    <div className="theme-surface border border-red-300 rounded-xl p-4 bg-red-500/10">
                        <h3 className="font-bold text-red-600">Admin Control Center</h3>
                        <p className="text-sm theme-text-muted mt-1">Manage legal data, curriculum, and system-wide compliance content.</p>
                    </div>

                    <div className="inline-flex border theme-border rounded-lg p-1">
                        <button onClick={() => setActiveTab('states')} className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'states' ? 'theme-surface theme-text' : 'theme-text-muted'}`}>State Rules</button>
                        <button onClick={() => setActiveTab('curriculum')} className={`px-3 py-1.5 rounded-md text-sm ${activeTab === 'curriculum' ? 'theme-surface theme-text' : 'theme-text-muted'}`}>Curriculum</button>
                    </div>

                    {activeTab === 'states' ? (
                        <div className="theme-surface theme-border border rounded-2xl p-5 space-y-4 max-w-2xl">
                            <div>
                                <label className="text-xs font-bold theme-text-muted uppercase">Select State</label>
                                <select className="w-full mt-1 px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" value={selectedState} onChange={e => setSelectedState(e.target.value)}>
                                    {Object.keys(stateDB).map(k => <option key={k} value={k}>{stateDB[k].state}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold theme-text-muted uppercase">Acknowledgment Fee</label>
                                <input value={ackFee} onChange={(e) => setAckFee(e.target.value)} className="w-full mt-1 px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" />
                            </div>
                            <button onClick={saveStateChanges} className="theme-accent-btn px-4 py-2 rounded-lg font-semibold">Save Changes</button>
                        </div>
                    ) : (
                        <div className="theme-surface theme-border border rounded-2xl p-5 max-w-2xl">
                            <h4 className="font-semibold theme-text">Curriculum Editor</h4>
                            <p className="text-sm theme-text-muted mt-1">Use this panel to publish updated AI Coach lessons and exam prompts.</p>
                            <textarea rows={6} className="w-full mt-4 px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text" defaultValue="Module update notes..." />
                            <button onClick={() => showToast('Curriculum published (demo).')} className="mt-3 theme-accent-btn px-4 py-2 rounded-lg font-semibold">Publish Curriculum</button>
                        </div>
                    )}
                </div>
            );
        };

        
        const WorkspaceShell = ({ user, setUser, theme, setTheme, onLogout }) => {
            const isDesktop = useIsDesktop();
            const [windows, setWindows] = React.useState(() => ([
                { id: 'win_dashboard', appKey:'dashboard', title:'Dashboard', minimized:false, x: 80, y: 80, w: 860, h: 560, z: 10 },
            ]));
            const [activeId, setActiveId] = React.useState('win_dashboard');
            const nextZ = React.useRef(20);

            const bringToFront = (id) => {
                setWindows(prev => prev.map(w => w.id===id ? ({...w, minimized:false, z: (nextZ.current+=1)}) : w));
                setActiveId(id);
            };
            const minimize = (id) => setWindows(prev => prev.map(w => w.id===id ? ({...w, minimized:true}) : w));
            const closeWin = (id) => {
                setWindows(prev => prev.filter(w => w.id !== id));
                setActiveId(prev => (prev===id ? null : prev));
            };

            const openApp = (appKey) => {
                setWindows(prev => {
                    const existing = prev.find(w => w.appKey===appKey);
                    if(existing){ setTimeout(()=>bringToFront(existing.id), 0); return prev; }
                    const titleMap = {
                        dashboard:'Dashboard', schedule:'Schedule', clients:'Clients', journal:'eJournal',
                        finances:'Finances', credentials:'Credentials', training:'Training', settings:'Settings'
                    };
                    const id = `win_${appKey}`;
                    const start = { id, appKey, title: titleMap[appKey]||appKey, minimized:false, x: 110, y: 90, w: 900, h: 600, z: (nextZ.current+=1) };
                    setTimeout(()=>setActiveId(id), 0);
                    return prev.concat(start);
                });
            };

            const snapWithinBounds = (x,y,w,h) => {
                const pad = 12;
                const maxW = window.innerWidth - pad;
                const maxH = window.innerHeight - 64 - pad;
                return {
                    x: Math.max(pad, Math.min(x, maxW - w)),
                    y: Math.max(pad, Math.min(y, maxH - h)),
                };
            };

            const startDrag = (e, id) => {
                e.preventDefault();
                bringToFront(id);
                const win = windows.find(w=>w.id===id);
                if(!win) return;
                const startX = e.clientX, startY = e.clientY;
                const origX = win.x, origY = win.y;

                const onMove = (ev) => {
                    const dx = ev.clientX - startX;
                    const dy = ev.clientY - startY;
                    setWindows(prev => prev.map(w=>{
                        if(w.id!==id) return w;
                        const pos = snapWithinBounds(origX+dx, origY+dy, w.w, w.h);
                        return { ...w, x: pos.x, y: pos.y };
                    }));
                };
                const onUp = () => {
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                };
                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            };

            const renderApp = (appKey) => {
                switch(appKey){
                    case 'dashboard': return <Dashboard user={user} />;
                    case 'schedule': return <Schedule user={user} />;
                    case 'clients': return <Clients user={user} />;
                    case 'journal': return <Journal user={user} />;
                    case 'finances': return <Finances user={user} />;
                    case 'credentials': return <Credentials user={user} />;
                    case 'training': return <TrainingHub user={user} />;
                    case 'settings': return <WorkspaceSettings user={user} setUser={setUser} theme={theme} setTheme={setTheme} onLogout={onLogout} />;
                    default: return <Dashboard user={user} />;
                }
            };

            if(!isDesktop){
                return (
                    <div className="p-4">
                        <div className="card">
                            <div className="font-bold text-lg mb-1 theme-text">Workspace Mode is desktop-only</div>
                            <div className="theme-text-muted mb-3">On mobile, we use the native layout.</div>
                            <button className="btn btn-primary" onClick={() => { setWorkspaceMode(false); window.location.reload(); }}>Exit Workspace</button>
                        </div>
                    </div>
                );
            }

            const icons = [
                { key:'dashboard', label:'Dashboard', icon:'fas fa-chart-line' },
                { key:'schedule', label:'Schedule', icon:'fas fa-calendar' },
                { key:'clients', label:'Clients', icon:'fas fa-users' },
                { key:'journal', label:'eJournal', icon:'fas fa-book' },
                { key:'finances', label:'Finances', icon:'fas fa-receipt' },
                { key:'credentials', label:'Credentials', icon:'fas fa-shield-halved' },
                { key:'training', label:'Training', icon:'fas fa-graduation-cap' },
                { key:'settings', label:'Settings', icon:'fas fa-gear' },
            ];

            return (
                <div style={{minHeight:'100vh'}} className="theme-app-bg theme-text">
                    <div style={{position:'fixed', inset:0,
                        background:'radial-gradient(1200px 800px at 20% 10%, rgba(99,102,241,.18), transparent 60%), radial-gradient(900px 700px at 90% 80%, rgba(124,58,237,.16), transparent 55%), radial-gradient(700px 500px at 50% 60%, rgba(14,165,233,.10), transparent 60%)'
                    }} />
                    <div style={{position:'relative', padding:24, paddingBottom:84}}>
                        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))', gap:16, maxWidth:760}}>
                            {icons.map(ic => (
                                <button key={ic.key} onClick={() => openApp(ic.key)}
                                    className="card"
                                    style={{textAlign:'left', cursor:'pointer', padding:14, borderRadius:18, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.10)'}}>
                                    <div style={{display:'flex', alignItems:'center', gap:10}}>
                                        <div style={{width:38, height:38, borderRadius:14, display:'grid', placeItems:'center', background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.10)'}}>
                                            <i className={ic.icon}></i>
                                        </div>
                                        <div style={{fontWeight:900}}>{ic.label}</div>
                                    </div>
                                </button>
                            ))}
                        </div>

                        {windows.filter(w=>!w.minimized).sort((a,b)=>a.z-b.z).map(win => (
                            <div key={win.id} onMouseDown={() => bringToFront(win.id)}
                                style={{
                                    position:'absolute', left: win.x, top: win.y, width: win.w, height: win.h,
                                    borderRadius: 20, background:'rgba(15, 23, 42, .72)',
                                    border:'1px solid rgba(255,255,255,.10)', boxShadow:'0 18px 60px rgba(0,0,0,.45)',
                                    overflow:'hidden', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex: win.z
                                }}>
                                <div onMouseDown={(e)=>startDrag(e, win.id)}
                                    style={{
                                        height:44, display:'flex', alignItems:'center', justifyContent:'space-between',
                                        padding:'0 12px', borderBottom:'1px solid rgba(255,255,255,.10)',
                                        background:'rgba(255,255,255,.04)', cursor:'grab'
                                    }}>
                                    <div style={{display:'flex', alignItems:'center', gap:10, fontWeight:900}}>
                                        <span style={{width:10,height:10,borderRadius:999, background: win.id===activeId ? 'rgba(99,102,241,.95)' : 'rgba(255,255,255,.25)'}} />
                                        {win.title}
                                    </div>
                                    <div style={{display:'flex', gap:8}}>
                                        <button className="btn btn-secondary" style={{height:30, padding:'0 10px'}} onClick={(e)=>{ e.stopPropagation(); minimize(win.id); }}>
                                            <i className="fas fa-window-minimize"></i>
                                        </button>
                                        <button className="btn btn-secondary" style={{height:30, padding:'0 10px'}} onClick={(e)=>{ e.stopPropagation(); closeWin(win.id); }}>
                                            <i className="fas fa-xmark"></i>
                                        </button>
                                    </div>
                                </div>
                                <div style={{height:'calc(100% - 44px)', overflow:'auto'}}>
                                    <div style={{padding:14}}>
                                        {renderApp(win.appKey)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{
                        position:'fixed', left:16, right:16, bottom:16, height:56, borderRadius: 20,
                        background:'rgba(15, 23, 42, .80)', border:'1px solid rgba(255,255,255,.10)',
                        boxShadow:'0 12px 40px rgba(0,0,0,.45)', display:'flex', alignItems:'center', justifyContent:'space-between',
                        padding:'0 12px', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', zIndex: 99999
                    }}>
                        <div style={{display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', overflow:'hidden'}}>
                            <button className="btn btn-secondary" style={{height:36}} onClick={() => openApp('dashboard')}>
                                <i className="fas fa-layer-group mr-2"></i>Apps
                            </button>
                            {windows.map(w => (
                                <button key={w.id}
                                    className={w.id===activeId ? "btn btn-primary" : "btn btn-secondary"}
                                    style={{height:36, maxWidth:220}}
                                    onClick={() => bringToFront(w.id)}>
                                    {w.title}
                                </button>
                            ))}
                        </div>
                        <div style={{display:'flex', alignItems:'center', gap:10}}>
                            <div className="theme-text-muted" style={{fontSize:12, fontWeight:800}}>
                                {user?.plan === 'pro' ? 'PRO' : 'TRIAL'} • Workspace
                            </div>
                            <button className="btn btn-secondary" style={{height:36}} onClick={() => { setWorkspaceMode(false); window.location.reload(); }}>
                                Exit
                            </button>
                        </div>
                    </div>
                </div>
            );
        };

        const WorkspaceSettings = ({ user, setUser, theme, setTheme, onLogout }) => {
            return (
                <div className="card">
                    <div className="font-bold text-lg theme-text mb-2">Settings</div>
                    <div className="theme-text-muted mb-3">Workspace Mode uses the same data and storage as the mobile layout.</div>

                    <div className="grid md:grid-cols-2 gap-3">
                        <div className="card card-tight">
                            <div className="font-bold theme-text mb-1">Theme</div>
                            <select className="w-full px-3 py-2.5 rounded-lg border theme-border theme-app-bg theme-text"
                                value={theme}
                                onChange={(e)=>setTheme(e.target.value)}>
                                <option value="midnight">Midnight</option>
                                <option value="classic">Classic</option>
                                <option value="slate">Slate</option>
                                <option value="light">Light</option>
                            </select>
                        </div>
                        <div className="card card-tight">
                            <div className="font-bold theme-text mb-1">Workspace Mode</div>
                            <div className="theme-text-muted" style={{fontSize:13}}>Enabled (Desktop Beta)</div>
                            <button className="btn btn-secondary mt-2" onClick={() => { setWorkspaceMode(false); window.location.reload(); }}>
                                Disable Workspace Mode
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-2 flex-wrap">
                        <button className="btn btn-secondary" onClick={onLogout}>
                            <i className="fas fa-right-from-bracket mr-2"></i>Log Out
                        </button>
                    </div>
                </div>
            );
        };

const App = () => {
            const [user, setUser] = useState(() => safeParse(safeStorageGet('notary_user_profile', null), null));

            // Ensure trialEndsAt exists for free users (first run)
            useEffect(() => {
                if (!user) return;
                const plan = (user.plan || 'free');
                if (plan !== 'free') return;
                if (user.trialEndsAt) return;
                const trialEndsAt = Date.now() + (TRIAL_DAYS * 24 * 60 * 60 * 1000);
                const next = { ...user, trialEndsAt };
                setUser(next);
                try { localStorage.setItem('notary_user_profile', JSON.stringify(next)); } catch(e) {}
            }, []);

            const isTrialExpired = useMemo(() => {
                if (!user) return false;
                const plan = (user.plan || 'free');
                if (plan !== 'free') return false;
                const te = user.trialEndsAt;
                if (!te) return false;
                return Date.now() > te;
            }, [user]);
            const [currentView, setCurrentView] = useState(user ? 'dashboard' : 'landing');
            const [appointments, setAppointments] = useState([]);
            const [credentials, setCredentials] = useState([]);
            const [showMobileMenu, setShowMobileMenu] = useState(false);
            const [isCloudConnected, setIsCloudConnected] = useState(false);
            const [showPricing, setShowPricing] = useState(false);
            const [showSettings, setShowSettings] = useState(false);
            const [showOnboarding, setShowOnboarding] = useState(false);
            const [showWelcomeTour, setShowWelcomeTour] = useState(false);
            const [showAIModal, setShowAIModal] = useState(false); 
            const [showWhatsNew, setShowWhatsNew] = useState(() => !!user && !localStorage.getItem('notary_whats_new_seen_v2'));
            const [editingAppointment, setEditingAppointment] = useState(null);
            const [paywallFeature, setPaywallFeature] = useState('pro');
            const theme = 'default';

            
            // In-app Back Button Control (PWA-friendly)
            const isHandlingPopRef = useRef(false);
            const currentViewRef = useRef(currentView);
            const overlayRef = useRef({ ai:false, settings:false, pricing:false, menu:false });

            useEffect(() => { currentViewRef.current = currentView; }, [currentView]);
            useEffect(() => { overlayRef.current.ai = showAIModal; }, [showAIModal]);
            useEffect(() => { overlayRef.current.settings = showSettings; }, [showSettings]);
            useEffect(() => { overlayRef.current.pricing = showPricing; }, [showPricing]);
            useEffect(() => { overlayRef.current.menu = showMobileMenu; }, [showMobileMenu]);

            useEffect(() => {
                try { history.replaceState({ view: currentViewRef.current }, '', `#${currentViewRef.current}`); } catch (e) {}
                const onPopState = (ev) => {
                    // Close overlays/modals first (back should step "inside" the app, not exit)
                    if (overlayRef.current.ai) { setShowAIModal(false); try { history.pushState({ view: currentViewRef.current }, '', `#${currentViewRef.current}`); } catch (e) {} return; }
                    if (overlayRef.current.settings) { setShowSettings(false); try { history.pushState({ view: currentViewRef.current }, '', `#${currentViewRef.current}`); } catch (e) {} return; }
                    if (overlayRef.current.pricing) { setShowPricing(false); try { history.pushState({ view: currentViewRef.current }, '', `#${currentViewRef.current}`); } catch (e) {} return; }
                    if (overlayRef.current.menu) { setShowMobileMenu(false); try { history.pushState({ view: currentViewRef.current }, '', `#${currentViewRef.current}`); } catch (e) {} return; }

                    const v = ev && ev.state && ev.state.view ? ev.state.view : null;
                    if (v) {
                        isHandlingPopRef.current = true;
                        setCurrentView(v);
                        setTimeout(() => { isHandlingPopRef.current = false; }, 0);
                    } else {
                        // If there is no view state, keep the app open and return to dashboard.
                        isHandlingPopRef.current = true;
                        setCurrentView('dashboard');
                        try { history.pushState({ view: 'dashboard' }, '', '#dashboard'); } catch (e) {}
                        setTimeout(() => { isHandlingPopRef.current = false; }, 0);
                    }
                };
                window.addEventListener('popstate', onPopState);
                return () => window.removeEventListener('popstate', onPopState);
            }, []);

            useEffect(() => {
                if (isHandlingPopRef.current) return;
                try { history.pushState({ view: currentView }, '', `#${viewLabel(currentView)}`); } catch (e) {}
            }, [currentView]);
useEffect(() => {
                DataManager.get('notary_appointments').then(setAppointments);
                DataManager.get('notary_credentials').then(setCredentials);
                
                // Onboarding Logic Flow
                if (user) {
                    const isOnboarded = localStorage.getItem('notary_onboarded');
                    const isTourComplete = localStorage.getItem('notary_tour_completed');
                    
                    if (!isOnboarded) {
                        setShowOnboarding(true);
                    } else if (!isTourComplete) {
                        setShowWelcomeTour(true);
                    }
                }
            }, [user]);

            useEffect(() => {
                document.body.setAttribute('data-theme', theme);
            }, [theme]);

            const handleUpdateProfile = (updatedData) => {
                const newUser = { ...user, ...updatedData };
                const { mergedUser } = persistOnboardingProgress(newUser);
                setUser(mergedUser);
                localStorage.setItem('notary_user_profile', JSON.stringify(mergedUser));
                showToast("Profile Saved");
            };

            
const handleLogin = (profile) => {
    const now = Date.now();
    const plan = profile?.plan || 'free';

    // Trial setup: if no trialEndsAt exists, start a 14-day trial on first login/signup.
    // (If you already have trial data from your auth provider, keep it.)
    let trialEndsAt = profile?.trialEndsAt;
    if (!trialEndsAt && plan === 'free') {
        trialEndsAt = now + (TRIAL_DAYS * 24 * 60 * 60 * 1000);
    }

    const normalizedProfile = { ...profile, plan, trialEndsAt };

    const persisted = persistOnboardingProgress(normalizedProfile);
    const normalizedWithOnboarding = persisted.mergedUser;
    localStorage.setItem('notary_user_profile', JSON.stringify(normalizedWithOnboarding));
    setUser(normalizedWithOnboarding);
    setCurrentView('dashboard');
    // Onboarding triggers will handle the rest via useEffect
    showToast("Welcome Back!");
};

            const handleLogout = () => {
                localStorage.removeItem('notary_user_profile');
                setUser(null);
                setCurrentView('landing');
            };

const openBillingPortal = () => {
    if (!STRIPE_BILLING_PORTAL_URL) {
        showToast("Billing portal not configured. Set STRIPE_BILLING_PORTAL_URL (or wire an endpoint that creates a Stripe Customer Portal session).");
        return;
    }
    window.open(STRIPE_BILLING_PORTAL_URL, '_blank', 'noopener,noreferrer');
};

            
const handleUpgrade = (targetPlan = 'pro') => {
                try { track('upgrade_clicked', { targetPlan }); } catch(e) {}
    const planKey = String(targetPlan || 'pro').toLowerCase();
    const link = (STRIPE_PAYMENT_LINKS && STRIPE_PAYMENT_LINKS[planKey]) || STRIPE_PAYMENT_LINK;

    if (!link) {
        // Allow bypass for testing when Admin Preview is enabled
        if (adminPreviewEnabled) {
            setUser(prev => {
                const next = { ...(prev || {}) };
                next.plan = planKey;
                next.isPaid = true;
                next.paid = true;
                next.paidAt = next.paidAt || new Date().toISOString();
                // Extend trial far into the future so nothing locks during testing
                next.trialEndsAt = next.trialEndsAt || (Date.now() + 365 * 24 * 60 * 60 * 1000);
                return next;
            });
            try { saveUserProfile({ plan: planKey, isPaid: true, paid: true, paidAt: new Date().toISOString() }); } catch(e) {}
            showToast(`Admin preview: unlocked ${planKey.toUpperCase()} (Stripe bypass)`);
            return;
        }

        showToast("Stripe Checkout not configured. Add your Stripe Payment Link in STRIPE_PAYMENT_LINK / STRIPE_PAYMENT_LINKS.");
        return;
    }

    // Remember what the user tried to buy (used after Stripe redirects back in demo mode)
    localStorage.setItem('notary_pending_upgrade_plan', planKey);

    // Redirect to Stripe Checkout (Payment Link / Checkout session URL)
    window.location.href = link;
};


            const handleLockedFeature = (featureId) => {
                setPaywallFeature(featureId === 'agency' ? 'agency' : featureId);
                setCurrentView('paywall');
            };

            const handleOnboardingComplete = (selectedData) => {
                const selectedRole = selectedData.roleDesc === 'Signing Agency' ? 'agency' : 'solo';
                
                const nextUser = {
                    ...(user || {}),
                    name: selectedData.name || user?.name || 'User',
                    state: selectedData.state || 'CA',
                    role: selectedRole,
                    plan: selectedRole === 'agency' ? ((user?.plan === 'team') ? 'team' : 'free') : (user?.plan || 'free')
                };
                
                setUser(nextUser);
                localStorage.setItem('notary_user_profile', JSON.stringify(nextUser));
                localStorage.setItem('notary_onboarded','true');
                    try { track('onboarding_completed', {}); } catch(e) {}
                
                if (selectedData.apiKey) {
                    localStorage.setItem('gemini_api_key', selectedData.apiKey);
                }
                
                setShowOnboarding(false);
                
                // Show tour immediately after role selection
                setShowWelcomeTour(true);
                
                if (selectedRole === 'agency' && !hasFeatureAccess(nextUser, 'agency')) setShowPricing(true);
            };

            const handleTourComplete = () => {
                localStorage.setItem('notary_tour_completed','true');
                    try { track('tour_completed', {}); } catch(e) {}
                setShowWelcomeTour(false);
                showToast("You're all set!");
            };

            const handleSaveAppt = async (appt) => {
                await DataManager.save('notary_appointments', appt);
                setAppointments(await DataManager.get('notary_appointments'));
                setCurrentView('schedule');
                setEditingAppointment(null);
                showToast("Appointment Saved");
            };
            
            const handleEditAppt = (appt) => {
                setEditingAppointment(appt);
                setCurrentView('Add Appointment');
            };
            
            const handleAddApptWithDate = (dateStr) => {
                setEditingAppointment({ date: dateStr });
                setCurrentView('Add Appointment');
            };

            const handleMarkPaid = async (appt) => {
                const updated = { ...appt, status: 'Paid' };
                await DataManager.save('notary_appointments', updated);
                await DataManager.save('notary_journal', {
                    id: `pay-${updated.id}`,
                    date: new Date().toISOString().split('T')[0],
                    signer: updated.clientName,
                    docType: `Payment • ${updated.type || 'Notary Service'}`,
                    fee: updated.fee
                });
                setAppointments(await DataManager.get('notary_appointments'));
                showToast("Payment Recorded");
            };
            
            const handleRefresh = async () => {
                 setAppointments(await DataManager.get('notary_appointments'));
                 setCredentials(await DataManager.get('notary_credentials'));
            };

            const handleNotify = () => {
                showToast("No new notifications", "success");
            };

            const handleSyncNow = async () => {
                showToast("Syncing data...");
                await handleRefresh();
                showToast("Sync complete", "success");
            };

            const renderView = () => {
                switch(currentView) {
                    case 'landing': return <LandingPage onNavigate={() => setCurrentView('auth')} />;
                    case 'auth': return <AuthScreen onAuth={handleLogin} onBack={() => setCurrentView('landing')} />;
                    case 'dashboard': return <Dashboard appointments={appointments} credentials={credentials} setView={setCurrentView} user={user} onOpenSettings={() => setShowSettings(true)} />;
                    case 'schedule': return <Schedule appointments={appointments} setView={setCurrentView} onMarkPaid={handleMarkPaid} onEdit={handleEditAppt} onAdd={handleAddApptWithDate} />;
                    case 'Add Appointment': return <AppointmentForm onSave={handleSaveAppt} onCancel={() => { setEditingAppointment(null); setCurrentView('schedule'); }} initialData={editingAppointment} />;
                    case 'clients': return <Clients />;
                    case 'portal': return hasFeatureAccess(user, 'pro') ? <ClientPortal user={user} appointments={appointments} /> : <PaywallState featureKey='portal' onUpgrade={handleUpgrade} />;
                    case 'journal': return <Journal user={user} onUpgrade={()=>{}} />;
                    case 'finances': return <Finances user={user} />;
                    case 'credentials': return <Credentials onUpdate={handleRefresh} />;
                    case 'agency': return hasFeatureAccess(user, 'agency') ? <AgencyManagement appointments={appointments} /> : <PaywallState featureKey='agency' onUpgrade={handleUpgrade} />;
                    case 'trainer': return hasFeatureAccess(user, 'pro') ? <TrainerModule stateDB={STATE_DATABASE} courseMods={COURSE_MODULES} user={user} onUpgrade={()=>{}} /> : <PaywallState featureKey='trainer' onUpgrade={handleUpgrade} />;
                    case 'paywall': return <PaywallState featureKey={paywallFeature} onUpgrade={handleUpgrade} />;
                    case 'admin': return <AdminPanel stateDB={STATE_DATABASE} onUpdateStateDB={()=>{}} />;
                    default: return <div>Not found</div>;
                }
            };

            if (!user && currentView !== 'landing' && currentView !== 'auth') { 
                return <LandingPage onNavigate={() => setCurrentView('auth')} />; 
            }

            // Trial enforcement: lock app if trial is expired and user is still on free plan.
            if (user && isTrialExpired && currentView !== 'landing' && currentView !== 'auth') {
                return (
                    <TrialExpiredScreen
                        trialEndsAt={user.trialEndsAt}
                        onUpgrade={() => handleUpgrade('pro')}
                        onOpenBillingPortal={openBillingPortal}
                        onLogout={handleLogout}
                    />
                );
            }

            if (currentView === 'landing' || currentView === 'auth') return renderView();

            return (
                <div className="flex h-screen overflow-hidden font-sans theme-app-bg">
                    <ToastContainer />

                    {/* Hide FAB on Trainer Page to avoid overlap/redundancy */}
                    {currentView !== 'trainer' && (
                        <button onClick={() => setShowAIModal(true)} className="fab-ai bg-indigo-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl hover:bg-indigo-700 transition-transform transform hover:scale-110">
                            <i className="fas fa-robot text-2xl"></i>
                        </button>
                    )}

                    {showAIModal && <AIHelperModal onClose={() => setShowAIModal(false)} />}
                    {showPricing && <PricingModal onClose={() => setShowPricing(false)} onUpgrade={handleUpgrade} />}
                    {showSettings && <SettingsModal user={user} onClose={() => setShowSettings(false)} onSave={handleUpdateProfile} onOpenBillingPortal={openBillingPortal} />}
                    {showOnboarding && <OnboardingTour stateDB={STATE_DATABASE} onComplete={handleOnboardingComplete} />}
                    {showWelcomeTour && <WelcomeTour onComplete={handleTourComplete} />}
                    
                    {showWhatsNew && (
                        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] bg-white border border-blue-100 rounded-2xl shadow-xl p-4 font-sans">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-blue-600">What's New</p>
                                    <p className="text-sm text-gray-600 mt-1">Payments, Client Portal, Smart Mileage, Audit Journal Capture, and Team Mode are now available by plan.</p>
                                </div>
                                <button onClick={() => { localStorage.setItem('notary_whats_new_seen_v2', 'true'); setShowWhatsNew(false); }} className="text-gray-400"><i className="fas fa-times"></i></button>
                            </div>
                        </div>
                    )}
                    
                    <Sidebar 
                        currentView={viewLabel(currentView)} 
                        setView={setCurrentView} 
                        isOpen={showMobileMenu} 
                        onClose={() => setShowMobileMenu(false)} 
                        onLogout={handleLogout} 
                        userName={user.name} 
                        userPlan={user.plan} 
                        userRole={user.role || 'solo'}
                        onUpgrade={(plan) => plan ? handleUpgrade(plan) : setShowPricing(true)} 
                        onLockedFeature={handleLockedFeature} 
                        onSettings={() => setShowSettings(true)}
                    />
                    <main className="flex-1 flex flex-col app-viewport md:ml-64 relative theme-app-bg no-x-overflow px-safe">
                        <Header title={currentView.charAt(0).toUpperCase() + currentView.slice(1)} onNotify={handleNotify} onSyncNow={handleSyncNow} />
                        <div className="flex-1 overflow-y-auto relative no-x-overflow pb-safe" style={{ paddingBottom: "calc(96px + env(safe-area-inset-bottom))" }}><div className="app-container">{renderView()}</div></div>
                        <MobileNav currentView={viewLabel(currentView)} setView={setCurrentView} onOpenMenu={() => setShowMobileMenu(true)} user={user} onLockedFeature={handleLockedFeature} />
                    

</main>
                </div>
            );
        };

        try {
            const root = ReactDOM.createRoot(document.getElementById('root'));
            root.render(
                <AppErrorBoundary>
                    <App />
                </AppErrorBoundary>
            );
            try { window.__NOTARY_MARK_MOUNTED && window.__NOTARY_MARK_MOUNTED(); } catch(e){}
        } catch (e) {
            const mount = document.getElementById('root');
            if (mount) {
                mount.innerHTML = `<div style="min-height:100vh;display:grid;place-items:center;padding:24px;font-family:sans-serif;background:#f8fafc;color:#0f172a;"><div style="max-width:520px;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;box-shadow:0 10px 25px rgba(2,6,23,.08);"><h2 style="margin:0 0 8px;font-size:20px;">NotaryOS failed to load</h2><p style="margin:0 0 10px;color:#475569;">A browser/runtime issue prevented startup. Refresh the page or clear site data and retry.</p><p style="margin:0;color:#64748b;font-size:12px;word-break:break-word;">${(e && e.message) ? e.message : 'Unknown startup error'}</p></div></div>`;
            }
            console.error('Root render failure:', e);
        }
    
