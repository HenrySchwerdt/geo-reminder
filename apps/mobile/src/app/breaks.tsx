import { DEFAULT_BREAK_RULE_SETTINGS } from '@worktime/core';
import { Pressable, View } from 'react-native';

import { Stepper } from '@/features/settings/components';
import { addRule, formatMinutes, isGermanLaw, MAX_BREAK_RULES, removeRule, updateRule } from '@/features/settings/format';
import { useSettings } from '@/features/settings/store';
import { space } from '@/shared/theme';
import { Button, Card, Icon, Row, Screen, SectionHeader, Text } from '@/shared/ui/components';

export default function Breaks() {
  const rules = useSettings((s) => s.breakRules);
  const update = useSettings((s) => s.update);
  const set = (breakRules: typeof rules) => update({ breakRules });

  return (
    <Screen>
      <Text variant="callout" color="text/secondary">
        Breaks Worktime expects at work. They set when your day is done: the expected end includes the break you still have to take.
      </Text>

      <SectionHeader>Rules</SectionHeader>
      {rules.map((rule, i) => (
        <Card key={i} style={{ gap: space.m }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="headline">Rule {i + 1}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={`Remove rule ${i + 1}`} hitSlop={12} onPress={() => set(removeRule(rules, i))}>
              <Icon name="trash" color="danger" />
            </Pressable>
          </Row>
          <View style={{ gap: space.xs }}>
            <Text variant="footnote" color="text/secondary">
              After working
            </Text>
            <Stepper
              label={`work time of rule ${i + 1}`}
              value={rule.afterMinutes}
              step={15}
              min={0}
              max={16 * 60}
              format={formatMinutes}
              onChange={(afterMinutes) => set(updateRule(rules, i, { afterMinutes }))}
            />
          </View>
          <View style={{ gap: space.xs }}>
            <Text variant="footnote" color="text/secondary">
              Take at least
            </Text>
            <Stepper
              label={`break of rule ${i + 1}`}
              value={rule.minBreakMinutes}
              step={5}
              min={0}
              max={240}
              format={formatMinutes}
              onChange={(minBreakMinutes) => set(updateRule(rules, i, { minBreakMinutes }))}
            />
          </View>
        </Card>
      ))}
      {rules.length === 0 ? (
        <Text variant="footnote" color="text/secondary">
          No rules: no break is required.
        </Text>
      ) : null}

      <Button label="Add rule" icon="plus" style="secondary" disabled={rules.length >= MAX_BREAK_RULES} onPress={() => set(addRule(rules))} />
      {rules.length >= MAX_BREAK_RULES ? (
        <Text variant="footnote" color="text/secondary">
          You can have up to {MAX_BREAK_RULES} rules.
        </Text>
      ) : null}
      <Button label="Reset to German law (ArbZG)" icon="undo" style="secondary" disabled={isGermanLaw(rules)} onPress={() => set(DEFAULT_BREAK_RULE_SETTINGS)} />
      <Text variant="footnote" color="text/secondary">
        The German Working Hours Act requires 30 minutes after 6 hours and 45 minutes after 9 hours.
      </Text>
    </Screen>
  );
}
