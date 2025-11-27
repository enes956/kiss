; build/installer.nsh

!macro preInit
  ; Eğer installer /S ile çağrıldıysa (silent) → bu büyük ihtimalle güncelleme/tamir
  ${If} ${Silent}
    SetSilent silent   ; Tüm NSIS UI’yi gizle
  ${Else}
    SetSilent normal   ; İlk kurulum: normal wizard
  ${EndIf}
!macroend
