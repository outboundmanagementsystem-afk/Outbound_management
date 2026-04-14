const fs = require('fs');
const path = require('path');

const files = [
    'app/(dashboard)/sales/itinerary/[id]/page.tsx',
    'app/(dashboard)/ops/booking/[id]/page.tsx',
    'app/(dashboard)/post-ops/booking/[id]/page.tsx'
];

for (const f of files) {
    const filePath = path.join(__dirname, f);
    if (!fs.existsSync(filePath)) continue;

    let content = fs.readFileSync(filePath, 'utf8');

    // Remove the '!item.checked &&' condition from all block types so they stay visible
    
    // text input
    content = content.replace(
        `{['text_input', 'Text Input'].includes(item.type) && !item.checked && (`,
        `{['text_input', 'Text Input'].includes(item.type) && (`
    );

    // date picker
    content = content.replace(
        `{['date_picker', 'Date Picker'].includes(item.type) && !item.checked && (`,
        `{['date_picker', 'Date Picker'].includes(item.type) && (`
    );

    // single choice
    content = content.replace(
        `{['single_choice', 'Single Choice'].includes(item.type) && !item.checked && item.points && (`,
        `{['single_choice', 'Single Choice'].includes(item.type) && item.points && (`
    );

    // multiple choice
    content = content.replace(
        `{['multiple_choice', 'Multiple Choice'].includes(item.type) && !item.checked && item.points && (`,
        `{['multiple_choice', 'Multiple Choice'].includes(item.type) && item.points && (`
    );

    // rating
    content = content.replace(
        `{['rating', 'Rating'].includes(item.type) && !item.checked && (`,
        `{['rating', 'Rating'].includes(item.type) && (`
    );
    
    // Also add disabled state based on check so they become read-only when checked!
    // Since React state is driven by these, we could just let them be disabled={item.checked}

    // Replace inputs inside the blocks to add disabled={item.checked}
    
    content = content.replace(/type="text"\s+value=\{item\.response \|\| ''\}/g, `type="text"\n                                                disabled={item.checked}\n                                                value={item.response || ''}`);
    content = content.replace(/type="date"\s+value=\{item\.response \|\| ''\}/g, `type="date"\n                                                disabled={item.checked}\n                                                value={item.response || ''}`);
    content = content.replace(/type="radio"\s+name=\{\`single-\$\{item\.id\}\`\}/g, `type="radio"\n                                                        disabled={item.checked}\n                                                        name={\`single-\${item.id}\`}`);
    content = content.replace(/type="checkbox"\s+checked=\{item\.response\?.includes\(opt\) \|\| false\}/g, `type="checkbox"\n                                                        disabled={item.checked}\n                                                        checked={item.response?.includes(opt) || false}`);

    // Update rating button disabled? We can just keep it clickable or disable it loosely.
    content = content.replace(/onClick=\{\(\) => updateSopItemState\(item\.id, \{ response: \(i \+ 1\)\.toString\(\) \}\)\}/g, `disabled={item.checked}\n                                                    onClick={() => !item.checked && updateSopItemState(item.id, { response: (i + 1).toString() })}`);


    fs.writeFileSync(filePath, content);
    console.log('Fixed visibility and read-only state for', f);
}
