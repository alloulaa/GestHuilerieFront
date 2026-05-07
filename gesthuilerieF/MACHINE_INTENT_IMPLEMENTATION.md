# Machine Intent Implementation for Chatbot Widget

## Overview
This implementation adds support for the 'machine' intent to display a list of machines with normalized columns (Nom, Catégorie, Type, Exécutions) while maintaining backward compatibility with existing machine-related intents.

---

## File 1: chatbot-widget.component.ts

### Changes

#### 1. Add MachineListItem Interface (after MachineTableItem, line ~100)
```typescript
interface MachineListItem {
  nom: string;
  categorie: string;
  type: string;
  executions: number;
}
```

#### 2. Add Normalization Method (in class, line ~1005)
```typescript
/**
 * Normalize raw machine data into MachineListItem format
 * Handles multiple field name variants (camelCase and snake_case)
 */
private normalizeMachine(item: any): MachineListItem {
  const nom = item?.nomMachine ?? item?.nom_machine ?? item?.nom ?? 'Machine inconnue';
  const categorie = item?.categorieMachine ?? item?.categorie_machine ?? 'Inconnue';
  const type = item?.typeMachine ?? item?.type_machine ?? 'Inconnu';
  const executions = Number(item?.nbExecutions ?? item?.nb_executions ?? 0) || 0;

  return {
    nom: String(nom).trim() || 'Machine inconnue',
    categorie: String(categorie).trim() || 'Inconnue',
    type: String(type).trim() || 'Inconnu',
    executions: executions,
  };
}
```

#### 3. Add Machine List Extraction Method
```typescript
/**
 * Extract machine list from API response data
 * Supports both 'machines' and 'items' array formats
 */
private extractMachineList(data: unknown): MachineListItem[] {
  if (!data || typeof data !== 'object') return [];

  const rawMachines = Array.isArray((data as any).machines)
    ? (data as any).machines
    : Array.isArray((data as any).items)
      ? (data as any).items
      : [];

  return rawMachines.map((item: any) => this.normalizeMachine(item));
}
```

#### 4. Add Public Getter Method
```typescript
/**
 * Get normalized machine list items for template rendering
 */
public getTableMachineListItems(message: ChatMessage): MachineListItem[] {
  const data = (message as any).tableData;
  if (!data || typeof data !== 'object') return [];
  return Array.isArray((data as any).machineList) ? (data as any).machineList : [];
}
```

#### 5. Add Intent Detection Method
```typescript
/**
 * Check if message is for 'machine' intent (new unified list)
 * Returns true ONLY for exact 'machine' intent
 */
public isMachineListMessage(message: ChatMessage): boolean {
  const intent = (message as any).tableIntent ?? message.debug?.intent ?? message.rankingIntent;
  if (!intent) return false;
  return String(intent).toLowerCase() === 'machine';
}
```

#### 6. Update createBotMessage() Method (line ~1387)

Replace this block:
```typescript
if (tableIntent === 'machine') {
  const machineRows = this.extractMachineTableRows(response.data);
  (botMessage as any).tableData = { machines: machineRows };
  botMessage.content = 'Machines de l\'huilerie';
} else {
  (botMessage as any).tableData = response.data;
}
```

With this:
```typescript
if (tableIntent === 'machine') {
  const machineList = this.extractMachineList(response.data);
  if (machineList.length === 0) {
    botMessage.content = 'Aucune machine trouvée.';
    botMessage.type = 'text';
    (botMessage as any).tableData = null;
  } else {
    botMessage.content = 'Machines de l\'huilerie';
    (botMessage as any).tableData = { machineList };
  }
} else {
  const machineRows = this.extractMachineTableRows(response.data);
  (botMessage as any).tableData = { machines: machineRows };
}
```

---

## File 2: chatbot-widget.component.html

### Changes

#### Replace the MACHINE TABLE section (line ~358)

Replace:
```html
<!-- ══════════════════════════════════════════════════════════
     MACHINE TABLE for non-ranking machine responses (states, pannes, all machines)
     ══════════════════════════════════════════════════════════ -->
<ng-container *ngIf="message.sender === 'bot' && (message.tableData) && isMachineTableMessage(message)">
  <div class="chatbot-widget__ranking-text">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Machine</th>
          <th>Statut</th>
          <th>Détails</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of getTableMachineItems(message); let idx = index">
          <td>{{ idx + 1 }}</td>
          <td><strong>{{ item.name || item.machine || item.nomMachine || item.machineRef }}</strong></td>
          <td>{{ item.status || item.statut || item.etat || item.state || '—' }}</td>
          <td>{{ item.details || item.info || item.description || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</ng-container>
```

