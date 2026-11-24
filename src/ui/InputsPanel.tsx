import { useState } from 'react';
import { t } from '../i18n';
import { FIELDS, type FieldDef, type Topic } from './fields';
import { InputField, type FieldBinding } from './InputField';

interface Props {
  fields: FieldBinding;
}

type GroupId = keyof typeof t.groups;

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
];

const PRESETS = [
  { years: 5, label: t.presets.fixed5 },
  { years: 0, label: t.presets.variable },
] as const;

const fieldsOf = (topic: Topic) => FIELDS.filter((f) => f.topic === topic);
/** Only topics that share a group are titled; a group with one topic is named by the group itself. */
const TOPIC_TITLES: Partial<Record<Topic, string>> = t.topics;

export function InputsPanel({ fields }: Props) {
  const [collapsed, setCollapsed] = useState<Partial<Record<GroupId, boolean>>>({});
  const toggle = (id: GroupId) => setCollapsed((c) => ({ ...c, [id]: !c[id] }));
  const editsIn = (topics: Topic[]) => topics.flatMap(fieldsOf).filter((f) => fields.isOverridden(f.key)).length;
  const variableOnly = fields.value('fixedYears') === 0;

  // Presets only change the fixed period; the rate itself stays whatever the user or the defaults say.
  const presets = (
    <div key="presets" className="presets" role="group" aria-label={t.presets.label}>
      {PRESETS.map((p) => (
        <button key={p.years} type="button" aria-pressed={fields.value('fixedYears') === p.years} onClick={() => fields.set('fixedYears', p.years)}>
          {p.label}
        </button>
      ))}
    </div>
  );

  const renderField = (def: FieldDef) => [
    def.key === 'fixedRate' && presets,
    <InputField
      key={def.key}
      def={def}
      fields={fields}
      // With no fixed period the fixed rate never applies; disabled rather than hidden to avoid layout jumps.
      disabled={def.key === 'fixedRate' && variableOnly}
    />,
  ];

  const renderTopic = (topic: Topic) => {
    const title = TOPIC_TITLES[topic];
    return (
      <div key={topic} className="topic">
        {title && <h4>{title}</h4>}
        {fieldsOf(topic).flatMap(renderField)}
      </div>
    );
  };

  return (
    <div className="inputs">
      {LAYOUT.map((group) => {
        const isOpen = !collapsed[group.id];
        const bodyId = `group-${group.id}-body`;
        const more = group.more ?? [];
        // Edits inside folded parts would otherwise be invisible, so the folded headers count them.
        const groupEdits = editsIn([...group.topics, ...more]);
        const hiddenEdits = editsIn(more);
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
                <span id={`group-${group.id}-title`} className="group-title">{t.groups[group.id]}</span>
                {!isOpen && groupEdits > 0 && <span className="edit-count">{t.editedCount(groupEdits)}</span>}
                <span className="chevron" aria-hidden="true" />
              </button>
            </h3>
            <div id={bodyId} className="group-body" hidden={!isOpen}>
              {group.topics.map(renderTopic)}
              {more.length > 0 && (
                <details className="more">
                  <summary>
                    <span>{t.buyingMore}</span>
                    {hiddenEdits > 0 && <span className="edit-count">{t.editedCount(hiddenEdits)}</span>}
                    <span className="chevron" aria-hidden="true" />
                  </summary>
                  {more.map(renderTopic)}
                </details>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
