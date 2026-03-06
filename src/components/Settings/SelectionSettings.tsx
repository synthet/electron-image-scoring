import React from 'react';

export interface SelectionConfig {
    diversity_enabled?: boolean;
    diversity_lambda?: number;
}

interface Props {
    config: SelectionConfig;
    onChange: (config: SelectionConfig) => void;
}

export const SelectionSettings: React.FC<Props> = ({ config, onChange }) => {
    const enabled = config.diversity_enabled ?? false;
    const lambda = config.diversity_lambda ?? 0.70;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '10px', fontSize: '1.1em' }}>
                Diversity-Aware Selection
            </h3>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onChange({ ...config, diversity_enabled: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                />
                <span style={{ fontWeight: 600 }}>Enable Diversity Selection</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', opacity: enabled ? 1 : 0.5, pointerEvents: enabled ? 'auto' : 'none', paddingLeft: '26px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.95em' }}>
                        Diversity Weight (Lambda)
                        <span
                            title="When processing stacks, a lower lambda ensures top picks are visually different from each other. A higher lambda ensures only the highest-scoring images are picked regardless of similarity."
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 16, height: 16, borderRadius: '50%', background: '#555', color: '#fff', fontSize: '11px', cursor: 'help', fontWeight: 'bold'
                            }}
                        >
                            ?
                        </span>
                    </label>
                    <span style={{ fontSize: '0.85em', color: '#ccc', fontVariantNumeric: 'tabular-nums' }}>
                        {lambda.toFixed(2)} {lambda === 0 ? '(Pure Diversity)' : lambda === 1 ? '(Pure Quality)' : ''}
                    </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '0.8em', color: '#888' }}>0.0</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={lambda}
                        onChange={(e) => onChange({ ...config, diversity_lambda: parseFloat(e.target.value) })}
                        style={{ flex: 1, cursor: 'pointer', height: '4px' }}
                    />
                    <span style={{ fontSize: '0.8em', color: '#888' }}>1.0</span>
                </div>
            </div>
        </div>
    );
};
