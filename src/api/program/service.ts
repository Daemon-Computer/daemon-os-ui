import type { SuiClient } from '@mysten/sui/client';
import { PROGRAM_TYPE_STRING } from '../constants';
import type { Program, SuiProgramDataFields } from './types';
import {
  transformSuiPaletteToViewModelPalette,
  transformSuiPartsToViewModelAddons,
  getProtocolNameFromSui,
} from './transformers';
import { formatTimestamp } from '../../components/ProgramDatabase/utils/dateUtils';

export async function fetchProgramsFromWallet(
  suiClient: SuiClient,
  walletAddress: string,
  transactionHistory?: Array<{ digest: string; timestampMs: string }>,
): Promise<Program[]> {
  console.log('Fetching programs from wallet for account:', walletAddress);

  // Create a map for faster transaction history lookup
  const historyMap = new Map(transactionHistory?.map((tx) => [tx.digest, tx.timestampMs]) ?? []);

  const ownedProgramObjects = await suiClient.getOwnedObjects({
    owner: walletAddress,
    filter: { StructType: PROGRAM_TYPE_STRING },
    options: {
      showContent: true,
      showType: true,
      showDisplay: true,
      showPreviousTransaction: true,
    },
  });

  console.log(
    `Found ${ownedProgramObjects.data.length} potential program objects of type ${PROGRAM_TYPE_STRING}.`,
  );

  const fetchedProgramData: Program[] = [];

  for (const obj of ownedProgramObjects.data) {
    if (obj.data && obj.data.content?.dataType === 'moveObject') {
      const fields = obj.data.content.fields as unknown as SuiProgramDataFields;

      const protocolName = getProtocolNameFromSui(fields.protocol);
      const programName = obj.data.display?.data?.name || `Program ${obj.data.objectId.slice(-6)}`;

      const randomSpeed = (parseInt(obj.data.objectId.slice(-2, -1), 16) % 5) + 1;
      const randomCorruption = (parseInt(obj.data.objectId.slice(-3, -2), 16) % 80) + 10;
      const randomMaxHealth = (parseInt(obj.data.objectId.slice(-4, -3), 16) % 50) + 50;
      const randomDamage = (parseInt(obj.data.objectId.slice(-5, -4), 16) % 25) + 5;

      // --- Mint Date Logic ---
      let mintDateStr = 'N/A';
      const previousTxDigest = obj.data?.previousTransaction; // Get the digest of the tx that created/mutated the object
      let timestampFromHistory: string | undefined | null = null;

      if (previousTxDigest) {
        timestampFromHistory = historyMap.get(previousTxDigest);
      }

      if (timestampFromHistory) {
        // Prefer timestamp from transaction history if found
        mintDateStr = formatTimestamp(timestampFromHistory);
      } else {
        // Fallback to display object data if history doesn't have the tx
        const creationTimestampFromDisplay = obj.data.display?.data?.creation_date;
        if (creationTimestampFromDisplay) {
          if (!isNaN(Number(creationTimestampFromDisplay))) {
            // Try parsing as timestamp number
            mintDateStr = formatTimestamp(String(creationTimestampFromDisplay));
          } else if (
            typeof creationTimestampFromDisplay === 'string' &&
            creationTimestampFromDisplay.match(/^\d{4}-\d{2}-\d{2}/)
          ) {
            // Try parsing as date string
            try {
              mintDateStr = new Date(creationTimestampFromDisplay).toLocaleDateString();
            } catch (e) {
              /* Ignore parsing error, keep N/A */
            }
          }
        }
      }
      // --- End Mint Date Logic ---

      // First, create ViewModel for UI display
      const viewModelPalette = transformSuiPaletteToViewModelPalette(fields.palette);
      const viewModelAddons = transformSuiPartsToViewModelAddons(fields.parts);

      const transformedProgram: Program = {
        id: obj.data.objectId,
        suiObjectId: obj.data.objectId,
        name: programName,
        protocol: protocolName,
        source: protocolName,
        type: `${protocolName} / Digital`,
        speed: randomSpeed,
        corruption: randomCorruption,
        maxHealth: randomMaxHealth,
        health: randomMaxHealth,
        damage: randomDamage,
        mintDate: mintDateStr,
        viewModel: {
          palette: viewModelPalette,
          addons: viewModelAddons,
        },
        rawFields: fields, // Store raw fields for WASM communication
      };
      fetchedProgramData.push(transformedProgram);
    }
  }

  console.log(`Successfully transformed ${fetchedProgramData.length} programs.`);
  return fetchedProgramData;
}
