import { test } from 'node:test';
import assert from 'node:assert/strict';
import { preservaMetadatiProfiloLocaleSuRemoto, rigaPerInvio } from '../src/sincronizzazione.js';
import { calcolaStreak } from '../src/streak.js';

const credito={data:'2026-10-31',giorni:15,origine:'rettifica_richiesta_dal_titolare'};
const ripartenza={scheda_id:'scheda-gym-3',giorno_id:'giorno-1',attivato_il:'2026-11-02T21:00:00Z'};

test('iPhone reinstallato: una privacy locale vuota non cancella accredito e ripartenza cloud',()=>{
  const locale={id:'account-1',privacy:{profilo:false,statistiche:true}};
  const remoto={id:'account-1',privacy:{profilo:true,rettifica_streak:credito,ripartenza_giro:ripartenza}};
  const risultato=preservaMetadatiProfiloLocaleSuRemoto(locale,remoto);
  assert.deepEqual(risultato.privacy.rettifica_streak,credito);
  assert.deepEqual(risultato.privacy.ripartenza_giro,ripartenza);
  assert.equal(risultato.privacy.profilo,false);
});
test('l accredito del 31 ottobre resta leggibile in calendario su nuovo dispositivo',()=>{
  const locale={id:'account-1',privacy:{profilo:false},giorni_allenamento:[2,3,5,6]};
  const remoto={id:'account-1',privacy:{rettifica_streak:credito}};
  const salvato=preservaMetadatiProfiloLocaleSuRemoto(locale,remoto);
  const streak=calcolaStreak([
    {id:'w1',data:'2026-10-28',stato:'completata'},
    {id:'w2',data:'2026-10-30',stato:'completata'}
  ],'2026-11-02',salvato);
  assert.ok(streak.giorniAllenati.includes('2026-10-31'));
  assert.deepEqual(streak.giorniAccreditati,['2026-10-31']);
  assert.ok(streak.giorni>0);
});
test('non importa dati di altri profili o account',()=>{
  const locale={id:'account-2',privacy:{profilo:false}};
  const remoto={id:'account-1',privacy:{rettifica_streak:credito}};
  assert.equal(preservaMetadatiProfiloLocaleSuRemoto(locale,remoto),locale);
});
test('il server senza accredito non cancella quello locale',()=>{
  const locale={id:'account-1',privacy:{rettifica_streak:credito}};
  const remoto={id:'account-1',privacy:{}};
  assert.equal(preservaMetadatiProfiloLocaleSuRemoto(locale,remoto),locale);
});
test('non modifica la struttura originale del profilo durante la fusione',()=>{
  const locale={id:'account-1',privacy:{profilo:false}};
  const remoto={id:'account-1',privacy:{rettifica_streak:credito}};
  const old=JSON.stringify(locale);
  const risultato=preservaMetadatiProfiloLocaleSuRemoto(locale,remoto);
  assert.equal(JSON.stringify(locale),old);
  assert.deepEqual(rigaPerInvio(risultato,'profili').privacy.rettifica_streak,credito);
});
test('preserva anche liste di crediti, senza duplicazioni o riscritture di allenamenti',()=>{
  const locale={id:'account-1',privacy:{profilo:false},nome:'test'};
  const remoto={id:'account-1',privacy:{giorni_streak_accreditati:['2026-10-31']}};
  const salvato=preservaMetadatiProfiloLocaleSuRemoto(locale,remoto);
  assert.deepEqual(salvato.privacy.giorni_streak_accreditati,['2026-10-31']);
  assert.equal(salvato.nome,'test');
});
