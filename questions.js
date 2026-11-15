// Review questions loosely aligned with NC 2023 Biology standards (Bio.1-Bio.4).
// Format: q = question, a = choices, c = index of correct choice, e = explanation.
export const TOPICS = {
  'Cells (Bio.1)': [
    { q: 'Which organelle makes proteins?', a: ['Ribosome', 'Lysosome', 'Vacuole', 'Cell wall'], c: 0, e: 'Ribosomes translate mRNA into proteins.' },
    { q: 'Where does cellular respiration mainly happen?', a: ['Chloroplast', 'Mitochondria', 'Nucleus', 'Golgi'], c: 1, e: 'Mitochondria release energy as ATP.' },
    { q: 'Prokaryotic cells lack a...', a: ['Cell membrane', 'Ribosome', 'Nucleus', 'DNA'], c: 2, e: 'Prokaryotes have no membrane-bound nucleus.' },
    { q: 'Water moving across a membrane from high to low water concentration is...', a: ['Active transport', 'Osmosis', 'Endocytosis', 'Mitosis'], c: 1, e: 'Osmosis is passive diffusion of water.' },
    { q: 'Homeostasis means an organism...', a: ['Grows rapidly', 'Keeps stable internal conditions', 'Reproduces', 'Mutates'], c: 1, e: 'Feedback keeps internal conditions stable.' },
  ],
  'Ecosystems (Bio.2)': [
    { q: 'Organisms that make their own food are...', a: ['Consumers', 'Decomposers', 'Producers', 'Predators'], c: 2, e: 'Producers capture energy by photosynthesis.' },
    { q: 'About how much energy passes to the next trophic level?', a: ['10%', '50%', '90%', '100%'], c: 0, e: 'Most energy is lost as heat; ~10% transfers.' },
    { q: 'Which process returns CO2 to the atmosphere?', a: ['Photosynthesis', 'Cellular respiration', 'Transpiration', 'Nitrogen fixation'], c: 1, e: 'Respiration releases CO2.' },
    { q: 'A relationship where both species benefit is...', a: ['Parasitism', 'Commensalism', 'Mutualism', 'Competition'], c: 2, e: 'Mutualism benefits both partners.' },
    { q: 'Carrying capacity is limited by...', a: ['Limiting factors', 'Mutations', 'Ribosomes', 'Alleles'], c: 0, e: 'Food, space and water limit populations.' },
  ],
  'Genetics & Evolution (Bio.3)': [
    { q: 'Aa x Aa: what fraction of offspring are aa?', a: ['0', '1/4', '1/2', '3/4'], c: 1, e: 'Punnett square: 1 AA : 2 Aa : 1 aa.' },
    { q: 'Meiosis produces cells that are...', a: ['Diploid', 'Haploid', 'Identical', 'Prokaryotic'], c: 1, e: 'Gametes carry one set of chromosomes.' },
    { q: 'Natural selection acts on...', a: ['Variation in traits', 'Learned behaviors only', 'Unused organs', 'Fossils'], c: 0, e: 'Heritable variation affects survival.' },
    { q: 'Similar structures from a common ancestor are...', a: ['Analogous', 'Vestigial', 'Homologous', 'Mutant'], c: 2, e: 'Homologous structures show shared ancestry.' },
    { q: 'Antibiotic resistance spreads because resistant bacteria...', a: ['Learn', 'Survive and reproduce', 'Are bigger', 'Eat antibiotics'], c: 1, e: 'Selection favors resistant individuals.' },
  ],
  'Molecular Biology (Bio.4)': [
    { q: 'DNA base pairs with adenine:', a: ['Guanine', 'Cytosine', 'Thymine', 'Uracil'], c: 2, e: 'A pairs with T in DNA.' },
    { q: 'Transcription makes...', a: ['Protein from RNA', 'mRNA from DNA', 'DNA from DNA', 'Lipids'], c: 1, e: 'DNA is transcribed into mRNA.' },
    { q: 'Enzymes are mostly made of...', a: ['Proteins', 'Lipids', 'Carbohydrates', 'Nucleic acids'], c: 0, e: 'Enzymes are protein catalysts.' },
    { q: 'Monomers of proteins are...', a: ['Nucleotides', 'Amino acids', 'Fatty acids', 'Glucose'], c: 1, e: 'Amino acids chain into proteins.' },
    { q: 'A codon is made of how many bases?', a: ['1', '2', '3', '4'], c: 2, e: 'Three bases code one amino acid.' },
  ],
};
