/*
  # Add Restocking Fee to Shipping Delay (With Refund Request) Template

  ## Overview
  Update the "Shipping Delay (With Refund Request)" template to include restocking fee information
  in the refund request section.

  ## Changes
  - Add restocking fee variable to the refund request section
  - Clarify that restocking fee applies to returns (if configured)
*/

-- Update the shipping delay with refund request template
UPDATE email_templates
SET body_plain = REPLACE(
  body_plain,
  '**Regarding your refund request:** I want to be transparent about our process. Since your package is already in transit and scheduled for imminent delivery, we would need to wait until you receive it to initiate a return if you still wish to proceed with a refund. This is our standard procedure to ensure proper inventory management and to protect both parties.',
  '**Regarding your refund request:** I want to be transparent about our process. Since your package is already in transit and scheduled for imminent delivery, we would need to wait until you receive it to initiate a return if you still wish to proceed with a refund. This is our standard procedure to ensure proper inventory management and to protect both parties.

Please note: If you choose to return the item once received, {{restocking_fee}} will apply as outlined in our return policy.'
),
body_html = REPLACE(
  body_html,
  '<p><strong>Regarding your refund request:</strong> I want to be transparent about our process. Since your package is already in transit and scheduled for imminent delivery, we would need to wait until you receive it to initiate a return if you still wish to proceed with a refund. This is our standard procedure to ensure proper inventory management and to protect both parties.</p>',
  '<p><strong>Regarding your refund request:</strong> I want to be transparent about our process. Since your package is already in transit and scheduled for imminent delivery, we would need to wait until you receive it to initiate a return if you still wish to proceed with a refund. This is our standard procedure to ensure proper inventory management and to protect both parties.</p><p>Please note: If you choose to return the item once received, {{restocking_fee}} will apply as outlined in our return policy.</p>'
)
WHERE name = 'Shipping Delay (With Refund Request)'
AND body_plain LIKE '%**Regarding your refund request:**%'
AND body_plain NOT LIKE '%{{restocking_fee}}%';
