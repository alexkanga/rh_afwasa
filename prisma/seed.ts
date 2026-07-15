import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const db = new PrismaClient()

// ============ EMPLOYEE DATA FROM EXCEL ============

const DIRECTION_CODES: Record<string, string> = {
  'Cabinet de la Direction Exécutive': 'DEX',
  'Direction des Services aux Membres et des Programmes': 'DMS',
  'Direction Administrative et Financière': 'DAF',
}

const DIRECTIONS = Object.keys(DIRECTION_CODES)

const EMPLOYEES = [
  { matricule: '0103F', lastName: 'ZOCLI', firstName: 'Kouessi Christian Ernest Junior', sex: 'Homme', dateOfBirth: '1995-04-23', placeOfBirth: 'Cocody', nationality: 'IVOIRIENNE', idNumber: 'CI003193470', maritalStatus: 'Célibataire', numberOfChildren: 1, address: 'Bingerville', personalPhone: '0757548880', email: 'czocli@afwa.org', emergencyContact: 'SORO Kartia', emergencyPhone: '0778700856', currentPosition: 'Resp. Conformité Performance', departmentName: 'Cabinet DEX', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-02-19', contractEndDate: '2025-12-31', cnpsNumber: '202400033605', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0085N', lastName: 'DANKOULOU', firstName: 'KHADY YASMINA', sex: 'Femme', dateOfBirth: '1986-07-08', placeOfBirth: 'Marcory', nationality: 'IVOIRIENNE', idNumber: 'C0112552897', maritalStatus: 'Célibataire', numberOfChildren: 1, address: 'Dokui Olympe', personalPhone: '0708643075', email: 'kdankoulou@afwasa.org', emergencyContact: 'Mariko Malado', emergencyPhone: '0707968928', currentPosition: 'Assistante DMS', departmentName: 'DMS', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2022-11-08', cnpsNumber: '202300058236', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0008D', lastName: 'KOFFI', firstName: 'Mathieu Kouakou', sex: 'Homme', dateOfBirth: '1969-11-22', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI006758092', maritalStatus: 'Marié(e)', numberOfChildren: 5, address: 'Yopougon Santé', personalPhone: '07 47 53 29 58', email: 'mkouakou@afwasa.org', emergencyContact: 'COMOE OI COMOE Josephine', emergencyPhone: '07 07 64 89 78', currentPosition: 'Agent Administratif', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '1999-08-20', cnpsNumber: '169019927028', directionName: 'Direction Administrative et Financière' },
  { matricule: '0009A', lastName: 'DIGBEU', firstName: 'Aimé Kaloua', sex: 'Homme', dateOfBirth: '1967-09-07', placeOfBirth: 'Daloa', nationality: 'IVOIRIENNE', idNumber: 'CI001514317', maritalStatus: 'Marié(e)', numberOfChildren: 2, address: 'Yopougon Toit Rouge', personalPhone: '05 44 25 11 14', email: 'adigbeu@afwasa.org', emergencyContact: 'DIGBEU Côme Marc', emergencyPhone: '05 05 05 31 59', currentPosition: 'Responsable Exposition', departmentName: 'DMS', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2007-07-01', cnpsNumber: '167019400391', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0010H', lastName: 'ASSIENIN', firstName: 'Aya Corine Sylvie', sex: 'Femme', dateOfBirth: '1979-07-13', placeOfBirth: 'Adjamé', nationality: 'IVOIRIENNE', idNumber: 'CI000063385', maritalStatus: 'Marié(e)', numberOfChildren: 1, address: 'Bingerville', personalPhone: '0707461039', email: 'cassienin@afwasa.org', emergencyContact: 'ASSIENIN Brou', emergencyPhone: '07 07 86 56 65', currentPosition: 'Assistante Ressources Humaines', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2004-07-01', cnpsNumber: '279010525990', directionName: 'Direction Administrative et Financière' },
  { matricule: '0014D', lastName: "N'GUESSAN KOFFI", firstName: 'Sonia', sex: 'Femme', dateOfBirth: '1989-11-14', placeOfBirth: 'Daloa', nationality: 'IVOIRIENNE', idNumber: 'CI000062584', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Cocody Faya Génie 2000', personalPhone: '07 48 72 48 15', email: 'snguessan@afwasa.org', emergencyContact: "N'GUESSAN Luc Charlène", emergencyPhone: '07 07 06 47 09', currentPosition: 'Responsable Comptable & Financier', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2014-01-01', cnpsNumber: '289011438025', directionName: 'Direction Administrative et Financière' },
  { matricule: '0017F', lastName: 'KENFACK', firstName: 'Siméon', sex: 'Homme', dateOfBirth: '1966-03-05', placeOfBirth: 'Cameroun (Foto)', nationality: 'CAMEROUNAISE', idNumber: 'AA070084', maritalStatus: 'Marié(e)', numberOfChildren: 5, address: 'Riviera Palmeraie', personalPhone: '07 77 71 12 57', email: 'skenfack@afwasa.org', emergencyContact: 'MAKOUGANG epse KENFACK', emergencyPhone: '77 82 78 99', currentPosition: 'Directeur Programmes et du Développement Professionnel', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2013-09-01', cnpsNumber: '166101882858', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0020K', lastName: 'KOUAKOU', firstName: 'Kouadio Evrard Nicaise', sex: 'Homme', dateOfBirth: '1983-06-19', placeOfBirth: 'Divo', nationality: 'IVOIRIENNE', idNumber: 'CI000259298', maritalStatus: 'Marié(e)', numberOfChildren: 4, address: 'Cocody Angré', personalPhone: '07 48 38 45 36', email: 'nkouakou@afwasa.org', emergencyContact: 'KOUAME Ahou Thérese', emergencyPhone: '07 07 19 53 72', currentPosition: 'Responsale des TIC', departmentName: 'DAF', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2014-05-01', cnpsNumber: '183011500094', directionName: 'Direction Administrative et Financière' },
  { matricule: '0028M', lastName: 'YAO', firstName: 'Kouadio Valentin', sex: 'Homme', dateOfBirth: '1979-02-14', placeOfBirth: 'Grand Morié', nationality: 'IVOIRIENNE', idNumber: 'CI000231192', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Abobo plateau dokui', personalPhone: '07 07 60 74 20', email: 'vyao@afwasa.org', emergencyContact: 'ANGODJI Josiane Perpetue', emergencyPhone: '07 0761 19 92', currentPosition: 'Coordonnateur Senior Programme Assainissement en charge de SAO-CWIS', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2015-01-01', cnpsNumber: '179011055255', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0030E', lastName: 'KONE', firstName: 'Soumaïla', sex: 'Homme', dateOfBirth: '1966-02-01', placeOfBirth: 'Sirasso', nationality: 'IVOIRIENNE', maritalStatus: 'Marié(e)', numberOfChildren: 5, address: 'Williamsville', personalPhone: '05 05 05 87 02', email: '', emergencyContact: 'BAMBA Kady', emergencyPhone: '05 66 42 21 02', currentPosition: 'Chauffeur', departmentName: 'DEX', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2015-03-01', cnpsNumber: '166011711861', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0032F', lastName: 'TIHI SEA', firstName: 'Drissehonnon Vanessa', sex: 'Femme', dateOfBirth: '1989-05-17', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000113341', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 08 44 39 36', email: 'vtihisea@afwasa.org', emergencyContact: 'TIHI Valerie', emergencyPhone: '05 05 37 30 35', currentPosition: 'Comptable Senior en Charge de la Trésorerie', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2018-01-01', cnpsNumber: '289012105034', directionName: 'Direction Administrative et Financière' },
  { matricule: '0033M', lastName: 'DJAGOUN', firstName: 'Kolawolé Akindé Gilles', sex: 'Homme', dateOfBirth: '1981-10-01', placeOfBirth: 'Bouaké', nationality: 'IVOIRIENNE', idNumber: 'CI000324589', maritalStatus: 'Marié(e)', numberOfChildren: 2, address: 'Cocody Riviera 3', personalPhone: '07 87 68 64 29', email: 'gdjagoun@afwasa.org', emergencyContact: 'DJAGOUN Somde Ange Adeline', emergencyPhone: '07 87 68 64 29', currentPosition: "Coordonnateur Senior Programme Eau en Charge d'Africap", departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2018-01-01', cnpsNumber: '282012255612', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0038M', lastName: 'GNANKPA', firstName: 'Kouassi Olivier Marius', sex: 'Homme', dateOfBirth: '1981-04-19', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000065432', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Cocody', personalPhone: '07 07 86 85 30', email: 'mgnankpa@afwasa.org', emergencyContact: 'ACHIE Kousso Claire Rose', emergencyPhone: '07 07 86 85 30', currentPosition: 'Directeur Administratif & Financier', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2018-01-01', cnpsNumber: '266013489721', directionName: 'Direction Administrative et Financière' },
  { matricule: '0040N', lastName: 'GOHOU NZICKONAN', firstName: 'Gisèle Stéphanie', sex: 'Femme', dateOfBirth: '1975-04-25', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000078912', maritalStatus: 'Marié(e)', numberOfChildren: 2, address: 'Abobo', personalPhone: '07 09 73 38 08', email: 'ggohou@afwasa.org', emergencyContact: "N'ZICKONAN Claude", emergencyPhone: '07 09 73 38 08', currentPosition: 'Responsable Communication', departmentName: 'Cabinet DEX', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2019-01-01', cnpsNumber: '275014589632', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0045A', lastName: 'YAO', firstName: 'Kan Amos', sex: 'Homme', dateOfBirth: '1978-12-01', placeOfBirth: 'Bouaké', nationality: 'IVOIRIENNE', idNumber: 'CI000123456', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Yopougon', personalPhone: '07 07 44 97 14', email: 'kyao@afwasa.org', emergencyContact: 'Tindé Tendé', emergencyPhone: '07 07 44 97 14', currentPosition: 'Chargé des Achats', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2019-01-01', cnpsNumber: '189015789423', directionName: 'Direction Administrative et Financière' },
  { matricule: '0046J', lastName: 'KOUADIO', firstName: 'Konan Emmanuel', sex: 'Homme', dateOfBirth: '1976-01-01', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000234567', maritalStatus: 'Marié(e)', numberOfChildren: 4, address: 'Cocody', personalPhone: '07 47 36 63 61', email: 'ekouadio@afwasa.org', emergencyContact: 'LIZO Valérie', emergencyPhone: '07 47 36 63 61', currentPosition: 'Responsable des Ressources Humaines', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2019-01-01', cnpsNumber: '178016589234', directionName: 'Direction Administrative et Financière' },
  { matricule: '0062J', lastName: 'ACKUN', firstName: 'AGYEIWAA Leticia', sex: 'Femme', dateOfBirth: '1969-06-27', placeOfBirth: 'Ghana', nationality: 'Ghanaïenne', idNumber: 'GH003456789', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 77 30 738', email: 'lackun@afwasa.org', emergencyContact: 'Robert Baiden', emergencyPhone: '07 77 30 738', currentPosition: 'Spécialiste en Genre Chargée de Développement des Membres', departmentName: 'DMS', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2021-01-01', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0073D', lastName: 'COULIBALY BA', firstName: 'Mariame', sex: 'Femme', dateOfBirth: '1977-07-22', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000345678', maritalStatus: 'Marié(e)', numberOfChildren: 2, address: 'Cocody', personalPhone: '07 07 82 78 98', email: 'mcoulibaly@afwasa.org', emergencyContact: 'Ba Cheick', emergencyPhone: '07 07 82 78 98', currentPosition: 'Assistante du Directeur Executif', departmentName: 'Cabinet DEX', workLocation: 'Siège', contractType: 'CDI', hireDate: '2021-01-01', cnpsNumber: '267017589345', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0074J', lastName: 'DIEZAHI', firstName: 'Dominique', sex: 'Homme', dateOfBirth: '1972-12-24', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000456789', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Abobo', personalPhone: '01 43 72 51 43', email: 'ddiezahi@afwasa.org', emergencyContact: 'Zaomon Barthelemy', emergencyPhone: '01 43 72 51 43', currentPosition: 'Chauffeur Coursier', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2021-01-01', cnpsNumber: '158018589456', directionName: 'Direction Administrative et Financière' },
  { matricule: '0075J', lastName: 'MABIO', firstName: 'Olivier Franck De Sales', sex: 'Homme', dateOfBirth: '1996-06-20', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000567890', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Yopougon', personalPhone: '07 07 79 99 31', email: 'omabio@afwasa.org', emergencyContact: "Kouassi N'Doua Augustine", emergencyPhone: '07 07 79 99 31', currentPosition: 'Assistant Comptabilité Générale', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2022-01-01', cnpsNumber: '298019589567', directionName: 'Direction Administrative et Financière' },
  { matricule: '0076J', lastName: 'GUEU', firstName: 'Aman Edwige', sex: 'Femme', dateOfBirth: '1998-07-16', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000678901', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '05 05 75 13 97', email: 'egueu@afwasa.org', emergencyContact: 'Gueu Anatole', emergencyPhone: '05 05 75 13 97', currentPosition: 'Assistante Comptabilité-Trésorerie', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDI', hireDate: '2022-01-01', cnpsNumber: '307020589678', directionName: 'Direction Administrative et Financière' },
  { matricule: '0078M', lastName: 'UMUTANGAMPUNDU', firstName: 'Djalia', sex: 'Femme', dateOfBirth: '1994-03-12', placeOfBirth: 'Burundi', nationality: 'Burundaise', idNumber: 'BI00789012', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 67 34 46 34', email: 'dumutangampundu@afwasa.org', emergencyContact: 'Condo Nadia', emergencyPhone: '07 67 34 46 34', currentPosition: 'Chargé Technique des Programmes', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2022-01-01', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0079M', lastName: 'GOULI', firstName: 'Tanh Judicaël', sex: 'Homme', dateOfBirth: '1991-12-02', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000789012', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '01 40 36 83 33', email: 'jgouli@afwasa.org', emergencyContact: 'Gouli Anatole', emergencyPhone: '01 40 36 83 33', currentPosition: 'Assistant TIC', departmentName: 'DAF', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2022-01-01', cnpsNumber: '316021589789', directionName: 'Direction Administrative et Financière' },
  { matricule: '0081A', lastName: 'SECK', firstName: 'Moussa', sex: 'Homme', dateOfBirth: '1969-11-11', placeOfBirth: 'Sénégal', nationality: 'Sénégalaise', idNumber: 'SN00890123', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Cocody', personalPhone: '', email: 'mseck@afwasa.org', emergencyContact: '', emergencyPhone: '', currentPosition: 'Directeur des Services aux Membres', departmentName: 'DMS', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2019-01-01', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0000Z', lastName: 'KANGA', firstName: 'Kouamé Alexandre', sex: 'Homme', dateOfBirth: '1983-03-20', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000890123', maritalStatus: 'Marié(e)', numberOfChildren: 2, address: 'Cocody', personalPhone: '05 05 70 57 31', email: 'akanga@afwasa.org', emergencyContact: 'ABOI Ahou Marguerite', emergencyPhone: '05 05 70 57 31', currentPosition: 'Responsable Données et Stratégies', departmentName: 'Cabinet DEX', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2020-01-01', cnpsNumber: '', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0088F', lastName: 'LAWSON', firstName: 'Micheline', sex: 'Femme', dateOfBirth: '1986-09-14', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000901234', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 59 31 92 01', email: 'mlawson@afwasa.org', emergencyContact: 'Fatoumata Ndiaye', emergencyPhone: '07 59 31 92 01', currentPosition: 'Responsable Evènementiel & Marketing', departmentName: 'DMS', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2022-06-01', cnpsNumber: '325022589890', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0094M', lastName: 'KANGA', firstName: 'Bénédicte Ahou', sex: 'Femme', dateOfBirth: '1988-12-30', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000012345', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 07 86 56 75', email: 'bkanga@afwasa.org', emergencyContact: 'Kanga Yao', emergencyPhone: '07 07 86 56 75', currentPosition: 'Assistante Directions des Programmes', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDI', hireDate: '2022-06-01', cnpsNumber: '334023589901', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0096A', lastName: 'FADIGA', firstName: 'Aboulaye', sex: 'Homme', dateOfBirth: '1986-07-26', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000123456', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '07 77 64 39 20', email: 'afadiga@afwasa.org', emergencyContact: 'Dr Fadiga Kanvaly', emergencyPhone: '07 77 64 39 20', currentPosition: 'Assistant Achats', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '343024589012', directionName: 'Direction Administrative et Financière' },
  { matricule: '0098S', lastName: 'MUSIIME', firstName: 'Julian', sex: 'Femme', dateOfBirth: '1984-08-30', placeOfBirth: 'Ouganda', nationality: 'Ougandaise', idNumber: 'UG002345678', maritalStatus: 'Célibataire', numberOfChildren: 1, address: 'Cocody', personalPhone: '256 0782945674', email: 'jmusiime@afwasa.org', emergencyContact: 'Deo Kalikumujima', emergencyPhone: '256 0782945674', currentPosition: 'Chargée de Programme Assainissement', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0099O', lastName: 'KOUASSI', firstName: 'Hemez Ange Aurelien', sex: 'Homme', dateOfBirth: '1997-07-20', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000345678', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Yopougon', personalPhone: '07 07 90 58 24', email: 'hkouassi@afwasa.org', emergencyContact: 'Kouakou Kouassi Hemez', emergencyPhone: '07 07 90 58 24', currentPosition: 'Chargé de Programme Eau en Milieu Rural', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '352025589123', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0104F', lastName: "N'DOUA", firstName: 'Kamenan Jean', sex: 'Homme', dateOfBirth: '1987-05-02', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000456789', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '01 01 07 77 71', email: 'jndoua@afwasa.org', emergencyContact: "N'DOUA Christophe", emergencyPhone: '01 01 07 77 71', currentPosition: 'Assistant Communication et Infographie', departmentName: 'Cabinet DEX', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '361026589234', directionName: 'Cabinet de la Direction Exécutive' },
  { matricule: '0106J', lastName: 'ELOUNDOU', firstName: 'Elvis Bertrand', sex: 'Homme', dateOfBirth: '1991-06-06', placeOfBirth: 'Cameroun', nationality: 'Camerounaise', idNumber: 'CM005678901', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '237 699 900 730', email: 'eeloundou@afwasa.org', emergencyContact: 'Eloundou Jacques', emergencyPhone: '237 699 900 730', currentPosition: 'Spécialiste GPC', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0107J', lastName: 'BAWA', firstName: 'Kitchnime Gotau', sex: 'Homme', dateOfBirth: '1975-10-20', placeOfBirth: 'Togo', nationality: 'Togolaise', idNumber: 'TG006789012', maritalStatus: 'Marié(e)', numberOfChildren: 3, address: 'Cocody', personalPhone: '+234 8065613024', email: 'gbawa@afwasa.org', emergencyContact: 'Kitchinme Sitshimwakat', emergencyPhone: '+234 8065613024', currentPosition: 'Coordonnateur Programme PASAOS', departmentName: 'DP', workLocation: 'Annexe', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '', directionName: 'Direction des Services aux Membres et des Programmes' },
  { matricule: '0108J', lastName: 'KOUAKOU', firstName: 'Theodora Hamoin Anna Henriette', sex: 'Femme', dateOfBirth: '1998-06-28', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000789012', maritalStatus: 'Célibataire', numberOfChildren: 0, address: 'Cocody', personalPhone: '0709090141', email: 'tkouakou@afwasa.org', emergencyContact: 'KOUAKOU Georgina', emergencyPhone: '0709090141', currentPosition: 'Assistante Comptable PASAOS', departmentName: 'DAF', workLocation: 'Siège', contractType: 'CDD', hireDate: '2024-01-01', contractEndDate: '2025-12-31', cnpsNumber: '370027589345', directionName: 'Direction Administrative et Financière' },
  { matricule: '0111A', lastName: 'GOSSO', firstName: 'François Olivier', sex: 'Homme', dateOfBirth: '1967-04-02', placeOfBirth: 'Abidjan', nationality: 'IVOIRIENNE', idNumber: 'CI000890123', maritalStatus: 'Marié(e)', numberOfChildren: 4, address: 'Cocody', personalPhone: '', email: 'fgosso@afwasa.org', emergencyContact: '', emergencyPhone: '', currentPosition: 'Directeur Exécutif', departmentName: 'Cabinet DEX', workLocation: 'Siège', contractType: 'CDI', hireDate: '2018-01-01', cnpsNumber: '199028589456', directionName: 'Cabinet de la Direction Exécutive' },
]

// ============ SALARY PROFILES FROM EXCEL ============
// Only 0000Z has real data, others have "À compléter" (all zeros)
const SALARY_PROFILES: Record<string, { baseSalary: number; sursalary: number; igrParts: number; cmuEmployeeCount: number; cmuEmployerCount: number; transportAllowance: number; atRate: number }> = {
  '0000Z': { baseSalary: 176701, sursalary: 769549, igrParts: 2, cmuEmployeeCount: 2, cmuEmployerCount: 2, transportAllowance: 30000, atRate: 0.02 },
}

// ============ DEPARTMENTS ============
const DEPARTMENTS: Record<string, string> = {
  'Cabinet DEX': 'Cabinet de la Direction Exécutive',
  'DMS': 'Direction des Services aux Membres et des Programmes',
  'DAF': 'Direction Administrative et Financière',
  'DP': 'Direction des Services aux Membres et des Programmes',
  'DEX': 'Cabinet de la Direction Exécutive',
}

// ============ MAIN SEED FUNCTION ============

async function main() {
  console.log('🌱 Seeding RH-AFWASA database...')

  // 1. Create Roles
  console.log('  Creating roles...')
  const adminRole = await db.role.upsert({
    where: { name: 'Administrateur' },
    update: {},
    create: { name: 'Administrateur', description: 'Accès complet à toutes les fonctionnalités', permissions: JSON.stringify(['*']) },
  })
  const rhRole = await db.role.upsert({
    where: { name: 'DRH' },
    update: {},
    create: { name: 'DRH', description: 'Gestion RH complète', permissions: JSON.stringify(['employees', 'contracts', 'salary_profiles', 'payroll', 'departures', 'reports']) },
  })
  const managerRole = await db.role.upsert({
    where: { name: 'Manager' },
    update: {},
    create: { name: 'Manager', description: 'Consultation et validation', permissions: JSON.stringify(['employees:read', 'payroll:read', 'reports']) },
  })
  const viewerRole = await db.role.upsert({
    where: { name: 'Consultant' },
    update: {},
    create: { name: 'Consultant', description: 'Lecture seule', permissions: JSON.stringify(['employees:read', 'reports']) },
  })

  // 2. Create Directions
  console.log('  Creating directions...')
  const directionMap: Record<string, string> = {}
  for (const dirName of DIRECTIONS) {
    const dir = await db.direction.upsert({
      where: { name: dirName },
      update: {},
      create: { name: dirName, code: DIRECTION_CODES[dirName] || dirName.substring(0, 3).toUpperCase() },
    })
    directionMap[dirName] = dir.id
  }

  // 3. Create Departments
  console.log('  Creating departments...')
  const deptMap: Record<string, string> = {}
  const seenDepts = new Set<string>()
  for (const [deptName, dirName] of Object.entries(DEPARTMENTS)) {
    const key = `${deptName}-${dirName}`
    if (seenDepts.has(key)) continue
    seenDepts.add(key)
    const dirId = directionMap[dirName]
    if (!dirId) continue
    const dept = await db.department.upsert({
      where: { name_directionId: { name: deptName, directionId: dirId } },
      update: {},
      create: { name: deptName, code: deptName, directionId: dirId },
    })
    deptMap[deptName] = dept.id
  }

  // 4. Create Employees + Contracts + Salary Profiles
  console.log('  Creating employees...')
  let createdCount = 0
  for (const emp of EMPLOYEES) {
    const dirId = directionMap[emp.directionName]
    const deptId = deptMap[emp.departmentName]

    const employee = await db.employee.upsert({
      where: { matricule: emp.matricule },
      update: {
        lastName: emp.lastName,
        firstName: emp.firstName,
        sex: emp.sex,
        dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
        placeOfBirth: emp.placeOfBirth,
        nationality: emp.nationality,
        idNumber: emp.idNumber || null,
        maritalStatus: emp.maritalStatus,
        numberOfChildren: emp.numberOfChildren,
        address: emp.address,
        personalPhone: emp.personalPhone,
        email: emp.email || null,
        emergencyContact: emp.emergencyContact || null,
        emergencyPhone: emp.emergencyPhone || null,
        currentPosition: emp.currentPosition,
        workLocation: emp.workLocation,
        status: 'Actif',
        hireDate: new Date(emp.hireDate),
        cnpsNumber: emp.cnpsNumber || null,
        directionId: dirId,
        departmentId: deptId,
      },
      create: {
        matricule: emp.matricule,
        lastName: emp.lastName,
        firstName: emp.firstName,
        sex: emp.sex,
        dateOfBirth: emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
        placeOfBirth: emp.placeOfBirth,
        nationality: emp.nationality,
        idNumber: emp.idNumber || null,
        maritalStatus: emp.maritalStatus,
        numberOfChildren: emp.numberOfChildren,
        address: emp.address,
        personalPhone: emp.personalPhone,
        email: emp.email || null,
        emergencyContact: emp.emergencyContact || null,
        emergencyPhone: emp.emergencyPhone || null,
        currentPosition: emp.currentPosition,
        workLocation: emp.workLocation,
        status: 'Actif',
        hireDate: new Date(emp.hireDate),
        cnpsNumber: emp.cnpsNumber || null,
        directionId: dirId,
        departmentId: deptId,
      },
    })

    // Contract
    const contractData = {
      employeeId: employee.id,
      type: emp.contractType,
      startDate: new Date(emp.hireDate),
      endDate: emp.contractEndDate ? new Date(emp.contractEndDate) : null,
      status: 'Actif',
    }
    const existingContract = await db.contract.findFirst({
      where: { employeeId: employee.id, type: emp.contractType },
    })
    if (!existingContract) {
      await db.contract.create({ data: contractData })
    }

    // Salary Profile
    const sp = SALARY_PROFILES[emp.matricule]
    const existingSP = await db.salaryProfile.findFirst({
      where: { employeeId: employee.id, status: 'Actif' },
    })
    if (!existingSP) {
      await db.salaryProfile.create({
        data: {
          employeeId: employee.id,
          baseSalary: sp?.baseSalary ?? 0,
          sursalary: sp?.sursalary ?? 0,
          igrParts: sp?.igrParts ?? 1,
          cmuEmployeeCount: sp?.cmuEmployeeCount ?? 1,
          cmuEmployerCount: sp?.cmuEmployerCount ?? 1,
          transportAllowance: sp?.transportAllowance ?? 0,
          atRate: sp?.atRate ?? 0.02,
          effectiveFrom: new Date('2025-01-01'),
          status: sp ? 'Actif' : 'À compléter',
          comment: sp ? 'Cas test anonymisé du bulletin fourni' : 'Profil à compléter',
        },
      })
    }

    createdCount++
  }
  console.log(`  ✅ ${createdCount} employees created/updated`)

  // 5. Create admin user
  console.log('  Creating admin user...')
  const adminEmail = 'admin@afwasa.org'
  const existingAdmin = await db.user.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    const adminEmployee = await db.employee.findFirst({ where: { matricule: '0000Z' } })
    await db.user.create({
      data: {
        email: adminEmail,
        passwordHash: hashPassword('admin123'),
        name: 'Administrateur AFWASA',
        roleId: adminRole.id,
        employeeId: adminEmployee?.id,
        isActive: true,
      },
    })
    console.log('  ✅ Admin user created (admin@afwasa.org / admin123)')
  } else {
    console.log('  ℹ️  Admin user already exists')
  }

  // 6. Seed Payroll Parameters
  console.log('  Seeding payroll parameters...')
  const params = [
    { code: 'CNPS_SALARIE', value: 0.063, unit: '%', description: 'Retraite salarié', source: 'CNPS' },
    { code: 'CNPS_EMPLOYEUR', value: 0.077, unit: '%', description: 'Retraite employeur', source: 'CNPS' },
    { code: 'PLAFOND_CNPS_RETRAITE', value: 3375000, unit: 'FCFA', description: 'Plafond mensuel retraite', source: 'CNPS' },
    { code: 'BASE_PF_AT_MATERNITE', value: 75000, unit: 'FCFA', description: 'Base PF/AT/Maternité', source: 'CNPS' },
    { code: 'PF_RATE', value: 0.05, unit: '%', description: 'Prestations familiales', source: 'CNPS' },
    { code: 'MATERNITY_RATE', value: 0.0075, unit: '%', description: 'Assurance maternité', source: 'CNPS' },
    { code: 'AT_RATE_DEFAULT', value: 0.02, unit: '%', description: 'Accident du travail par défaut', source: 'CNPS' },
    { code: 'TRANSPORT_EXEMPT_LIMIT', value: 30000, unit: 'FCFA', description: 'Indemnité transport non imposable', source: 'Entreprise' },
    { code: 'CMU_PER_PERSON', value: 1000, unit: 'FCFA', description: 'Cotisation CMU totale par personne', source: 'CNPS' },
    { code: 'CMU_EMPLOYEE_SHARE', value: 0.5, unit: '%', description: 'Part salarié de la CMU', source: 'CNPS' },
    { code: 'CMU_EMPLOYER_SHARE', value: 0.5, unit: '%', description: 'Part employeur de la CMU', source: 'CNPS' },
    { code: 'IS_EMPLOYEUR_LOCAL_RATE', value: 0.012, unit: '%', description: 'Contribution employeur local', source: 'Entreprise' },
    { code: 'APPRENTISSAGE_RATE', value: 0.004, unit: '%', description: "Taxe d'apprentissage", source: 'FDFP' },
    { code: 'FPC_MENSUELLE_RATE', value: 0.006, unit: '%', description: 'FPC mensuelle', source: 'FDFP' },
    { code: 'FPC_FIN_ANNEE_RATE', value: 0.006, unit: '%', description: "FPC fin d'année", source: 'FDFP' },
  ]
  for (const p of params) {
    await db.payrollParameter.upsert({
      where: { code: p.code },
      update: {},
      create: { ...p, effectiveFrom: new Date('2025-01-01'), status: 'Actif' },
    })
  }
  console.log(`  ✅ ${params.length} payroll parameters seeded`)

  // 7. Seed ITS brackets
  console.log('  Seeding ITS brackets...')
  const itsBrackets = [
    { lowerBound: 0, upperBound: 75000, rate: 0, label: '0 à 75 000', order: 1 },
    { lowerBound: 75000, upperBound: 240000, rate: 0.16, label: '75 001 à 240 000', order: 2 },
    { lowerBound: 240000, upperBound: 800000, rate: 0.21, label: '240 001 à 800 000', order: 3 },
    { lowerBound: 800000, upperBound: 2400000, rate: 0.24, label: '800 001 à 2 400 000', order: 4 },
    { lowerBound: 2400000, upperBound: 8000000, rate: 0.28, label: '2 400 001 à 8 000 000', order: 5 },
    { lowerBound: 8000000, upperBound: 999999999, rate: 0.32, label: 'Au-delà de 8 000 000', order: 6 },
  ]
  for (const b of itsBrackets) {
    const existing = await db.taxBracketITS.count({ where: { lowerBound: b.lowerBound, effectiveFrom: new Date('2025-01-01') } })
    if (existing === 0) {
      await db.$executeRawUnsafe(
        `INSERT INTO "TaxBracketITS" ("id", "lowerBound", "upperBound", "rate", "label", "order", "effectiveFrom", "createdAt", "updatedAt") VALUES (gen_random_uuid(), ${b.lowerBound}, ${b.upperBound}, ${b.rate}, '${b.label.replace(/'/g, "''")}', ${b.order}, '2025-01-01', NOW(), NOW())`
      )
    }
  }
  console.log(`  ✅ ${itsBrackets.length} ITS brackets seeded`)

  // 8. Seed RICF scale
  console.log('  Seeding RICF scale...')
  const ricfScale = [
    { igrParts: 1, monthlyAmount: 0 },
    { igrParts: 1.5, monthlyAmount: 5500 },
    { igrParts: 2, monthlyAmount: 11000 },
    { igrParts: 2.5, monthlyAmount: 16500 },
    { igrParts: 3, monthlyAmount: 22000 },
    { igrParts: 3.5, monthlyAmount: 27500 },
    { igrParts: 4, monthlyAmount: 33000 },
    { igrParts: 4.5, monthlyAmount: 38500 },
    { igrParts: 5, monthlyAmount: 44000 },
  ]
  for (const r of ricfScale) {
    await db.ricfScale.upsert({
      where: { igrParts: r.igrParts },
      update: { monthlyAmount: r.monthlyAmount },
      create: { ...r, effectiveFrom: new Date('2025-01-01') },
    })
  }
  console.log(`  ✅ ${ricfScale.length} RICF entries seeded`)

  console.log('\n🎉 Seed complete!')
  console.log(`   - 4 roles`)
  console.log(`   - ${DIRECTIONS.length} directions`)
  console.log(`   - ${seenDepts.size} departments`)
  console.log(`   - ${createdCount} employees with contracts & salary profiles`)
  console.log(`   - 15 payroll parameters`)
  console.log(`   - 6 ITS brackets`)
  console.log(`   - 9 RICF entries`)
  console.log(`   - 1 admin user (admin@afwasa.org / admin123)`)
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1) })
  .finally(async () => { await db.$disconnect() })