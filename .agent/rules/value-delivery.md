# Value Delivery Guardrails

| ID | Rule | Enforcement |
|---|---|---|
| G-VAL-01 | Every sprint must begin with a **Value Increment Definition** in `value-ledger.md`. | VDO writes before Architect opens RED gate. |
| G-VAL-02 | No handler may SHIP without VDO confirming the value increment is met. | VDO validates at HARDEN → SHIP gate. |
| G-VAL-03 | Scope drift is a **blocking issue**. Work not mapped to the current value increment triggers a pause. | VDO flags; Architect pauses work. |
| G-VAL-04 | Value Ledger updated after every SHIP with delivery evidence. | VDO maintains; Integration Lead co-signs. |
| G-VAL-05 | Smallest shippable slice wins. If a sprint can be decomposed, VDO must propose the split. | VDO reviews at sprint kickoff. |