With:
```html
<!-- ══════════════════════════════════════════════════════════
     MACHINE LIST for 'machine' intent (unified table view)
     ══════════════════════════════════════════════════════════ -->
<ng-container *ngIf="message.sender === 'bot' && (message.tableData) && isMachineListMessage(message)">
  <div class="chatbot-widget__ranking-text">
    <ng-container *ngIf="getTableMachineListItems(message).length > 0; else noMachinesMessage">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nom</th>
            <th>Catégorie</th>
            <th>Type</th>
            <th>Exécutions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of getTableMachineListItems(message); let idx = index">
            <td>{{ idx + 1 }}</td>
            <td><strong>{{ item.nom }}</strong></td>
            <td>{{ item.categorie }}</td>
            <td>{{ item.type }}</td>
            <td>{{ item.executions }}</td>
          </tr>
        </tbody>
      </table>
    </ng-container>
    <ng-template #noMachinesMessage>
      <p>{{ message.content }}</p>
    </ng-template>
  </div>
</ng-container>

<!-- ══════════════════════════════════════════════════════════
     MACHINE TABLE for non-ranking machine responses (states, pannes, all machines)
     ══════════════════════════════════════════════════════════ -->
<ng-container *ngIf="message.sender === 'bot' && (message.tableData) && isMachineTableMessage(message) && !isMachineListMessage(message)">
  <div class="chatbot-widget__ranking-text">
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th>Machine</th>
          <th>Statut</th>
          <th>Détails</th>
        </tr>
      </thead>
      <tbody>
        <tr *ngFor="let item of getTableMachineItems(message); let idx = index">
          <td>{{ idx + 1 }}</td>
          <td><strong>{{ item.name || item.machine || item.nomMachine || item.machineRef }}</strong></td>
          <td>{{ item.status || item.statut || item.etat || item.state || '—' }}</td>
          <td>{{ item.details || item.info || item.description || '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</ng-container>
```

**Key changes:**
- New table for intent='machine' with columns: Nom, Catégorie, Type, Exécutions
- Uses `getTableMachineListItems()` (normalized data)
- Shows "Aucune machine trouvée." fallback message
- Old machine table condition now includes `&& !isMachineListMessage(message)` to avoid conflicts

---

## File 3: chatbot.service.ts

### No Changes Required
The service already passes response.data correctly. The frontend normalization happens in the component.

However, verify that:
1. Backend returns `intent: 'machine'` in response
2. `response.data` contains array in one of these formats:
   - `{ machines: [...] }`
   - `{ items: [...] }`

---

## Backward Compatibility

| Intent | Handler | Columns |
|--------|---------|---------|
| `machine` | `isMachineListMessage()` + `extractMachineList()` | Nom, Catégorie, Type, Exécutions |
| `machines_utilisees` | `isMachineTableMessage()` + `extractMachineTableRows()` | (ranking table) |
| `machines_pannes` | `isMachineTableMessage()` + `extractMachineTableRows()` | Machine, Statut, Détails |
| `machines_huilerie` | `isMachineTableMessage()` + `extractMachineTableRows()` | Machine, Statut, Détails |

---

## Manual Test Cases

### Test 1: List Machines of Specific Huilerie
**User message:** "quelles sont les machines de ma3sra"

**Expected API response:**
```json
{
  "type": "text",
  "message": "Voici les machines de ma3sra",
  "intent": "machine",
  "data": {
    "machines": [
      {
        "nomMachine": "Broyeur M1",
        "categorieMachine": "Broyeur",
        "typeMachine": "Marteau",
        "nbExecutions": 45
      },
      {
        "nomMachine": "Décanteur D1",
        "categorieMachine": "Décanteur",
        "typeMachine": "3 phases",
        "nbExecutions": 32
      }
    ]
  }
}
```

**Expected Frontend Result:**
- Message: "Machines de l'huilerie"
- Table with 2 rows showing Nom, Catégorie, Type, Exécutions

### Test 2: General Machines List
**User message:** "liste des machines"

**Expected API response:**
```json
{
  "type": "text",
  "intent": "machine",
  "message": "Voici toutes les machines",
  "data": {
    "items": [
      { "nomMachine": "Broyeur B1", "categorieMachine": "Broyeur", "typeMachine": "Disques", "nbExecutions": 120 },
      { "nomMachine": "Malaxeur M1", "categorieMachine": "Malaxeur", "typeMachine": "Continu", "nbExecutions": 118 }
    ]
  }
}
```

**Expected Frontend Result:**
- Table with normalized data
- Rows count matches response

### Test 3: No Machines Found
**User message:** "machines de huilerie_xyz"

**Expected API response:**
```json
{
  "type": "text",
  "intent": "machine",
  "message": "Aucune machine trouvée pour huilerie_xyz",
  "data": { "machines": [] }
}
```

**Expected Frontend Result:**
- Message: "Aucune machine trouvée."
- No table displayed

### Test 4: Backward Compatibility (Machines en Panne)
**User message:** "machines en panne"

**Expected API response (old format):**
```json
{
  "type": "text",
  "intent": "machines_pannes",
  "message": "Machines actuellement en panne",
  "data": {
    "machines": [
      {
        "nomMachine": "Décanteur D2",
        "etatMachine": "En révision",
        "typeMachine": "2 phases",
        "huilerieNom": "ma3sra"
      }
    ]
  }
}
```

**Expected Frontend Result:**
- Table with columns: Machine, Statut, Détails
- Uses old `isMachineTableMessage()` handler
- Shows etat, type, huilerie in details

---

## Error Handling

1. **Empty response.data**: Returns empty array from extractMachineList(), displays "Aucune machine trouvée."
2. **Wrong data structure**: Checks for both `machines` and `items` arrays
3. **Missing fields**: Each field has a fallback default (e.g., "Machine inconnue", "Inconnue")
4. **Non-string values**: Normalized with `String().trim()` before display

---

## Summary

✅ Supports new 'machine' intent with normalized columns
✅ Maintains backward compatibility with existing machine intents
✅ Robust field name mapping (camelCase + snake_case)
✅ Proper fallback messages and defaults
✅ No impact on other intents (ranking, stocks, analysis)
✅ TypeScript strict mode compatible
