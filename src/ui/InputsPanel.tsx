import { useState } from 'react';
import type { Inputs } from '../engine';
import type { DataFile } from '../data/schema';
import { sourceFor, type PropertyType } from '../data/defaults';
import { ro } from '../i18n/ro';
import { FIELDS, type FieldDef, type Topic } from './fields';
import { InputField } from './InputField';
import type { Currency } from './format';

interface Props {
  data: DataFile;
  cityId: string;
  propertyType: PropertyType;
  inputs: Inputs;
  overrides: Partial<Inputs>;
  currency: Currency;
  setField: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void;
  resetField: (key: keyof Inputs) => void;
}

type GroupId = keyof typeof ro.groups;

interface GroupLayout {
  id: GroupId;
  /** Topics always shown. Buying names each one, since it mixes the home and the loan. */
  topics: Topic[];
  /** Topics folded away because they rarely change and would bury the rest. */
  more?: Topic[];
}

const LAYOUT: GroupLayout[] = [
  { id: 'buying', topics: ['home', 'loan'], more: ['purchaseCosts', 'ownershipCosts', 'sale'] },
  { id: 'renting', topics: ['renting'] },
  { id: 'investing', topics: ['investing'] },
  { id: 'general', topics: ['general'] },
];

const PRESETS = [
  { years: 5, label: ro.presets.fixed5 },
  { years: 0, label: ro.presets.variable },
] as const;

const fieldsOf = (topic: Topic) => FIELDS.filter((f) => f.topic === topic);
const topicTitle = (topic: Topic) => (topic in ro.topics ? ro.topics[topic as keyof typeof ro.topics] : undefined);

export function InputsPanel({ data, cityId, propertyType, inputs, overrides, currency, setField, resetField }: Props) {
  const eurRon = data.values.eurRon.value;
  // Presets only change the fixed period; the rate itself stays whatever the user or the defaults say.
  const presets = (
    <div key="presets" className="presets" role="group" aria-label={ro.presets.label}>
      {PRESETS.map((p) => (
        <button key={p.years} type="button" aria-pressed={inputs.fixedYears === p.years} onClick={() => setField('fixedYears', p.years)}>
          {p.label}
        </button>
      ))}
    </div>
  );

  const renderDefs = (defs: FieldDef[]) =>
    defs.flatMap((def) => [
      ...(def.key === 'fixedRate' ? [presets] : []),
      <InputField
        key={def.key}
        def={def}
        value={inputs[def.key]}
        isOverridden={def.key in overrides}
        source={sourceFor(data, cityId, propertyType, def.key)}
        currency={currency}
        eurRon={eurRon}
        onChange={(v) => setField(def.key, v as never)}
        onReset={() => resetField(def.key)}
        // With no fixed period the fixed rate never applies; disabled rather than hidden to avoid layout jumps.
        disabled={def.key === 'fixedRate' && inputs.fixedYears === 0}
      />,
    ]);

  const renderTopic = (topic: Topic, named: boolean) => {
    const title = named ? topicTitle(topic) : undefined;
    return (
      <div key={topic} className="topic">
        {title && <h4>{title}</h4>}
        {renderDefs(fieldsOf(topic))}
      </div>
    );
  };

  const [collapsed, setCollapsed] = useState<Partial<Record<GroupId, boolean>>>({});
  const toggle = (id: GroupId) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const editsIn = (topics: Topic[]) => topics.flatMap(fieldsOf).filter((f) => f.key in overrides).length;

  return (
    <div className="inputs">
      {LAYOUT.map((group) => {
        const named = group.topics.length > 1 || Boolean(group.more);
        const isOpen = !collapsed[group.id];
        const bodyId = `group-${group.id}-body`;
        // Edits inside folded parts would otherwise be invisible, so the folded headers count them.
        const groupEdits = editsIn([...group.topics, ...(group.more ?? [])]);
        const hiddenEdits = editsIn(group.more ?? []);
        return (
          <section key={group.id} className={`input-group group-${group.id}${isOpen ? ' is-open' : ''}`} aria-labelledby={`group-${group.id}-title`}>
            <h3 className="group-head">
              <button
                type="button"
                id={`group-${group.id}`}
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => toggle(group.id)}
              >
                <span id={`group-${group.id}-title`} className="group-title">{ro.groups[group.id]}</span>
                {!isOpen && groupEdits > 0 && <span className="edit-count">{ro.editedCount(groupEdits)}</span>}
                <span className="chevron" aria-hidden="true" />
              </button>
            </h3>
            <div id={bodyId} className="group-body" hidden={!isOpen}>
              {group.topics.map((t) => renderTopic(t, named))}
              {group.more && (
                <details className="more">
                  <summary>
                    <span>{ro.buyingMore}</span>
                    {hiddenEdits > 0 && <span className="edit-count">{ro.editedCount(hiddenEdits)}</span>}
                  </summary>
                  {group.more.map((t) => renderTopic(t, true))}
                </details>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
