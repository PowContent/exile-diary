import React, { useEffect } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Divider from '@mui/material/Divider';
import Select from '@mui/material/Select';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { electronService } from '../../../electron.service';
import { useNavigate } from 'react-router-dom';
import MenuItem from '@mui/material/MenuItem';
import FormHelperText from '@mui/material/FormHelperText';
import { observer } from 'mobx-react-lite';
const { ipcRenderer } = electronService;

// Fix to allow for directory selection in inputs
declare module 'react' {
  interface InputHTMLAttributes<T> extends HTMLAttributes<T> {
    // extends React's HTMLAttributes
    directory?: string;
    webkitdirectory?: string;
  }
}

const MainSettings = ({ settings, store, runStore }) => {
  const navigate = useNavigate();

  // Character
  const [character, setCharacter] = React.useState(
    settings.activeProfile.characterName ? settings.activeProfile.characterName : ''
  );
  const [league, setLeague] = React.useState(
    settings.activeProfile.league ? settings.activeProfile.league : ''
  );
  const handleCharacterChange = (e) => {
    e.preventDefault();
    setCharacter(e.target.value);
  };

  const handleLeagueChange = (e) => {
    e.preventDefault();
    setLeague(e.target.value);
  };

  const leagueOptions = store.characters
    .map((character: any) => character.league)
    .filter(
      (league, index) => store.characters.findIndex((char: any) => char.league === league) === index
    )
    .map((league) => (
      <MenuItem key={league} value={league}>
        {league}
      </MenuItem>
    ));

  const charactersOptions = store.characters
    .filter((character: any) => character.league === league)
    .map((character: any) => (
      <MenuItem key={character.name} value={character.name}>
        {character.name} (Level {character.level}) {character.class}{' '}
        {character.current ? '(Last Active)' : ''}
      </MenuItem>
    ));

  // Client File Location
  const [clientFileLocation, setClientFileLocation] = React.useState(settings.clientTxt);
  const handleOpenClientLocation = async (e) => {
    e.preventDefault();
    
    try {
      const result = await ipcRenderer.invoke('open-file-dialog', {
        title: 'Select Path of Exile Client.txt file',
        filters: [
          { name: 'Text Files', extensions: ['txt'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      if (result && !result.canceled && result.filePaths.length > 0) {
        const filePath = result.filePaths[0];
        console.log('Selected file path:', filePath);
        setClientFileLocation(filePath);
      }
    } catch (error) {
      console.error('Error opening file dialog:', error);
    }
  };

  // Screenshot Folder Location
  const [screenshotLocation, setScreenshotLocation] = React.useState(settings.screenshotDir);
  const handleOpenScreenshotLocation = async (e) => {
    e.preventDefault();
    try {
      const result = await ipcRenderer.invoke('open-file-dialog', {
        title: 'Select Screenshot Folder',
        properties: ['openDirectory']
      });
      if (result && !result.canceled && result.filePaths.length > 0) {
        setScreenshotLocation(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Error opening directory dialog:', error);
    }
  };

  // League Override
  const [leagueOverride, setLeagueOverride] = React.useState(
    settings.activeProfile.leagueOverride ? settings.activeProfile.leagueOverride : ''
  );

  // Auto-screenshot delay
  const [autoScreenshotDelay, setAutoScreenshotDelay] = React.useState(
    settings.autoScreenshotOnMapEntry?.delay || 2
  );

  // Run parse shortcut
  const [runParseShortcut, setRunParseShortcut] = React.useState(
    settings.runParseShortcut || 'CommandOrControl+F10'
  );
  const [isRecordingShortcut, setIsRecordingShortcut] = React.useState(false);

  const formatKeyStroke = (event: KeyboardEvent) => {
    const modifiers: string[] = [];
    if (event.ctrlKey || event.metaKey) modifiers.push('CommandOrControl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');

    let key = event.key;

    // Handle special keys
    const keyMap: { [key: string]: string } = {
      ' ': 'Space',
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
      'Enter': 'Return',
      'Backspace': 'Backspace',
      'Delete': 'Delete',
      'Tab': 'Tab',
      'Insert': 'Insert',
      'Home': 'Home',
      'End': 'End',
      'PageUp': 'PageUp',
      'PageDown': 'PageDown',
    };

    if (keyMap[key]) {
      key = keyMap[key];
    } else if (key.startsWith('F') && /^F[0-9]+$/.test(key)) {
      // F1, F2, etc. - keep as is
    } else if (key.length === 1) {
      key = key.toUpperCase();
    } else if (key === 'Control' || key === 'Alt' || key === 'Shift' || key === 'Meta') {
      return null; // Don't capture modifier keys alone
    }

    // Require at least one modifier for most keys (except function keys and special keys)
    if (modifiers.length === 0 && !key.startsWith('F') && !keyMap[event.key]) {
      return null;
    }

    return modifiers.length > 0 ? `${modifiers.join('+')}+${key}` : key;
  };

  const handleShortcutKeyDown = (event: React.KeyboardEvent) => {
    if (!isRecordingShortcut) return;

    event.preventDefault();
    event.stopPropagation();

    // Handle Escape key to cancel recording
    if (event.key === 'Escape') {
      setIsRecordingShortcut(false);
      return;
    }

    const formatted = formatKeyStroke(event.nativeEvent);
    if (formatted) {
      setRunParseShortcut(formatted);
      setIsRecordingShortcut(false);
    }
  };

  const handleShortcutFocus = () => {
    setIsRecordingShortcut(true);
  };

  const handleShortcutBlur = () => {
    setIsRecordingShortcut(false);
  };

  const handleRedirectToLogin = () => {
    navigate('/login');
  };
  const handleLogout = () => {
    ipcRenderer.invoke('oauth:logout');
  };

  const username = settings.username ? settings.username : '';
  // const league = settings.activeProfile.league ? settings.activeProfile.league : 'Unknown';
  const alternateSplinterPricing = !!settings.alternateSplinterPricing;
  const overlayEnabled = !!settings.overlayEnabled;
  const enableIncubatorAlert = !!settings.enableIncubatorAlert;
  const enableScreenshotCustomShortcut =
    settings.screenshots && !!settings.screenshots.allowCustomShortcut;
  const enableScreenshotFolderWatch =
    settings.screenshots && !!settings.screenshots.allowFolderWatch;
  const overlayPersistenceEnabled = !!settings.overlayPersistenceEnabled;
  const runParseScreenshotEnabled = !!settings.runParseScreenshotEnabled;
  const forceDebugMode = !!settings.forceDebugMode;

  const handleBack = () => {
    navigate('/');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const selectedChar = store.characters.find((char: any) => char.name === character);
    const data = {
      activeProfile: {
        characterName: character,
        league: selectedChar ? selectedChar.league : league,
        leagueOverride: leagueOverride,
        valid: true,
      },
      clientTxt: e.target.log_location.value,
      screenshotDir: e.target.screenshot_location.value,
      alternateSplinterPricing: e.target.alternate_splinter_pricing.checked,
      overlayEnabled: e.target.overlay_enabled.checked,
      enableIncubatorAlert: e.target.enable_incubator_alert.checked,
      runParseScreenshotEnabled: e.target.enable_run_parse_screenshot.checked,
      forceDebugMode: e.target.force_debug_mode.checked,
      screenshots: {
        allowCustomShortcut: e.target.enable_screenshot_custom_shortcut.checked,
        allowFolderWatch: e.target.enable_screenshot_folder_watch.checked,
        screenshotDir: e.target.screenshot_location.value,
      },
      autoScreenshotOnMapEntry: {
        enabled: e.target.enable_auto_screenshot_on_map_entry.checked,
        delay: autoScreenshotDelay,
      },
<<<<<<< Updated upstream
=======
      runParseShortcut: runParseShortcut,
>>>>>>> Stashed changes
    };

    // Save settings
    await ipcRenderer.invoke('save-settings', { settings: data });

    // Update the shortcut immediately
    await ipcRenderer.invoke('update-run-shortcut', runParseShortcut);
  };

  const handleRefreshCharacters = () => {
    store.fetchCharacters();
  };

  useEffect(() => {
    store.fetchCharacters();
  }, [store]);

  return (
    <form onSubmit={handleSubmit} role="tabpanel">
      <Box sx={{ p: 3 }}>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Account Name"
            id="account"
            variant="standard"
            disabled
            size="small"
            value={username}
          />
        </div>
        <ButtonGroup
          variant="outlined"
          fullWidth
          color="primary"
          aria-label="contained primary button group"
        >
          <Button onClick={handleLogout}>Logout</Button>
          <Button onClick={handleRedirectToLogin}>Refresh Login</Button>
        </ButtonGroup>
        <Divider className="Settings__Separator" />
        <div className="Settings__Row">
          {store.isLoading ? (
            <div className="Text--Normal">Loading Characters...</div>
          ) : (
            <>
              <div className="Text--Normal">Currently Active Character: </div>
              <div className="Text--Rare">
                {character ? character : 'Unknown Character'} ({league} League)
              </div>
            </>
          )}
        </div>
        <div className="Settings__Row Settings__Character-Select">
          <Select
            label="League"
            id="league"
            variant="filled"
            size="small"
            disabled={leagueOptions.length === 0}
            value={store.isLoading ? null : league}
            onChange={handleLeagueChange}
          >
            {leagueOptions}
          </Select>
          <Select
            label="Character"
            id="character"
            variant="filled"
            size="small"
            disabled={charactersOptions.length === 0}
            value={store.isLoading ? null : character}
            onChange={handleCharacterChange}
          >
            {charactersOptions}
          </Select>
          {charactersOptions.length === 0 ? (
            <FormHelperText>Disabled - No character retrieved</FormHelperText>
          ) : (
            ''
          )}
          <Button component="label" disabled={store.isLoading} onClick={handleRefreshCharacters}>
            Refresh List
          </Button>
        </div>
        <Divider className="Settings__Separator" />
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Path of Exile Client.TXT Location (usually in PoE's log folder)"
            id="log_location"
            variant="filled"
            size="small"
            value={clientFileLocation}
            onChange={(e) => setClientFileLocation(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ marginTop: '7px', marginBottom: '10px', padding: '2px 15px' }}
            onClick={handleOpenClientLocation}
          >
            Find Path of Exile Log folder
          </Button>
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Screenshot Directory"
            id="screenshot_location"
            variant="filled"
            size="small"
            value={screenshotLocation}
            onChange={(e) => setScreenshotLocation(e.target.value)}
          />
          <Button
            component="label"
            variant="contained"
            sx={{ marginTop: '7px', marginBottom: '10px', padding: '2px 15px' }}
            onClick={handleOpenScreenshotLocation}
          >
            Find PoE Screenshot Folder
          </Button>
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="PoE.ninja league name to change league used for pricing, leave blank for character's league. (e.g. Standard, Settlers)"
            id="league_override"
            variant="filled"
            size="small"
            value={leagueOverride}
            onChange={(e) => setLeagueOverride(e.target.value)}
          />
        </div>
        <Divider className="Settings__Separator" />
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox id="alternate_splinter_pricing" defaultChecked={alternateSplinterPricing} />
            }
            label="Enable Alternate Splinter Pricing"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox id="overlay_enabled" defaultChecked={overlayEnabled} />}
            label="Enable Overlay Popup Messages"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="overlay_persistence_disabled"
                disabled
                defaultChecked={!overlayPersistenceEnabled}
              />
            }
            label="Enable Overlay Persistence (Toggle this setting by pressing CTRL+F7)"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox id="enable_incubator_alert" defaultChecked={enableIncubatorAlert} />}
            label="Enable Incubator Running Out Alert"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="enable_screenshot_custom_shortcut"
                defaultChecked={enableScreenshotCustomShortcut}
              />
            }
            label="Enable Custom Screenshot Shortcut (CTRL+F8)"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="enable_screenshot_folder_watch"
                defaultChecked={enableScreenshotFolderWatch}
              />
            }
            label="Enable Screenshot Folder Monitoring"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="enable_run_parse_screenshot"
                defaultChecked={runParseScreenshotEnabled}
              />
            }
            label="Enable shortcut to finish a run"
          />
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label={isRecordingShortcut ? "Press your desired key combination..." : "Run Parse Shortcut"}
            name="run_parse_shortcut"
            variant="filled"
            size="small"
            value={isRecordingShortcut ? "Recording..." : runParseShortcut}
            onChange={(e) => !isRecordingShortcut && setRunParseShortcut(e.target.value)}
            onKeyDown={handleShortcutKeyDown}
            onFocus={handleShortcutFocus}
            onBlur={handleShortcutBlur}
            helperText={
              isRecordingShortcut
                ? "Press any key combination (e.g., Ctrl+F10, Alt+R). Press Escape to cancel."
                : "Click to record a key combination, or type manually (e.g., CommandOrControl+F10)"
            }
            InputProps={{
              style: {
                backgroundColor: isRecordingShortcut ? '#ffebee' : undefined,
                color: isRecordingShortcut ? '#d32f2f' : undefined
              }
            }}
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="enable_auto_screenshot_on_map_entry"
                defaultChecked={!!settings.autoScreenshotOnMapEntry?.enabled}
              />
            }
            label="Enable auto-screenshot when entering maps"
          />
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Auto-screenshot delay (seconds) - time to wait after entering map"
            id="auto_screenshot_delay"
            variant="filled"
            size="small"
            type="number"
            inputProps={{ min: 0, max: 30, step: 0.5 }}
            value={autoScreenshotDelay}
            onChange={(e) => setAutoScreenshotDelay(parseFloat(e.target.value) || 0)}
            helperText="Delay in seconds to account for loading times (0-30 seconds)"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={
              <Checkbox
                id="enable_auto_screenshot_on_map_entry"
                defaultChecked={!!settings.autoScreenshotOnMapEntry?.enabled}
              />
            }
            label="Enable auto-screenshot when entering maps"
          />
        </div>
        <div className="Settings__Row">
          <TextField
            fullWidth
            label="Auto-screenshot delay (seconds) - time to wait after entering map"
            id="auto_screenshot_delay"
            variant="filled"
            size="small"
            type="number"
            inputProps={{ min: 0, max: 30, step: 0.5 }}
            value={autoScreenshotDelay}
            onChange={(e) => setAutoScreenshotDelay(parseFloat(e.target.value) || 0)}
            helperText="Delay in seconds to account for loading times (0-30 seconds)"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox id="force_debug_mode" defaultChecked={forceDebugMode} />}
            label="Force Debug Mode"
          />
        </div>
        {/* TODO: Add these settings if needed */}
        {/* <Divider className="Settings__Separator" />
        <div>This section is not plugged in yet</div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel control={<Checkbox disabled />} label="Minimize to Tray" />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox disabled />}
            label="Get Item Prices even in SSF Mode"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel
            control={<Checkbox disabled />}
            label="Get Low-Confidence Pricing Data from poe.ninja"
          />
        </div>
        <div className="Settings__Checkbox__Row">
          <FormControlLabel control={<Checkbox disabled />} label="Disable Gear Tracking" />
        </div> */}
        <Divider className="Settings__Separator" />
        <ButtonGroup variant="outlined" fullWidth aria-label="Settings Control Buttons">
          <Button type="submit">Save</Button>
          <Button onClick={handleBack}>Cancel</Button>
        </ButtonGroup>
      </Box>
    </form>
  );
};

export default observer(MainSettings);
