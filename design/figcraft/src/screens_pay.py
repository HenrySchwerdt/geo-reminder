"""Append the Pay & time reference page to the existing document, retaining its foundations.

Generate commands: python3 design/figcraft/src/screens_pay.py /tmp/worktime-pay.json
Run once against worktime.figcraft with figcraft-cli run --in ... --out ... .
The page covers both native navigation treatments and the contract calculation, light/dark.
"""
import sys
import json
import lib
from lib import Builder, TYPE, COLORS
from common import card


def build(b):
    # Existing document foundations; style.apply accepts stable style names.
    b.tstyle = {name: name for name in TYPE}
    def text(parent, value, style='Body', color='text/primary', sw=None, x=None, y=None, **extra):
        _, weight, size, height, spacing, _ = TYPE[style]
        params = {'type': 'text', 'text': value, 'props': {'fontFamily': 'Inter', 'fontStyle': weight, 'fontSize': size, 'lineHeight': height, 'fill': lib.col(color), **extra}}
        if parent is not None: params['parent'] = parent
        if x is not None: params['x'] = x
        if y is not None: params['y'] = y
        ref = b.add('node.create', params)
        if sw == 'fill': b.set(ref, sizingH='fill', textAutoResize='height')
        return ref
    b.text = text
    b.add('page.add', {'name': 'Pay & time · Contract & estimates'})
    b.add('page.select', {'index': 15})
    for dark in (False, True):
        for android in (False, True):
            for editor in (False, True):
                lib.col = lambda color: 'none' if color is None else color if color.startswith('#') else COLORS[color][int(dark)]
                x = (int(android) * 2 + int(editor)) * 490
                y = int(dark) * 1350
                label = ('Android' if android else 'iPhone') + (' · Contract' if editor else ' · Pay & time') + (' · Dark' if dark else ' · Light')
                b.text(None, label, 'Headline', x=x, y=y-36)
                root = b.frame(name=label, x=x, y=y, w=393, h=1200, fill='bg/canvas', clip=True, radius=28)
                content = b.frame(root, name='Scrollable content', w=393, dir='v', pad=[20,16,40,16], gap=16)
                b.text(content, '9:41                                  ▰', 'Footnote/Strong', sw='fill')
                nav = b.frame(content, name='Native navigation', dir='h', sw='fill', main='spaceBetween', cross='center', h=48)
                b.text(nav, 'Cancel' if editor else '←', 'Body', 'accent')
                b.text(nav, 'Salary contract' if editor else 'Pay & time', 'Headline')
                b.text(nav, 'Save' if editor else '', 'Headline', 'accent')
                b.text(content, 'Your salary contract' if editor else 'What your time is worth', 'Title/1', sw='fill')
                b.text(content, 'See what your working time is worth, before tax.' if editor else 'A gross estimate from your contract and completed work.', 'Body', 'text/secondary', sw='fill')
                if editor:
                    form = card(b, content, gap=20)
                    for title, value, hint in [('Annual gross salary', '60000', 'Full annual amount before tax; no thousands separators.'), ('Hours per week', '40', 'Also updates your working-time target.'), ('Paid vacation days', '30', 'Working days off per year, excluding public holidays.')]:
                        b.text(form, title, 'Headline', sw='fill')
                        field = b.frame(form, name=title, dir='v', pad=14, radius=14, fill='bg/sunken', sw='fill')
                        b.text(field, value, 'Title/2')
                        b.text(form, hint, 'Footnote', 'text/secondary', sw='fill')
                        if title == 'Annual gross salary':
                            b.text(form, 'EUR     GBP     USD     CHF', 'Headline', sw='fill')
                    rate = card(b, content, fill='accent/soft')
                    b.text(rate, 'Effective gross hourly rate · 2026', 'Footnote', 'text/secondary', sw='fill')
                    b.text(rate, '€32.47 / h', 'Title/1')
                    b.text(rate, '1,848 planned working hours after vacation.', 'Footnote', 'text/secondary', sw='fill')
                    btn = b.frame(content, name='Save contract', dir='v', pad=16, radius=26, fill='accent', sw='fill', cross='center')
                    b.text(btn, 'Save contract', 'Headline', 'on-accent')
                else:
                    b.text(content, 'Month       Year', 'Headline')
                    hero = card(b, content, fill='accent/soft')
                    b.text(hero, 'October 2026 · tracked gross value', 'Footnote/Strong', 'accent', sw='fill')
                    b.text(hero, '€2,597.40', 'Display/Large')
                    b.text(hero, '80:00 completed work', 'Body')
                    b.text(hero, '€32.47 per working hour, after paid vacation.', 'Footnote', 'text/secondary', sw='fill')
                    b.text(content, 'Running sessions and missing check-outs are excluded. This is the value of tracked work; your fixed salary payment does not change with this total.', 'Footnote', 'text/secondary', sw='fill')
                    b.text(content, 'CALCULATION · 2026', 'Caption/Upper', 'text/secondary')
                    calc = card(b, content, gap=16)
                    for text in ['€60,000.00 annual gross', '40 h/week across 5 working days', '261 scheduled days − 30 paid vacation days', '1,848 working hours → €32.47 / h']:
                        b.text(calc, text, 'Body', sw='fill')
                    monthly = card(b, content)
                    b.text(monthly, 'Monthly contract reference', 'Footnote', 'text/secondary')
                    b.text(monthly, '€5,000.00', 'Title/2')
                    b.text(monthly, 'Annual gross divided by 12. Actual payment schedules can differ.', 'Footnote', 'text/secondary', sw='fill')
                    btn = b.frame(content, name='Edit contract', dir='v', pad=16, radius=26, fill='bg/sunken', sw='fill', cross='center')
                    b.text(btn, 'Edit contract', 'Headline')
                b.text(content, 'Current contract and weekly pattern apply to the whole year. Public holidays and bonuses are not included.', 'Footnote', 'text/secondary', sw='fill')


if __name__ == '__main__':
    builder = Builder()
    build(builder)
    refs = {step['as']: i for i, step in enumerate(builder.steps)}
    def resolve(value):
        if isinstance(value, dict):
            if '$ref' in value: return {'$step': refs[value['$ref']]}
            return {k: resolve(v) for k, v in value.items()}
        if isinstance(value, list): return [resolve(v) for v in value]
        return value
    steps = []
    for step in builder.steps:
        params = resolve(step['params'])
        if step['command'] == 'node.set': params = {'ids': params['ids'], **params['props']}
        steps.append({'command': step['command'], 'params': params})
    with open(sys.argv[1], 'w') as output: json.dump(steps, output)
