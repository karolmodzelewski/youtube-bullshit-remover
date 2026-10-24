import { useEffect, useState } from 'react';
import { SETTING_KEYS, SETTING_LABELS, loadSettings, saveSettings, type Settings } from '../shared/settings';

export default function Popup() {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        void loadSettings().then(setSettings);
    }, []);

    function toggle(key: keyof Settings) {
        if (!settings) {
            return;
        }
        const next = { ...settings, [key]: !settings[key] };
        setSettings(next);
        void saveSettings(next);
    }

    return (
        <main>
            <header>
                <h1>YouTube Bullshit Remover</h1>
                <p>Runs on youtube.com only</p>
            </header>

            <ul aria-busy={settings === null}>
                {settings &&
                    SETTING_KEYS.map((key) => (
                        <li key={key}>
                            <label>
                                <input type="checkbox" checked={settings[key]} onChange={() => toggle(key)} />
                                <span className="switch" aria-hidden="true" />
                                <span className="text">
                                    <span className="title">{SETTING_LABELS[key].title}</span>
                                    <span className="hint">{SETTING_LABELS[key].hint}</span>
                                </span>
                            </label>
                        </li>
                    ))}
            </ul>

            <footer>Changes apply instantly - no reload needed.</footer>
        </main>
    );
}
